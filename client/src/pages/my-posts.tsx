import { useQuery } from '@tanstack/react-query';
import { PostCard } from '@/components/post-card'; // interface postlist and post detail
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { PostWithAuthor } from '@shared/schema';

export default function MyPostsPage() {
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/posts', { userId: user?.id }],
    enabled: !!user,
  });

  const draftPosts = posts.filter(p => p.status === 'draft');
  const publishedPosts = posts.filter(p => p.status === 'published');
  const scheduledPosts = posts.filter(p => p.status === 'scheduled');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-card rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Posts</h1>
          <p className="text-muted-foreground">Manage your blog posts</p>
        </div>
        <Button asChild data-testid="button-create-post">
          <a href="/create">
            <PenSquare className="h-4 w-4 mr-2" />
            New Post
          </a>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="published">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="published" data-testid="tab-published">
            Published ({publishedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            Drafts ({draftPosts.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            Scheduled ({scheduledPosts.length})
          </TabsTrigger>
        </TabsList>

        {/* Published Posts */}
        <TabsContent value="published" className="mt-6">
          {publishedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No published posts yet</p>
              <Button asChild>
                <a href="/create">Create Your First Post</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {publishedPosts.map((post) => (
                <PostCard key={post.id} post={post} compact />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Drafts Posts */}
        <TabsContent value="drafts" className="mt-6">
          {draftPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No drafts
            </div>
          ) : (
            <div className="space-y-4">
              {draftPosts.map((post) => (
                <PostCard key={post.id} post={post} compact />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Scheduled Posts */} 
        <TabsContent value="scheduled" className="mt-6">
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No scheduled posts
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledPosts.map((post) => (
                <PostCard key={post.id} post={post} compact />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
