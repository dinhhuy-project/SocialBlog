# BlogHub - Blog Social Network System

## Overview
BlogHub is a full-stack blog social network platform built with React, Express, PostgreSQL, and TypeScript. It enables users to create, share, and discover blog posts with rich features including scheduled publishing, comments, interactions, and notifications.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, TipTap (rich text editor)
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **Authentication:** JWT with refresh tokens, bcrypt password hashing
- **Scheduled Jobs:** node-cron for automated post publishing/deletion
- **File Upload:** Multer for image uploads

## Features Implemented (MVP)

### Authentication & Users
- User registration and login with JWT authentication
- Refresh token system for persistent sessions
- Role-based access control (Admin, Moderator, User)
- User profiles with avatar upload
- Profile editing

### Blog Posts
- Create, edit, and delete posts with rich text editor
- Post status management (draft, published, scheduled, archived, deleted)
- Scheduled publishing and deletion with automated background jobs
- Categories and tags for organization
- Image uploads for featured images
- Post view counter and analytics
- Search and filtering by category, tag, author, and keyword

### Social Features
- Comments with threaded replies
- Post interactions (like, love, bookmark, share)
- Real-time notifications for likes, comments, and scheduled events
- Notification management (mark as read, view all)

### Admin Features
- Admin dashboard with platform statistics
- User management (view all users and their roles)
- Category management (create and organize categories)
- Post moderation (view all posts across the platform)

## Database Schema

### Core Tables
- **users:** User accounts with authentication and profile data
- **roles:** User roles (admin, moderator, user)
- **posts:** Blog posts with content, metadata, and scheduling
- **comments:** Threaded comments on posts
- **interactions:** User interactions with posts (likes, bookmarks, etc.)
- **notifications:** User notifications
- **categories:** Post categories for organization
- **refresh_tokens:** JWT refresh token storage

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/avatar` - Upload avatar
- `GET /api/users` - Get all users (admin only)

### Posts
- `GET /api/posts` - List posts with filters
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/publish` - Publish post immediately
- `GET /api/posts/:id/stats` - Get post statistics

### Comments
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/comments/:id` - Delete comment

### Interactions
- `POST /api/posts/:id/interact` - Toggle interaction
- `GET /api/posts/:id/interactions` - Get interaction summary

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark notifications as read

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin only)

## Environment Variables
Required secrets (configured in Replit Secrets):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT access tokens
- `REFRESH_SECRET` - Secret for signing refresh tokens
- `SESSION_SECRET` - Session secret (if needed)

## Project Structure
```
client/
  src/
    components/     # Reusable UI components
    pages/          # Page components
    lib/            # Utilities and configurations
server/
  auth.ts          # Authentication utilities
  db.ts            # Database connection
  storage.ts       # Data access layer
  routes.ts        # API route definitions
  scheduler.ts     # Scheduled jobs (cron)
  seed.ts          # Database seed script
shared/
  schema.ts        # Shared type definitions and Drizzle schema
```

## Development Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database
- `tsx server/seed.ts` - Seed database with sample data

## Test Accounts
- **Admin:** alice@example.com / Password1!
- **User:** bob@example.com / Password1!
- **User:** charlie@example.com / Password1!

## Design System
The application follows a modern, clean design inspired by Medium and Linear, with:
- Dark mode as default
- Purple and blue brand colors (262 83% 58%, 240 78% 64%)
- Inter font for UI, Lora font for blog content
- Consistent spacing and component patterns
- Responsive design for all screen sizes

## Recent Changes
- Full MVP implementation with all core features
- Complete authentication system with JWT and refresh tokens
- Rich text editor with TipTap
- Scheduled post publishing with node-cron
- Real-time notifications system
- Admin dashboard and user management
- Database seeded with sample data

## Next Phase Features (Post-MVP)
- User following system
- Personalized feed based on followed authors
- Trending posts algorithm
- Post sharing to social media
- Advanced analytics dashboard
- Moderation queue for reported content
- Socket.IO for real-time notifications
- Image storage migration to Cloudinary/S3
- Rate limiting and advanced security
