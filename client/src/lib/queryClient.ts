import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    // const refreshToken = localStorage.getItem('refreshToken');
    // if (!refreshToken) return null;

    // const res = await fetch('/api/auth/refresh', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ refreshToken }),
    // });
    
    //  KHÔNG CẦN LẤY TOKEN TỪ LOCALSTORAGE
    // COOKIE TỰ ĐỘNG GỬI CÙNG REQUEST
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include', // ✅ GỬI COOKIE
    });

    if (!res.ok) {
      throw new Error('Failed to refresh token');
    }

    // const data = await res.json();
    // if (data.accessToken) {
    //   localStorage.setItem('accessToken', data.accessToken);
    //   return data.accessToken;
    // }
    // return null;

     // Server sẽ set cookie mới
     return 'refreshed';
  } catch (error) {
    // localStorage.removeItem('accessToken');
    // localStorage.removeItem('refreshToken');
    console.error('Token refresh failed:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retried: boolean = false
): Promise<any> {
  // const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // if (token) {
  //   headers['Authorization'] = `Bearer ${token}`;
  // }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",// GỬI COOKIES
  });

  if (res.status === 401 && !retried) {
    // Try to refresh the token
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      // Retry the original request with new token
      return apiRequest(method, url, data, true);
    }
  }

  await throwIfResNotOk(res);
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // If there's a second element and it's an object, build query parameters
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams();
      const filters = queryKey[1] as Record<string, any>;
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      
      const queryString = params.toString();
      if (queryString) {
        url += '?' + queryString;
      }
    }
    
    // Add Authorization header if token exists
    // const token = localStorage.getItem('accessToken');
    // const headers: Record<string, string> = {};
    // if (token) {
    //   headers['Authorization'] = `Bearer ${token}`;
    // }

   // KHÔNG SET Authorization header - COOKIE TỰ GỬI
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
