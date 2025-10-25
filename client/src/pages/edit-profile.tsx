import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from '@/components/user-avatar';
import { Upload, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { SelectUser } from '@shared/schema';

interface FormData {
  fullName: string;
  address: string;
  gender: string;
  avatarUrl: string;
}

export default function EditProfilePage() {
  const [, params] = useRoute('/profile/:id/edit');
  const userId = params?.id as string | undefined;
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug logs
  console.log('Route params:', params);
  console.log('Edit Profile - userId:', userId);
  console.log('Edit Profile - currentUser:', currentUser);
  console.log('Fetch URL:', `/api/users/${userId}`);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    address: '',
    gender: '',
    avatarUrl: '',
  });

  const [previewAvatar, setPreviewAvatar] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      console.log('Fetch profile response:', res.status, res.statusText);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json() as Promise<SelectUser>;
    },
    enabled: !!userId,
  });

  // Update form when profile loads (only once)
  useEffect(() => {
    if (profile && !isInitialized) {
      setFormData({
        fullName: profile.fullName || '',
        address: profile.address || '',
        gender: profile.gender ? String(profile.gender) : '0', // Convert to string, default to "0"
        avatarUrl: profile.avatarUrl || '',
      });
      if (profile.avatarUrl) {
        setPreviewAvatar(profile.avatarUrl);
      }
      setIsInitialized(true);
    }
  }, [profile?.id]); // Only depend on profile.id to avoid re-initialization

  // Check authorization
  if (!profileLoading && profile && currentUser && currentUser.id !== profile.id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You can only edit your own profile</p>
        <Button onClick={() => setLocation('/')}>Go Home</Button>
      </div>
    );
  }

  // Get auth token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Update profile mutation
  const updateMutation = useMutation<unknown, Error, FormData>({
    mutationFn: async (data: FormData) => {
      let avatarUrl = formData.avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('avatar', avatarFile); // Change from 'file' to 'avatar'

        const uploadRes = await fetch(`/api/users/${userId}/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || 'Failed to upload avatar');
        }

        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.avatarUrl;
      }

      // Update user profile
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: data.fullName,
          address: data.address,
          gender: data.gender && data.gender !== "0" ? data.gender : null, // Send as string or null
          avatarUrl,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      return res.json();
    },
  });

  // Handle mutation success/error
  useEffect(() => {
    if (updateMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setLocation(`/profile/${userId}`);
    }
  }, [updateMutation.isSuccess, userId, queryClient, toast, setLocation]);

  useEffect(() => {
    if (updateMutation.isError) {
      toast({
        title: 'Error',
        description: updateMutation.error?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  }, [updateMutation.isError, updateMutation.error, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value === "0" ? "" : value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast({
        title: 'Error',
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate(formData);
  };

  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-96 bg-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
        <Button onClick={() => setLocation('/')}>Go Home</Button>
      </div>
    );
  }

  const typedProfile = profile as SelectUser;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/profile/${userId}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Profile Picture</h3>
              <div className="flex items-end gap-6">
                <UserAvatar
                  src={previewAvatar}
                  alt={typedProfile.username}
                  fallback={typedProfile.username}
                  className="h-32 w-32 border-4 border-border"
                />

                <div className="flex-1">
                  <label
                    htmlFor="avatar-input"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    data-testid="label-avatar-upload"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload Photo</span>
                  </label>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    data-testid="input-avatar"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF (Max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <hr />

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  data-testid="input-full-name"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-2">
                  Address
                </label>
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Enter your address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  data-testid="input-address"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium mb-2">
                  Gender
                </label>
                <Select value={formData.gender || "0"} onValueChange={handleGenderChange}>
                  <SelectTrigger id="gender" data-testid="select-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Prefer not to say</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Username:</strong> {typedProfile.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {typedProfile.email}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/profile/${userId}`)}
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}