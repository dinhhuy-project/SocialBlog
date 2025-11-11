import { Home, PenSquare, Bell, User, BookOpen, Settings, Shield, LayoutDashboard, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import logoImage from '@assets/generated_images/Blog_social_network_logo_96d96600.png';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const mainItems = [
    { title: 'Home', url: '/', icon: Home, testId: 'link-home' },
    { title: 'Create Post', url: '/create', icon: PenSquare, testId: 'link-create-post' },
    { title: 'My Posts', url: '/my-posts', icon: BookOpen, testId: 'link-my-posts' },
    { title: 'Notifications', url: '/notifications', icon: Bell, testId: 'link-notifications' },
    { title: 'Profile', url: `/profile/${user?.id}`, icon: User, testId: 'link-profile' },
  ];

  const adminItems = user?.roleId === 1 ? [
    { title: 'Admin Panel', url: '/admin', icon: Shield, testId: 'link-admin' },
  ] : [];

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="SocialBlog" className="h-10 w-10 rounded-lg" />
          <div>
            <h2 className="text-xl font-bold">SocialBlog</h2>
            <p className="text-xs text-muted-foreground">Share Your Stories</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={item.testId}>
                    <a href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={location === item.url} data-testid={item.testId}>
                      <a href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="space-y-3">
          {user && (
            <>
              <div className="text-xs text-muted-foreground text-center">
                <p>Logged in as <span className="font-medium text-foreground">{user.username}</span></p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
