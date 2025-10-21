import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = 'Add tags...' }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = input.trim().replace(/^#+/, '');
      if (tag && !tags.includes(tag)) {
        onChange([...tags, tag]);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 border border-input rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1" data-testid={`badge-tag-${tag}`}>
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:bg-accent rounded-full p-0.5"
            data-testid={`button-remove-tag-${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[120px] h-auto p-0"
        data-testid="input-tag"
      />
    </div>
  );
}
