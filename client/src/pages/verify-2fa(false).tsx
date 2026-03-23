import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@assets/generated_images/Blog_social_network_logo_96d96600.png';

export default function Verify2FAPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Processing...');

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  useEffect(() => {
    if (!token || !action) {
      toast({
        title: 'Invalid Link',
        description: 'The verification link is invalid.',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    handleVerification();
  }, [token, action]);

  const handleVerification = async () => {
    setIsLoading(true);

    try {
      const actionText = action === 'approve' ? '✅ Approving' : '❌ Rejecting';
      setMessage(`${actionText} your login...`);

      const res = await fetch('/api/auth/verify-2fa-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (action === 'approve') {
        toast({
          title: 'Success! ✅',
          description: 'Your login has been approved. Redirecting...',
          variant: 'success',
        });
        
        setTimeout(() => setLocation('/'), 2000);
      } else {
        toast({
          title: 'Login Rejected ❌',
          description: 'Your login has been rejected.',
          variant: 'destructive',
        });
        
        setTimeout(() => setLocation('/login'), 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired link',
        variant: 'destructive',
      });

      setLocation('/login');
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
            <CardTitle className="text-3xl font-bold">
              {action === 'approve' ? '✅ Confirming' : '❌ Rejecting'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {message}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex justify-center py-8">
          <div className="animate-spin">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>

        <CardFooter>
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