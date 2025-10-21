import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Bookmark, Share2, Eye } from 'lucide-react';
import { UserAvatar } from './user-avatar';
import { formatDistanceToNow } from 'date-fns';
import type { PostWithAuthor } from '@shared/schema';
import placeholderImage from '@assets/generated_images/Blog_post_placeholder_image_20180580.png';

interface PostCardProps {
  post: PostWithAuthor;
  onLike?: () => void;
  onBookmark?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  compact?: boolean;
}

export function PostCard({ post, onLike, onBookmark, isLiked, isBookmarked, compact = false }: PostCardProps) {
  const excerpt = post.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
  const featuredImage = post.images && post.images.length > 0 ? post.images[0] : placeholderImage;
  const likeCount = post._count?.interactions || 0;
  const commentCount = post._count?.comments || 0;

  if (compact) {
    return (
      <a href={`/post/${post.id}`} data-testid={`link-post-${post.id}`}>
        <Card className="hover-elevate transition-all duration-200 border-border">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar 
                    src={post.author.avatarUrl} 
                    alt={post.author.username} 
                    fallback={post.author.username}
                    className="h-6 w-6"
                  />
                  <span className="text-sm font-medium truncate" data-testid={`text-author-${post.id}`}>
                    {post.author.fullName || post.author.username}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground" data-testid={`text-time-${post.id}`}>
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1 line-clamp-2" data-testid={`text-title-${post.id}`}>
                  {post.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {post.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {commentCount}
                  </span>
                </div>
              </div>
              {featuredImage && (
                <img 
                  src={featuredImage} 
                  alt={post.title}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </a>
    );
  }

  return (
    <Card className="hover-elevate transition-all duration-200 overflow-hidden border-border" data-testid={`card-post-${post.id}`}>
      <a href={`/post/${post.id}`}>
        {featuredImage && (
          <div className="aspect-video w-full overflow-hidden">
            <img 
              src={featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </a>
      
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <UserAvatar 
            src={post.author.avatarUrl} 
            alt={post.author.username} 
            fallback={post.author.username}
            className="h-10 w-10"
          />
          <div className="flex-1 min-w-0">
            <a href={`/profile/${post.author.id}`} className="font-medium hover:underline truncate block" data-testid={`link-author-${post.id}`}>
              {post.author.fullName || post.author.username}
            </a>
            <p className="text-sm text-muted-foreground" data-testid={`text-date-${post.id}`}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
          {post.category && (
            <Badge variant="secondary" data-testid={`badge-category-${post.id}`}>
              {post.category.name}
            </Badge>
          )}
        </div>

        <a href={`/post/${post.id}`} className="block group">
          <h2 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2" data-testid={`text-post-title-${post.id}`}>
            {post.title}
          </h2>
        </a>
      </CardHeader>

      <CardContent>
        <p className="text-muted-foreground line-clamp-3 leading-relaxed" data-testid={`text-excerpt-${post.id}`}>
          {excerpt}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full" data-testid={`badge-tag-${tag}`}>
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onLike?.();
            }}
            className={isLiked ? 'text-red-500' : ''}
            data-testid={`button-like-${post.id}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="ml-1">{likeCount}</span>
          </Button>
          
          <Button variant="ghost" size="sm" asChild data-testid={`button-comment-${post.id}`}>
            <a href={`/post/${post.id}#comments`}>
              <MessageCircle className="h-4 w-4" />
              <span className="ml-1">{commentCount}</span>
            </a>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onBookmark?.();
            }}
            className={isBookmarked ? 'text-primary' : ''}
            data-testid={`button-bookmark-${post.id}`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          
          <Button variant="ghost" size="sm" data-testid={`button-share-${post.id}`}>
            <Share2 className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
            <Eye className="h-4 w-4" />
            <span data-testid={`text-views-${post.id}`}>{post.views}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
