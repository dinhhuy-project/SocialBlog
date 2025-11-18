/**
 * Client-side XSS detection utility
 * Giúp cảnh báo người dùng ngay khi nhập nội dung nguy hiểm
 */

export interface XSSDetectionResult {
  isClean: boolean;
  threats: string[];
  message: string;
}

/**
 * Kiểm tra nội dung có chứa các mối đe dọa XSS trên client-side
 */
export function detectClientXSSTreats(
  content: string
): XSSDetectionResult {
  const threats: string[] = [];

  if (!content || typeof content !== "string") {
    return { isClean: true, threats: [], message: "" };
  }

  // Pattern kiểm tra script tags
  if (/<script[^>]*>[\s\S]*?<\/script>/gi.test(content)) {
    threats.push("Script tags");
  }

  // Pattern kiểm tra event handlers
  const eventHandlerPatterns = [
    { pattern: /on\w+\s*=\s*["'][^"']*["']/gi, name: "Event handlers (quoted)" },
    { pattern: /on\w+\s*=\s*[^\s>]*/gi, name: "Event handlers (unquoted)" },
  ];

  for (const { pattern, name } of eventHandlerPatterns) {
    if (pattern.test(content)) {
      threats.push(name);
      break;
    }
  }

  // Pattern kiểm tra javascript: protocol
  if (/javascript:\s*/gi.test(content)) {
    threats.push("JavaScript protocol");
  }

  // Pattern kiểm tra data: protocol cho các input nguy hiểm
  if (/data:text\/html/gi.test(content)) {
    threats.push("Dangerous data URLs");
  }

  // Pattern kiểm tra iframe độc hại
  if (/<iframe[^>]*>/gi.test(content)) {
    threats.push("iFrame tags");
  }

  // Pattern kiểm tra object/embed tags
  if (/<(object|embed)[^>]*>/gi.test(content)) {
    threats.push("Embed/Object tags");
  }

  // Pattern kiểm tra form submission
  if (/<form[^>]*>/gi.test(content)) {
    threats.push("Form tags");
  }

  const isClean = threats.length === 0;
  const message = isClean
    ? "Content looks safe ✓"
    : `⚠️ Detected: ${threats.join(", ")}`;

  return { isClean, threats, message };
}

/**
 * Validate text input độ dài và ký tự
 */
export function validateTextLength(
  text: string,
  maxLength: number,
  minLength: number = 0,
  fieldName: string = "Text"
): { isValid: boolean; message: string } {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      message: `${fieldName} cannot be empty`,
    };
  }

  if (text.length < minLength) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${minLength} characters (current: ${text.length})`,
    };
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName} exceeds maximum length of ${maxLength} characters (current: ${text.length})`,
    };
  }

  return { isValid: true, message: "" };
}

/**
 * Validate tags
 */
export function validateClientTags(
  tags: string[]
): { isValid: boolean; message: string } {
  if (tags.length > 20) {
    return {
      isValid: false,
      message: `Maximum 20 tags allowed (current: ${tags.length})`,
    };
  }

  const invalidTags = tags.filter((tag) => {
    if (tag.trim().length === 0) return true;
    if (tag.length > 50) return true;
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(tag)) return true;
    return false;
  });

  if (invalidTags.length > 0) {
    return {
      isValid: false,
      message: `Invalid tags: ${invalidTags.join(", ")}. Tags can only contain letters, numbers, spaces, hyphens, and underscores.`,
    };
  }

  return { isValid: true, message: "" };
}

/**
 * Validate image URLs
 */
export function validateClientImageUrl(url: string): {
  isValid: boolean;
  message: string;
} {
  if (!url) {
    return { isValid: false, message: "Image URL cannot be empty" };
  }

  // Kiểm tra URL format
  try {
    new URL(url);
  } catch {
    return {
      isValid: false,
      message: "Invalid image URL format",
    };
  }

  // Kiểm tra protocol
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:")) {
    return {
      isValid: false,
      message: "Image URL must start with http://, https://, or data:",
    };
  }

  // Kiểm tra extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const urlLower = url.toLowerCase();

  if (url.startsWith("data:")) {
    if (!/^data:image\/(jpeg|png|gif|webp);base64,/.test(url)) {
      return {
        isValid: false,
        message: "Only JPEG, PNG, GIF, WebP data URLs are allowed",
      };
    }
  } else {
    if (!allowedExtensions.some((ext) => urlLower.includes(ext))) {
      return {
        isValid: false,
        message: `Only ${allowedExtensions.join(", ")} image formats are allowed`,
      };
    }
  }

  return { isValid: true, message: "" };
}

/**
 * Comprehensive validation for post content
 */
export function validatePostContent(data: {
  title: string;
  content: string;
  tags?: string[];
  images?: string[];
}): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate title (min 3, max 500)
  const titleValidation = validateTextLength(data.title, 500, 3, "Title");
  if (!titleValidation.isValid) {
    errors.title = titleValidation.message;
  } else {
    const titleXSS = detectClientXSSTreats(data.title);
    if (!titleXSS.isClean) {
      errors.title = `Title contains potentially dangerous content: ${titleXSS.threats.join(", ")}`;
    }
  }

  // Validate content (min 5, max 50000)
  const contentValidation = validateTextLength(data.content, 50000, 5, "Content");
  if (!contentValidation.isValid) {
    errors.content = contentValidation.message;
  } else {
    const contentXSS = detectClientXSSTreats(data.content);
    if (!contentXSS.isClean) {
      errors.content = `Content contains potentially dangerous scripts: ${contentXSS.threats.join(", ")}`;
    }
  }

  // Validate tags
  if (data.tags && data.tags.length > 0) {
    const tagsValidation = validateClientTags(data.tags);
    if (!tagsValidation.isValid) {
      errors.tags = tagsValidation.message;
    }
  }

  // Validate images
  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const imgValidation = validateClientImageUrl(data.images[i]);
      if (!imgValidation.isValid) {
        errors[`image_${i}`] = imgValidation.message;
      }
    }

    if (data.images.length > 10) {
      errors.images = "Maximum 10 images allowed";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default {
  detectClientXSSTreats,
  validateTextLength,
  validateClientTags,
  validateClientImageUrl,
  validatePostContent,
};
