import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/user-avatar';
import { PostCard } from '@/components/post-card';
import { Edit, Calendar, MapPin, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import type { SelectUser, PostWithAuthor } from '@shared/schema';

export default function ProfilePage() {
  const [, params] = useRoute('/profile/:id');
  const userId = params?.id;
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<SelectUser>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const { data: userPosts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/posts/', { userId }],
    enabled: !!userId,
  });

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-card rounded-xl" />
          <div className="h-96 bg-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <Button asChild>
          <a href="/">Go Home</a>
        </Button>
      </div>
    );
  }

  const publishedPosts = userPosts.filter(p => p.status === 'published');
  const draftPosts = userPosts.filter(p => p.status === 'draft');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex gap-6">
              <UserAvatar
                src={profile.avatarUrl}
                alt={profile.username}
                fallback={profile.username}
                className="h-24 w-24 border-4 border-background"
              />
              <div>
                <h1 className="text-3xl font-bold mb-1" data-testid="text-profile-name">
                  {profile.fullName || profile.username}
                </h1>
                <p className="text-muted-foreground mb-3" data-testid="text-profile-username">
                  @{profile.username}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(profile.createdAt), 'MMM yyyy')}
                  </span>
                  {profile.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <Button variant="outline" data-testid="button-edit-profile">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold" data-testid="text-post-count">{publishedPosts.length}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1" data-testid="tab-posts">
            Published ({publishedPosts.length})
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="drafts" className="flex-1" data-testid="tab-drafts">
              Drafts ({draftPosts.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="liked" className="flex-1" data-testid="tab-liked">
            Liked
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          {publishedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No published posts yet</p>
              {isOwnProfile && (
                <Button asChild data-testid="button-create-first-post">
                  <a href="/create">Create Your First Post</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {publishedPosts.map((post) => (
                <PostCard key={post.id} post={post} compact />
              ))}
            </div>
          )}
        </TabsContent>

        {isOwnProfile && (
          <TabsContent value="drafts" className="mt-6">
            {draftPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No drafts
              </div>
            ) : (
              <div className="space-y-6">
                {draftPosts.map((post) => (
                  <PostCard key={post.id} post={post} compact />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="liked" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Liked posts coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
