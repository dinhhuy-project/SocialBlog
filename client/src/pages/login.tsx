import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTurnstile } from '@/hooks/use-turnstile';
import logoImage from '@assets/generated_images/Blog_social_network_logo_96d96600.png';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '3x00000000000000000000FF';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  
  const { containerRef, reset: resetCaptcha } = useTurnstile({
    siteKey: TURNSTILE_SITE_KEY,
    onVerify: (token) => setCaptchaToken(token),
    theme: 'light',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check CAPTCHA token
    if (!captchaToken) {
      toast({
        title: 'CAPTCHA Required',
        description: 'Please complete the CAPTCHA verification.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password, captchaToken);
      // if (result?.requiresVerification) {
      //   toast({
      //     title: 'Verify Login',
      //     description: 'Please check your phone for the verification code',
      //     variant: "default",
      //   });
      //   setLocation('/login');
      if (result?.requiresVerification) {
        toast({
          title: 'Đã gửi email xác minh!',
          description: 'Vui lòng kiểm tra hộp thư (và mục Spam) để nhấn YES hoặc NO.',
          variant: 'default',
          duration: 8000, // hiện lâu hơn
        });
        // KHÔNG redirect! Người dùng tự mở email
        return; // dừng lại, không vào trang chủ
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
          variant: "success",
        });
        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
      resetCaptcha();
      setCaptchaToken('');
    } finally {
      setIsLoading(false);
    }
  };

  // quên mk
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    // 1. Kiểm tra rỗng
    if (!trimmedEmail) {
      toast({
        title: 'Thiếu email',
        description: 'Vui lòng nhập email vào ô trên trước khi bấm Quên mật khẩu',
        variant: 'destructive',
      });
      return;
    }

    // 2. Kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: 'Email không hợp lệ',
        description: 'Vui lòng kiểm tra lại định dạng email',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      // Dù tài khoản có tồn tại hay không, backend đều trả message giống nhau → bảo mật
      toast({
        title: 'Đã gửi!',
        description: data.message || 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi',
        variant: 'default',
        duration: 10000,
      });
    } catch (err) {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không thể gửi yêu cầu. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-chart-2/10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={logoImage} alt="SocialBlog" className="h-16 w-16 rounded-xl" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base mt-2">
              Sign in to continue to SocialBlog
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>

            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center py-2">
                <div ref={containerRef} />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <a href="/register" className="text-primary hover:underline font-medium mr-4" data-testid="link-register">
                Sign up
              </a>
              {/* NÚT QUÊN MẬT KHẨU – CHỈ LÀ BUTTON, KHÔNG PHẢI LINK */}
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="ptext-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
