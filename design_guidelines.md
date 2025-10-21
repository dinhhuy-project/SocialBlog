# Blog Social Network - Design Guidelines (Compacted)

## Design Philosophy
Hybrid approach combining Medium's content-first philosophy, Linear's modern aesthetics, and Twitter's social patterns. Prioritize readability, clean typography, and social engagement.

---

## Color System

### Dark Mode (Primary)
```
Background: 220 13% 9% | 12% | 15%
Text: 0 0% 98% | 220 9% 65% | 46%
Brand: 262 83% 58% (purple) | 240 78% 64% (blue)
Status: Success 142 71% 45% | Warning 38 92% 50% | Error 0 84% 60%
Border: 220 13% 20% | Elevated 220 13% 18%
```

### Light Mode
```
Background: 0 0% 100% | 220 13% 97% | 94%
Text: 220 13% 9% | 220 9% 35% | 54%
Brand: 262 83% 48% | 240 78% 54%
Border: 220 13% 88%
```

---

## Typography

**Fonts** (Google CDN):
- UI: 'Inter' (sans-serif)
- Content: 'Lora' (serif, blog posts)
- Code: 'JetBrains Mono'

**Scale**:
```
Display: text-6xl/7xl font-bold tracking-tight
H1 (Posts): text-4xl/5xl font-bold leading-tight
H2: text-3xl font-semibold
H3: text-2xl font-semibold
H4: text-xl font-semibold
Body (UI): text-base leading-relaxed
Body (Content): text-lg leading-loose (Lora, max-w-2xl)
Small: text-sm | Meta: text-xs font-medium uppercase tracking-wide
```

**Reading**: max-w-2xl, leading-loose (1.75-2.0), space-y-6 paragraphs

---

## Layout & Spacing

**Spacing Units**: 2, 4, 6, 8, 12, 16, 20, 24
- Micro: p-2, gap-2 | Component: p-4/6 | Section: py-12/16/20

**Containers**:
- App: max-w-7xl mx-auto px-4
- Reading: max-w-2xl mx-auto
- Wide: max-w-5xl mx-auto

**Grids**: 
- Mobile: single column
- Desktop: grid-cols-2/3 gap-6
- Sidebar: 70/30 split

---

## Components

### Navigation
**Header**: 
- `h-16 fixed backdrop-blur-lg bg-background/80`
- Logo left, nav center, user actions right
- Search with cmd+k hint, notification badge

**Sidebar** (Desktop):
- `w-64 fixed` left navigation
- Active: border-left accent + bg tint

### Content Cards
**Post Card (Feed)**:
```
rounded-xl border border-border p-6 bg-background-secondary
hover:shadow-lg hover:-translate-y-1 transition-all

Structure: 
- Featured image (16:9)
- Avatar + author + date
- Title (2 lines max)
- Excerpt (3 lines)
- Engagement footer
```

**Compact/List**: Horizontal layout, border-bottom, hover:bg-background-tertiary

### Forms
**Input**:
```
h-12 px-4 border-2 border-border rounded-lg
focus:ring-2 ring-brand-primary ring-offset-2 ring-offset-background
```

**Buttons**:
- Primary: `bg-brand-primary text-white rounded-lg px-6 py-3 font-semibold`
- Secondary: `bg-background-tertiary text-primary`
- Outline: `border-2 border-brand-primary text-brand-primary`
- Ghost: `hover:bg-background-tertiary`
- Icon: `p-3 rounded-full`

**Rich Editor**:
- Sticky toolbar
- Markdown preview toggle
- Image drop zone
- Tag chips

### Interactions
**Engagement Bar**:
```
Horizontal: Like (heart) | Comment (chat) | Bookmark | Share
gap-6, w-5 h-5 icons, ghost style
Active: filled icon + color change
```

**Comments**:
- Nested: `border-l-2 border-brand-secondary pl-6`
- Avatar + username + timestamp
- Reply/Like actions

**Notifications**:
- Avatar + text + timestamp
- Unread: blue dot or bg tint
- Group by date

### Display
**Profile Card**:
- Avatar (96x96/128x128)
- Name, username, bio
- Stats: Posts, Followers, Following
- Recent posts grid

**Tags**: `rounded-full px-4 py-1.5 text-sm` (border or filled)

### Overlays
**Modal**:
```
Backdrop: fixed inset-0 bg-black/60 backdrop-blur-sm
Content: max-w-2xl rounded-2xl bg-background-secondary p-8
Animation: fade backdrop, slide-up content
```

**Dropdown**: `rounded-xl shadow-2xl border border-border` origin-top-right

**Toast**: Bottom-right fixed, slide-in, auto-dismiss 5s

---

## Page Layouts

### Home Feed
- 3-column desktop: Sidebar (categories) | Feed (max-w-3xl) | Sidebar (suggestions)
- Tabs: Following, Trending, Latest
- Infinite scroll, NO hero image

### Post Detail
- Centered max-w-2xl
- Featured image: 16:9 rounded-xl mb-8
- Title: Large serif
- Author card + read time
- Sticky engagement bar
- Comments + related posts

### Create/Edit
- 70% editor | 30% preview (sticky)
- Toolbar + tag selectors
- Draft/Publish/Schedule options

### Profile
- Cover 4:1 (optional)
- Avatar overlapping cover
- Stats + actions
- Tabs: Posts, Drafts, Liked, Bookmarked

### Dashboard
- Sidebar nav
- Metric cards
- Tables + charts

### Auth
- Centered max-w-md card
- Minimal design
- Gradient background

---

## Images

**Usage**:
- Home: NO hero (content-first)
- Post Detail: YES (16:9 featured, rounded)
- Post Cards: YES (16:9 thumbnails)
- Profiles: Optional cover (4:1)

**Style**: Professional photography, high-quality, relevant content. Avatars circular (32/40/48/96px). Empty states: line art, brand colors.

---

## Animations

**Use**:
- Hover: `scale-105` + shadow
- Buttons: `active:scale-95`
- Loading: Skeleton screens
- Success: Toast slide-in
- Transitions: Fade between routes

**Avoid**: Parallax, card flips, auto-play videos, excessive animations

---

## Accessibility

**Requirements**:
- Touch targets: 44x44px minimum
- Focus: `ring-2 ring-brand-primary ring-offset-2`
- Proper heading hierarchy (h1-h6)
- ARIA labels for icon buttons
- Contrast: 4.5:1 minimum
- Dark mode: Default, consistent inputs
- Mobile: Stack columns, bottom nav, collapsible menus
- Respect `prefers-reduced-motion`

---

## Design Principles

1. **Content First**: Typography > visuals
2. **Clean & Modern**: Minimal, whitespace, purposeful
3. **Social**: Easy engagement, visible interactions
4. **Performant**: Fast, optimized, smooth
5. **Consistent**: Unified spacing, colors, patterns