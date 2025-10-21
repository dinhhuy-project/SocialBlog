import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { TagInput } from '@/components/tag-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, Save, Send } from 'lucide-react';
import type { Category } from '@shared/schema';

export default function CreatePostPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [scheduledPublishDate, setScheduledPublishDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/posts', data);
    },
    onSuccess: (data) => {
      toast({
        title: 'Post created!',
        description: status === 'published' ? 'Your post is now live.' : 'Your post has been saved as a draft.',
      });
      setLocation(`/post/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create post',
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

    createPostMutation.mutate(postData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Create New Post</h1>
        <p className="text-muted-foreground">Share your story with the world</p>
      </div>

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

        <div className="space-y-2">
          <Label>Content</Label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Tell your story..."
          />
        </div>

        <Card className="p-4 bg-muted/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSubmit('draft')}
                disabled={createPostMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>

              {scheduledPublishDate && (
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit('scheduled')}
                  disabled={createPostMutation.isPending}
                  data-testid="button-schedule"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              )}
            </div>

            <Button
              onClick={() => handleSubmit('published')}
              disabled={createPostMutation.isPending}
              data-testid="button-publish"
            >
              <Send className="h-4 w-4 mr-2" />
              {createPostMutation.isPending ? 'Publishing...' : 'Publish Now'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
