import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import defaultAvatarImage from '@assets/generated_images/Default_user_avatar_placeholder_039a1b21.png';

interface UserAvatarProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  className?: string;
}

export function UserAvatar({ src, alt, fallback, className }: UserAvatarProps) {
  const initials = fallback || alt.substring(0, 2).toUpperCase();

  return (
    <Avatar className={className}>
      <AvatarImage src={src || defaultAvatarImage} alt={alt} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
