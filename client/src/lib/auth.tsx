import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SelectUser } from '@shared/schema';

interface AuthContextType {
  user: SelectUser | null;
  isLoading: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<any>;
  register: (data: any, captchaToken?: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SelectUser | null>(null);
  const queryClient = useQueryClient();

  // const { data: currentUser, isLoading } = useQuery<SelectUser | null>({
  //   queryKey: ['/api/auth/me'],
  //   queryFn: async () => {
  //     try {
  //       const res = await fetch('/api/auth/me', {
  //         credentials: 'include', //GỬI COOKIE
  //       });
  //       if (!res.ok) return null;
  //       return res.json();
  //     } catch {
  //       return null;
  //     }
  //   },
  //   retry: false,
  //   staleTime: 5 * 60 * 1000,
  // });
  const { data: currentUser, isLoading, refetch } = useQuery<SelectUser | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
  
      if (res.status === 401) {
        // TỰ ĐỘNG REFRESH
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
  
        if (refreshRes.ok) {
          // Thử lại /me
          const retryRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (retryRes.ok) return retryRes.json();
        }
        return null;
      }
  
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // TỰ ĐỘNG CHECK KHI MỞ LẠI TAB
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      setUser(null);
    }
  }, [currentUser]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; captchaToken?: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include', //GỬI & NHẬN COOKIE
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // KHÔNG LƯU LOCALSTORAGE
      if (!data.requiresVerification) {
        setUser(data.user);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Register failed');
      }
  
      return result as RegisterResponse;
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  // const logoutMutation = useMutation({
  //   mutationFn: async () => {
  //     await fetch('/api/auth/logout', {
  //       method: 'POST',
  //       credentials: 'include',
  //     });
  //   },
  //   onSuccess: () => {
  //     //BROWSER TỰ XÓA COOKIE
  //     setUser(null);
  //     queryClient.clear();
  //   },
  // });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    },
    onSuccess: () => {
      queryClient.clear(); // XÓA TẤT CẢ CACHE
      setUser(null);
    },
  });

  const login = async (email: string, password: string, captchaToken?: string) => {
    return await loginMutation.mutateAsync({ email, password, captchaToken });
  };

  const register = async (data: any, captchaToken?: string): Promise<RegisterResponse> => {
    const registerData = captchaToken ? { ...data, captchaToken } : data;
    return await registerMutation.mutateAsync(registerData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refreshAuth = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
//thêm
export type RegisterResponse = {
  user: SelectUser;
  // accessToken: string;
  // refreshToken: string;
};