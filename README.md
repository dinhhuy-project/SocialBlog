# BlogHub - Blog Social Network

A modern, full-stack blog social network platform where users can write, share, and discover amazing stories.

## Features

- 📝 **Rich Text Editor** - Create beautiful, formatted blog posts with TipTap
- 🕒 **Scheduled Publishing** - Plan your content calendar and publish automatically
- 💬 **Comments & Interactions** - Engage with readers through threaded comments
- 🔖 **Categories & Tags** - Organize content and improve discoverability
- 🔔 **Real-time Notifications** - Stay updated on likes, comments, and more
- 👤 **User Profiles** - Customize your profile with avatars and personal information
- 🛡️ **Role-Based Access** - Admin, moderator, and user roles with appropriate permissions
- 📊 **Analytics** - Track post views and engagement metrics

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (automatically provisioned on Replit)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   The following secrets are automatically configured on Replit:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret for JWT access tokens
   - `REFRESH_SECRET` - Secret for refresh tokens

3. **Push database schema:**
   ```bash
   npm run db:push
   ```

4. **Seed the database (optional):**
   ```bash
   tsx server/seed.ts
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Test Accounts

After seeding the database, you can login with these accounts:

- **Admin Account:**
  - Email: alice@example.com
  - Password: Password1!

- **User Accounts:**
  - Email: bob@example.com / Password: Password1!
  - Email: charlie@example.com / Password: Password1!

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** JWT with refresh tokens
- **Rich Text:** TipTap editor
- **Scheduling:** node-cron

## Project Structure

```
client/               # Frontend React application
  src/
    components/       # Reusable UI components
    pages/            # Page components
    lib/              # Utilities and configurations
server/               # Backend Express application
  auth.ts             # Authentication logic
  db.ts               # Database connection
  storage.ts          # Data access layer
  routes.ts           # API routes
  scheduler.ts        # Scheduled jobs
shared/               # Shared types and schemas
  schema.ts           # Database schema and types
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Posts
- `GET /api/posts` - List posts (with filters)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (authenticated)
- `PUT /api/posts/:id` - Update post (authenticated)
- `DELETE /api/posts/:id` - Delete post (authenticated)
- `POST /api/posts/:id/publish` - Publish post immediately
- `GET /api/posts/:id/stats` - Get post statistics

### Comments
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment (authenticated)
- `DELETE /api/comments/:id` - Delete comment (authenticated)

### Other Endpoints
See the full API documentation in `server/routes.ts`

## Scheduled Jobs

The application uses node-cron to run scheduled jobs:

- **Every minute:** Check for posts to publish or delete based on scheduled dates
- Automatically sends notifications to authors when posts are published or deleted

## Development

### Adding New Features

1. **Database Changes:**
   - Update `shared/schema.ts` with new tables/columns
   - Run `npm run db:push` to apply changes

2. **Backend:**
   - Add routes in `server/routes.ts`
   - Update storage interface in `server/storage.ts`

3. **Frontend:**
   - Create components in `client/src/components/`
   - Add pages in `client/src/pages/`
   - Register routes in `client/src/App.tsx`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the existing code style
2. Write clear commit messages
3. Test your changes thoroughly
4. Update documentation as needed

## License

MIT License - feel free to use this project for your own purposes!

## Support

For issues or questions, please create an issue in the repository.

---

Built with ❤️ using Replit
