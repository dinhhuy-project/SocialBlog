import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { TagInput } from '@/components/tag-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Calendar, Save, Send, ArrowLeft } from 'lucide-react';
import type { Category, PostWithAuthor } from '@shared/schema';

export default function EditPostPage() {
  const [, params] = useRoute('/edit/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const postId = params?.id ? parseInt(params.id) : 0;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [scheduledPublishDate, setScheduledPublishDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');

  const { data: post, isLoading: postLoading } = useQuery<PostWithAuthor>({
    queryKey: [`/api/posts/${postId}`],
    enabled: !!postId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Populate form when post data loads
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setTags(post.tags || []);
      setCategoryId(post.categoryId?.toString() || '');
      setStatus(post.status as 'draft' | 'published' | 'scheduled');
      
      if (post.scheduledPublishDate) {
        setScheduledPublishDate(new Date(post.scheduledPublishDate).toISOString().slice(0, 16));
      }
    }
  }, [post]);

  const updatePostMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', `/api/posts/${postId}`, data);
    },
    onSuccess: (data) => {
      toast({
        title: 'Post updated!',
        description: status === 'published' ? 'Your post has been updated.' : 'Your post has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
      setLocation(`/post/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update post',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (submitStatus: 'draft' | 'published' | 'scheduled') => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your post.',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please write some content for your post.',
        variant: 'destructive',
      });
      return;
    }

    if (submitStatus === 'scheduled' && !scheduledPublishDate) {
      toast({
        title: 'Schedule date required',
        description: 'Please select a date and time to publish your post.',
        variant: 'destructive',
      });
      return;
    }

    const postData: any = {
      title,
      content,
      tags,
      status: submitStatus,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
    };

    if (submitStatus === 'scheduled' && scheduledPublishDate) {
      postData.scheduledPublishDate = new Date(scheduledPublishDate).toISOString();
    }

    updatePostMutation.mutate(postData);
  };

  if (postLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-card rounded-lg w-32" />
          <div className="h-16 bg-card rounded-lg" />
          <div className="h-96 bg-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button asChild>
          <a href="/my-posts">Go Back</a>
        </Button>
      </div>
    );
  }


  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          asChild 
          className="mb-4"
        >
          <a href="/my-posts" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to My Posts
          </a>
        </Button>
        <h1 className="text-4xl font-bold mb-2">Edit Post</h1>
        <p className="text-muted-foreground">Update your blog post</p>
      </div>

      {/* title contest post */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter a captivating title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold"
            data-testid="input-title"
          />
        </div>
      
        {/* list category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledDate">Schedule Publish (Optional)</Label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={scheduledPublishDate}
              onChange={(e) => setScheduledPublishDate(e.target.value)}
              data-testid="input-schedule-date"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput tags={tags} onChange={setTags} placeholder="Add tags (press Enter or comma)" />
          <p className="text-xs text-muted-foreground">
            Add up to 5 tags to help readers find your post
          </p>
        </div>

        {/* load richtexthtml form schcema db */}
        <div className="space-y-2">
          <Label>Content</Label>
          {content && (
            <div className="mb-2 text-sm text-muted-foreground">
              Current content loaded
            </div>
          )}
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Tell your story..."
          />
        </div>

        {/* footer button*/}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSubmit('draft')}
                disabled={updatePostMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>

              {scheduledPublishDate && (
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit('scheduled')}
                  disabled={updatePostMutation.isPending}
                  data-testid="button-schedule"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              )}
            </div>

            <Button
              onClick={() => handleSubmit('published')}
              disabled={updatePostMutation.isPending}
              data-testid="button-publish"
            >
              <Send className="h-4 w-4 mr-2" />
              {updatePostMutation.isPending ? 'Updating...' : 'Update & Publish'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}