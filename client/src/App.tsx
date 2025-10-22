import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/generated_images/Blog_social_network_logo_96d96600.png";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import HomePage from "@/pages/home";
import CreatePostPage from "@/pages/create-post";
import PostDetailPage from "@/pages/post-detail";
import ProfilePage from "@/pages/profile";
import MyPostsPage from "@/pages/my-posts";
import NotificationsPage from "@/pages/notifications";
import AdminPage from "@/pages/admin";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function AuthRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={() => <AuthRoute component={LoginPage} />} />
      <Route path="/register" component={() => <AuthRoute component={RegisterPage} />} />
      
      {user ? (
        <>
          <Route path="/" component={HomePage} />
          <Route path="/post/:id" component={PostDetailPage} />
          <Route path="/profile/:id" component={ProfilePage} />
          <Route path="/create" component={() => <ProtectedRoute component={CreatePostPage} />} />
          <Route path="/my-posts" component={() => <ProtectedRoute component={MyPostsPage} />} />
          <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
          <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} />} />
        </>
      ) : (
        <>
          <Route path="/" component={HomePage} />
          <Route path="/post/:id" component={PostDetailPage} />
          <Route path="/profile/:id" component={ProfilePage} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!user) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="BlogHub" className="h-8 w-8 rounded-lg" />
            <div>
              <h2 className="text-lg font-bold">BlogHub</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild data-testid="button-login">
              <a href="/login">Login</a>
            </Button>
            <Button asChild data-testid="button-register">
              <a href="/register">Register</a>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Router />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
