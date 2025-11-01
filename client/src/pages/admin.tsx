import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Lock, Unlock, Trash2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Users, FileText, FolderOpen, TrendingUp, Search } from 'lucide-react';
import { useState } from 'react';
import type { SelectUser, Category, PostWithAuthor, Role } from '@shared/schema';

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Thêm state cho tìm kiếm/filter, dialog khóa/role. Query roles để hiển thị trong select
  const [searchEmail, setSearchEmail] = useState('');
  const [showLockedOnly, setShowLockedOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectUser | null>(null);
  const [lockUntil, setLockUntil] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [newRoleId, setNewRoleId] = useState<number | null>(null);

  if (user?.roleId !== 1) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
        <Button asChild>
          <a href="/">Go Home</a>
        </Button>
      </div>
    );
  }

  const { data: users = [] } = useQuery<SelectUser[]>({
    queryKey: ['/api/users', { q: searchEmail, locked: showLockedOnly }],
  });

  const { data: posts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/posts', { status: 'all' }],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setNewCategoryName('');
      setNewCategoryDesc('');
      toast({ title: 'Category created!' });
    },
  });

  const lockUserMutation = useMutation({
    mutationFn: async (data: { id: number; lockedUntil: string; lockReason: string }) => {
      return await apiRequest('POST', `/api/users/${data.id}/lock`, { lockedUntil: data.lockedUntil, lockReason: data.lockReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User locked!' });
      setSelectedUser(null);
      setLockUntil('');
      setLockReason('');
    },
  });

  const unlockUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/users/${id}/unlock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User unlocked!' });
    },
  });

  const deleteUserMutation = useMutation({
    // mutationFn: async (id: number) => {
    //   return await apiRequest('DELETE', `/api/users/${id}`);
    // },
    // onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    //   toast({ title: 'User deleted!' });
    // },
      mutationFn: async (id: number) => {
        return await apiRequest('DELETE', `/api/users/${id}`);  // Sửa: Path đúng /api/users/${id}
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        toast({ title: 'User deleted!' });
      },
      onError: (error: any) => {
        toast({ title: 'Delete failed', description: error?.details || 'Unknown error' });  // Thêm: Toast error chi tiết từ response
      },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { id: number; roleId: number }) => {
      return await apiRequest('PUT', `/api/users/${data.id}/role`, { roleId: data.roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Role updated!' });
      setNewRoleId(null);
      setSelectedUser(null);
    },
  });

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({
      name: newCategoryName,
      description: newCategoryDesc || undefined,
    });
  };

  const handleLockUser = () => {
    if (!selectedUser || !lockUntil || !lockReason) return;
    lockUserMutation.mutate({
      id: selectedUser.id,
      lockedUntil: lockUntil, // ✅ đổi key, giữ value cũ
      lockReason,
    });
  };

  // thếm xử lý filter email, lock user, delete user, update role
  const handleUnlockUser = (id: number) => {
    unlockUserMutation.mutate(id);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm('Are you sure you want to delete this user? This is permanent!')) {  // Thêm warning
      deleteUserMutation.mutate(id);
    }
  };

  const handleUpdateRole = () => {
    if (!selectedUser || !newRoleId) return;
    updateRoleMutation.mutate({ id: selectedUser.id, roleId: newRoleId });
  };

  const getRoleName = (roleId: number) => {
    return roles.find(r => r.id === roleId)?.name || 'Unknown';
  };

  const isLocked = (user: SelectUser) => {
    return user.lockedUntil && new Date() < new Date(user.lockedUntil);
  };

  const stats = {
    totalUsers: users.length,
    totalPosts: posts.length,
    publishedPosts: posts.filter(p => p.status === 'published').length,
    draftPosts: posts.filter(p => p.status === 'draft').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your blog platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-posts">{stats.totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-published-posts">{stats.publishedPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-categories">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    data-testid="input-search-email"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showLockedOnly}
                    onCheckedChange={setShowLockedOnly}
                    data-testid="switch-show-locked"
                  />
                  <Label>Show locked only</Label>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* input search email, filter by email, lock user, delete user, update role */}
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={user.avatarUrl}
                            alt={user.username}
                            fallback={user.username}
                            className="h-8 w-8"
                          />
                          <div>
                            <p className="font-medium">{user.fullName || user.username}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      {/* update role */}
                      <TableCell>
                        <Badge variant={user.roleId === 1 ? 'default' : 'secondary'}>
                          {getRoleName(user.roleId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isLocked(user) ? (
                          <Badge variant="destructive">Locked until {new Date(user.lockedUntil!).toLocaleString()}</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                      {/*  filter email, lock user, delete user, update role */}
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => { setSelectedUser(user); setNewRoleId(user.roleId); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Change Role</DialogTitle>
                                <DialogDescription>Update role for {user.username}</DialogDescription>
                              </DialogHeader>
                              <Select value={newRoleId?.toString()} onValueChange={(v) => setNewRoleId(parseInt(v))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map(role => (
                                    <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button onClick={handleUpdateRole}>Save</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          {isLocked(user) ? (
                            <Button variant="outline" size="icon" onClick={() => handleUnlockUser(user.id)}>
                              <Unlock className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setSelectedUser(user)}>
                                  <Lock className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              {/* PANEL LOCK USER */}
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Lock User</DialogTitle>
                                  <DialogDescription>Lock {user.username}'s account</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Lock Until</Label>
                                    <Input
                                      type="datetime-local"
                                      value={lockUntil}
                                      onChange={(e) => setLockUntil(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label>Reason</Label>
                                    <Input
                                      value={lockReason}
                                      onChange={(e) => setLockReason(e.target.value)}
                                      placeholder="Enter lock reason"
                                    />
                                  </div>
                                </div>
                                {/* khóa user */}
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button variant="destructive" onClick={handleLockUser}>Lock</Button>
                                  </DialogClose>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Management</CardTitle>
              <CardDescription>View all posts across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.slice(0, 10).map((post) => (
                    <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                      <TableCell>
                        <a href={`/post/${post.id}`} className="font-medium hover:underline line-clamp-1">
                          {post.title}
                        </a>
                      </TableCell>
                      <TableCell>{post.author.username}</TableCell>
                      <TableCell>
                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.views}</TableCell>
                      <TableCell>{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Category</CardTitle>
                <CardDescription>Add a new category for organizing posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Technology"
                      data-testid="input-category-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryDesc">Description (Optional)</Label>
                    <Input
                      id="categoryDesc"
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      placeholder="Brief description"
                      data-testid="input-category-description"
                    />
                  </div>
                  <Button onClick={handleCreateCategory} data-testid="button-create-category">
                    Create Category
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Categories</CardTitle>
                <CardDescription>Manage platform categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`category-${category.id}`}
                    >
                      <div>
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
