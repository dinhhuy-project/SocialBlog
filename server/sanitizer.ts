import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Sanitize HTML content để loại bỏ script độc hại và XSS attacks
 * @param dirty - HTML content từ người dùng
 * @returns Clean HTML content an toàn
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div',
      'span', 'mark', 'del', 'ins', 'sub', 'sup'
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height', 'loading'],
      '*': ['class', 'style']
    },
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    IN_PLACE: false,
  };

  return DOMPurify.sanitize(dirty, config);
}

/**
 * Kiểm tra nội dung có chứa các mối đe dọa XSS
 * @param content - Nội dung cần kiểm tra
 * @returns Object với {isClean, threats} - danh sách các mối đe dọa tìm thấy
 */
export function detectXSSTreats(content: string): { isClean: boolean; threats: string[] } {
  const threats: string[] = [];

  if (!content || typeof content !== 'string') {
    return { isClean: true, threats: [] };
  }

  // Pattern kiểm tra script tags
  if (/<script[^>]*>[\s\S]*?<\/script>/gi.test(content)) {
    threats.push('Script tags detected');
  }

  // Pattern kiểm tra event handlers
  const eventHandlerPatterns = [
    /on\w+\s*=\s*["'][^"']*["']/gi, // onclick="...", onload="...", etc
    /on\w+\s*=\s*[^\s>]*/gi,         // onload=alert(), etc (unquoted)
  ];

  for (const pattern of eventHandlerPatterns) {
    if (pattern.test(content)) {
      threats.push('Event handlers detected');
      break;
    }
  }

  // Pattern kiểm tra javascript: protocol
  if (/javascript:\s*/gi.test(content)) {
    threats.push('JavaScript protocol detected');
  }

  // Pattern kiểm tra data: protocol cho các input nguy hiểm
  if (/data:text\/html/gi.test(content)) {
    threats.push('Data URL with HTML detected');
  }

  // Pattern kiểm tra iframe độc hại
  if (/<iframe[^>]*>/gi.test(content)) {
    threats.push('iFrame tags detected');
  }

  // Pattern kiểm tra object/embed tags
  if (/<(object|embed)[^>]*>/gi.test(content)) {
    threats.push('Embed/Object tags detected');
  }

  // Pattern kiểm tra form submission
  if (/<form[^>]*>/gi.test(content)) {
    threats.push('Form tags detected');
  }

  // Pattern kiểm tra SVG với script
  if (/<svg[^>]*>[\s\S]*?<\/svg>/gi.test(content)) {
    if (/<script[^>]*>[\s\S]*?<\/script>/gi.test(content)) {
      threats.push('SVG with script detected');
    }
  }

  return {
    isClean: threats.length === 0,
    threats,
  };
}

/**
 * Sanitize text input (không HTML)
 * Loại bỏ các ký tự đặc biệt và kiểm soát độ dài
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Trim và giới hạn độ dài
  let sanitized = text.trim().substring(0, maxLength);

  // Loại bỏ null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Validate tags - kiểm tra array tags an toàn
 */
export function validateTags(tags: unknown): string[] {
  const tagsSchema = z.array(
    z.string()
      .trim()
      .min(1, 'Tag cannot be empty')
      .max(50, 'Tag too long')
      .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tag contains invalid characters')
  ).max(20, 'Maximum 20 tags allowed');

  try {
    const validated = tagsSchema.parse(tags);
    return validated.map(tag => tag.toLowerCase());
  } catch (error) {
    throw new Error('Invalid tags provided');
  }
}

/**
 * Validate URL (cho images, links)
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Chỉ cho phép http, https, và data URLs (để an toàn)
    return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate image URLs
 */
export function validateImageUrl(url: string): boolean {
  if (!validateUrl(url)) return false;

  // Kiểm tra extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const urlLower = url.toLowerCase();

  // Nếu là data URL, cho phép các MIME type hình ảnh
  if (url.startsWith('data:')) {
    return /^data:image\/(jpeg|png|gif|webp);base64,/.test(url);
  }

  return allowedExtensions.some(ext => urlLower.includes(ext));
}

/**
 * Create safe post content object
 */
export function sanitizePostContent(data: {
  title: string;
  content: string;
  tags?: string[];
  images?: string[];
}): {
  title: string;
  content: string;
  tags: string[];
  images: string[];
} {
  return {
    title: sanitizeText(data.title, 500),
    content: sanitizeHtml(data.content),
    tags: Array.isArray(data.tags) ? validateTags(data.tags) : [],
    images: Array.isArray(data.images)
      ? data.images.filter(img => validateImageUrl(img))
      : [],
  };
}

export default {
  sanitizeHtml,
  detectXSSTreats,
  sanitizeText,
  validateTags,
  validateUrl,
  validateImageUrl,
  sanitizePostContent,
};
