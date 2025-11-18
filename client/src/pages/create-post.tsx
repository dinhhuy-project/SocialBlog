import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RichTextEditor } from '@/components/rich-text-editor';
import { TagInput } from '@/components/tag-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { validatePostContent, detectClientXSSTreats } from '@/lib/content-validator';
import { Calendar, Save, Send, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);

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
        description: error.message || 'An error occurred while creating the post',
        variant: 'destructive',
      });
    },
  });

  // Real-time validation while typing
  const handleTitleChange = (value: string) => {
    setTitle(value);
    const errors: Record<string, string> = {};

    if (value.length > 500) {
      errors.title = `Title exceeds maximum length (${value.length}/500)`;
    }

    const xssResult = detectClientXSSTreats(value);
    if (!xssResult.isClean) {
      errors.title = `⚠️ Detected potentially dangerous content: ${xssResult.threats.join(', ')}`;
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    const errors: Record<string, string> = {};

    if (value.length > 50000) {
      errors.content = `Content exceeds maximum length (${value.length}/50000)`;
    }

    const xssResult = detectClientXSSTreats(value);
    if (!xssResult.isClean) {
      setSecurityWarnings(xssResult.threats);
      errors.content = `⚠️ Detected potentially dangerous content: ${xssResult.threats.join(', ')}`;
    } else {
      setSecurityWarnings([]);
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    const errors: Record<string, string> = {};

    if (newTags.length > 20) {
      errors.tags = `Maximum 20 tags allowed (current: ${newTags.length})`;
    }

    const invalidTags = newTags.filter(tag => {
      if (tag.trim().length === 0) return true;
      if (tag.length > 50) return true;
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(tag)) return true;
      return false;
    });

    if (invalidTags.length > 0) {
      errors.tags = `Invalid tags detected. Tags can only contain letters, numbers, spaces, hyphens, and underscores.`;
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
  };

  const handleSubmit = (submitStatus: 'draft' | 'published' | 'scheduled') => {
    // Client-side validation
    const validation = validatePostContent({
      title,
      content,
      tags,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      const errorMessages = Object.values(validation.errors);
      toast({
        title: 'Validation Error',
        description: errorMessages[0] || 'Please fix the errors before submitting',
        variant: 'destructive',
      });
      return;
    }

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
      postData.scheduledPublishDate = new Date(scheduledPublishDate);
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
        {/* Security Warnings */}
        {securityWarnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">⚠️ Security Warning</div>
              <p>Your content contains potentially dangerous elements:</p>
              <ul className="list-disc list-inside mt-2 ml-2">
                {securityWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm">These elements will be removed when published.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {Object.keys(validationErrors).length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Validation Errors</div>
              {Object.entries(validationErrors).map(([key, error]) => (
                <div key={key} className="text-sm">{error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Title Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Title</Label>
            <span className={`text-sm ${title.length > 500 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {title.length}/500
            </span>
          </div>
          <Input
            id="title"
            placeholder="Enter a captivating title..."
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={`text-2xl font-bold ${validationErrors.title ? 'border-red-500' : ''}`}
            data-testid="input-title"
          />
          {validationErrors.title && (
            <p className="text-sm text-red-500">{validationErrors.title}</p>
          )}
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

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput 
            tags={tags} 
            onChange={handleTagsChange} 
            placeholder="Add tags (press Enter or comma)" 
          />
          {validationErrors.tags ? (
            <p className="text-sm text-red-500">{validationErrors.tags}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add up to 20 tags to help readers find your post
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Content</Label>
            <span className={`text-sm ${content.length > 50000 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {content.length}/50000
            </span>
          </div>
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Tell your story..."
          />
          {validationErrors.content && (
            <p className="text-sm text-red-500">{validationErrors.content}</p>
          )}
        </div>

        {/* Action Buttons */}
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
              disabled={createPostMutation.isPending || Object.keys(validationErrors).length > 0}
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
