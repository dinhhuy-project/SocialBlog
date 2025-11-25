// src/pages/ResetPassword.tsx
import { useState } from "react";
import { useLocation } from "wouter"; // chỉ cần 1 cái này
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // wouter v2: trả về [location, setLocation]
  const [location, setLocation] = useLocation();

  // LẤY TOKEN BẰNG CÁCH DUY NHẤT HOẠT ĐỘNG KHI BẤM LINK TỪ EMAIL
  const token = new URLSearchParams(window.location.search).get("token");

  console.log("Full URL:", window.location.href);
  console.log("Token:", token);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Link không hợp lệ</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            Token bị thiếu hoặc đã hết hạn.
          </CardContent>
        </Card>
      </div>
    );
 ;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu phải ít nhất 6 ký tự", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      toast({
        title: res.ok ? "Thành công!" : "Lỗi",
        description: data.message || data.error,
        variant: res.ok ? "default" : "destructive",
      });

      if (res.ok) {
        setTimeout(() => setLocation("/login"), 2000); // dùng setLocation thay vì navigate
      }
    } catch {
      toast({ title: "Lỗi mạng", description: "Không thể kết nối server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Đặt mật khẩu mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Link chỉ có hiệu lực trong 15 phút
        </CardFooter>
      </Card>
    </div>
  );
}