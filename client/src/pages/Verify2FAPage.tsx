// src/pages/Verify2FAPage.tsx
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';


export default function Verify2FAPage() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // SỬA 1: Dùng window.location.search
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const action = params.get('action');

    if (!token || !['approve', 'reject'].includes(action!)) {
      toast({ title: 'Lỗi', description: 'Link không hợp lệ', variant: 'destructive' });
      setLocation('/login');
      return;
    }

    fetch('/api/auth/verify-2fa-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(async (data) => {
        // Sau khi approved
        if (data.approved) {
          toast({ title: 'Thành công!', description: 'Đăng nhập được xác nhận', variant: 'success' });
          // TỰ ĐỘNG REFRESH USER
          await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
          setLocation('/');
        } else {
          toast({ title: 'Từ chối', description: data.message || 'Đăng nhập bị từ chối', variant: 'destructive' });
          setLocation('/login');
        }
      })
      .catch(() => {
        toast({ title: 'Lỗi', description: 'Xác minh thất bại', variant: 'destructive' });
        setLocation('/login');
      });
  }, [toast, setLocation]); // SỬA 2: Thêm toast, setLocation

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg">Đang xác minh đăng nhập...</p>
      </div>
    </div>
  );
}