import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PostCard } from '@/components/post-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import type { PostWithAuthor, Category } from '@shared/schema';

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('published');

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/posts', { q: searchQuery, category: selectedCategory, tag: selectedTag, status: statusFilter }],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const interactMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: string }) => {
      return await apiRequest('POST', `/api/posts/${postId}/interact`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
  });

  const handleInteract = (postId: number, type: string) => {
    if (!user) return;
    interactMutation.mutate({ postId, type });
  };

  const userInteractions = posts.reduce((acc, post) => {
    // This would ideally come from the backend
    acc[post.id] = { liked: false, bookmarked: false };
    return acc;
  }, {} as Record<number, { liked: boolean; bookmarked: boolean }>);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Discover Stories</h1>
        <p className="text-muted-foreground">Explore amazing content from our community</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" data-testid="button-filters">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <Tabs defaultValue="latest" className="mb-6">
        <TabsList>
          <TabsTrigger value="latest" data-testid="tab-latest">Latest</TabsTrigger>
          <TabsTrigger value="trending" data-testid="tab-trending">Trending</TabsTrigger>
          <TabsTrigger value="following" data-testid="tab-following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="mt-6">
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-card animate-pulse rounded-xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No posts found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create a post!'}
              </p>
              {!searchQuery && (
                <Button asChild className="mt-4" data-testid="button-create-first-post">
                  <a href="/create">Create Your First Post</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleInteract(post.id, 'like')}
                  onBookmark={() => handleInteract(post.id, 'bookmark')}
                  isLiked={userInteractions[post.id]?.liked}
                  isBookmarked={userInteractions[post.id]?.bookmarked}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="mt-6">
        {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-card animate-pulse rounded-xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No post trending</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create a post!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts
                .slice()
                .sort((a, b) => b.views - a.views)
                .map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => handleInteract(post.id, 'like')}
                    onBookmark={() => handleInteract(post.id, 'bookmark')}
                    isLiked={userInteractions[post.id]?.liked}
                    isBookmarked={userInteractions[post.id]?.bookmarked}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {user ? 'Following feed coming soon!' : 'Sign in to see posts from people you follow'}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
