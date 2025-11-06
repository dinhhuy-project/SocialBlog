import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { Heart, MessageCircle, Bookmark, Share2, Eye, Calendar, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format, set } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { PostWithAuthor, CommentWithAuthor } from '@shared/schema';
import { c, s } from 'node_modules/vite/dist/node/types.d-aGj9QkWt';

export default function PostDetailPage() {
  const [, params] = useRoute('/post/:id');
  
  const postId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentContent, setCommentContent] = useState('');
  const [replyToId, setReplyToId] = useState<number | null>(null);

  const { data: post, isLoading } = useQuery<PostWithAuthor>({
    queryKey: [`/api/posts/${postId}`],
    enabled: !!postId,
  });

  const { data: userInteractions } = useQuery<{ like: boolean; bookmark: boolean }>({
    queryKey: [`/api/posts/${postId}/user-interactions`],
    enabled: !!postId && !!user,
  });
  
  const [isLiked, setIsLiked] = useState(userInteractions?.like || false);
  const [isBookmarked, setIsBookmarked] = useState(userInteractions?.bookmark || false);

  useEffect(() => {
    setIsLiked(userInteractions?.like || false);
    setIsBookmarked(userInteractions?.bookmark || false);
  }, [userInteractions]);

  const { data: comments = [] } = useQuery<CommentWithAuthor[]>({
    queryKey: [`/api/posts/${postId}/comments`],
    enabled: !!postId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/posts/${postId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      setCommentContent('');
      setReplyToId(null);
      toast({ title: 'Comment added!' });
    },
  });

  const interactMutation = useMutation({
    mutationFn: async ({ type }: { type: string }) => {
      if (!user) {
        toast({
          title: "Yêu cầu đăng nhập",
          description: "Hãy đăng nhập để sử dụng tính năng này",
          variant: "warning",
        });
        throw new Error("Authentication required");
      }
      return await apiRequest('POST', `/api/posts/${postId}/interact`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', postId] });
    },
  });

  const handleAddComment = () => {
    if (!commentContent.trim()) return;
    addCommentMutation.mutate({
      content: commentContent,
      postId: parseInt(postId!),
      parentId: replyToId,
    });
  };

  const renderComment = (comment: CommentWithAuthor, depth = 0) => (
    <div key={comment.id} className={depth > 0 ? 'ml-12 mt-4' : 'mt-6'} data-testid={`comment-${comment.id}`}>
      <Card className={depth > 0 ? 'border-l-2 border-l-primary' : ''}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <UserAvatar
              src={comment.author.avatarUrl}
              alt={comment.author.username}
              fallback={comment.author.username}
              className="h-8 w-8"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium" data-testid={`text-comment-author-${comment.id}`}>
                  {comment.author.fullName || comment.author.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm leading-relaxed" data-testid={`text-comment-content-${comment.id}`}>
                {comment.content}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-0 text-xs"
                onClick={() => setReplyToId(comment.id)}
                data-testid={`button-reply-${comment.id}`}
              >
                Reply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {comment.replies?.map((reply) => renderComment(reply, depth + 1))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-card rounded-xl" />
          <div className="h-12 bg-card rounded-lg" />
          <div className="h-96 bg-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button asChild>
          <a href="/">Go Home</a>
        </Button>
      </div>
    );
  }

  const featuredImage = post.images && post.images.length > 0 ? post.images[0] : null;
  const canEdit = user && (user.id === post.userId || user.roleId === 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <article>
        {featuredImage && (
          <div className="aspect-video w-full overflow-hidden rounded-xl mb-8">
            <img
              src={featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="mb-6">
          {post.category && (
            <Badge variant="secondary" className="mb-4" data-testid="badge-post-category">
              {post.category.name}
            </Badge>
          )}

          <h1 className="text-4xl md:text-5xl font-bold font-serif leading-tight mb-4" data-testid="text-post-title">
            {post.title}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={post.author.avatarUrl}
                alt={post.author.username}
                fallback={post.author.username}
                className="h-12 w-12"
              />
              <div>
                <a href={`/profile/${post.author.id}`} className="font-medium hover:underline" data-testid="link-post-author">
                  {post.author.fullName || post.author.username}
                </a>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span data-testid="text-post-date">
                    {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.views} views
                  </span>
                </div>
              </div>
            </div>

            {/* button edit post */}
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild data-testid="button-edit-post">
                  <a href={`/edit/${post.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-8 font-serif leading-loose"
          dangerouslySetInnerHTML={{ __html: post.content }}
          data-testid="text-post-content"
        />

        <Card className="sticky top-20 z-10 bg-background/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Yêu cầu đăng nhập",
                      description: "Hãy đăng nhập để sử dụng tính năng này",
                      variant: "warning",
                    });
                    return;
                  }
                  setIsLiked(!isLiked);
                  
                  interactMutation.mutate({ type: 'like' });
                }}
                className={isLiked ? 'text-red-500' : ''}
                data-testid="button-like-post"
                >
                <Heart className={`h-5 w-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </Button>
              <Button variant="ghost" asChild data-testid="button-comment-post">
                <a href="#comments">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Comment
                </a>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Yêu cầu đăng nhập", 
                      description: "Hãy đăng nhập để sử dụng tính năng này",
                      variant: "warning",
                    });
                    return;
                  }
                  setIsBookmarked(!isBookmarked);
                  interactMutation.mutate({ type: 'bookmark' });
                }}
                className={isBookmarked ? 'text-primary' : ''}
                data-testid="button-bookmark-post"
              >
                <Bookmark className={`h-5 w-5 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
              <Button
                variant="ghost" 
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Yêu cầu đăng nhập",
                      description: "Hãy đăng nhập để sử dụng tính năng này", 
                      variant: "warning",
                    });
                    return;
                  }
                }}
                data-testid="button-share-post"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      </article>

      <section id="comments" className="mt-12">
        <h2 className="text-2xl font-bold mb-6">
          Comments ({comments.length})
        </h2>

        {user ? (
          <Card className="mb-8">
            <CardContent className="p-4">
              {replyToId && (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Replying to comment</p>
                  <Button variant="ghost" size="sm" onClick={() => setReplyToId(null)}>
                    Cancel
                  </Button>
                </div>
              )}
              <div className="flex gap-3">
                <UserAvatar
                  src={user.avatarUrl}
                  alt={user.username}
                  fallback={user.username}
                  className="h-10 w-10"
                />
                <div className="flex-1">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="mb-3"
                    data-testid="textarea-comment"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || addCommentMutation.isPending}
                    data-testid="button-submit-comment"
                  >
                    {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Sign in to leave a comment</p>
              <Button asChild>
                <a href="/login">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {comments.filter(c => !c.parentId).map((comment) => renderComment(comment))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}
      </section>
    </div>
  );
}
