import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@assets/generated_images/Blog_social_network_logo_96d96600.png';

export default function Verify2FAPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 phút

  const searchParams = new URLSearchParams(location.search);
  const userId = searchParams.get('userId');

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      toast({
        title: 'Code Expired',
        description: 'Please try logging in again',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, setLocation, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'Invalid verification session',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    if (code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          verificationCode: code,
          rememberDevice,
        }),
        credentials: 'include', // ✅ GỬI & NHẬN COOKIE
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Verification failed');
      }

      toast({
        title: 'Success!',
        description: 'You have been successfully verified',
        variant: 'success',
      });

      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
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
            <CardTitle className="text-3xl font-bold">Verify Login</CardTitle>
            <CardDescription className="text-base mt-2">
              Enter the 6-digit code from your phone notification
            </CardDescription>
            <div className="mt-3 text-sm font-semibold text-orange-500">
              Code expires in: {formatTime(timeLeft)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={isLoading}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              {code.length}/6 digits
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              💡 You should receive a push notification on your trusted device
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                disabled={isLoading}
                className="rounded"
              />
              <span className="text-sm text-blue-800 dark:text-blue-300">
                Remember this device for 30 days
              </span>
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={isLoading || code.length !== 6}
            size="lg"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation('/login')}
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}