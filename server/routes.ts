import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { storage } from "./storage";
import { 
  authMiddleware, 
  optionalAuthMiddleware,
  requireRole,
  hashPassword, 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
  type AuthRequest 
} from "./auth";
import { 
  insertUserSchema, 
  insertPostSchema, 
  insertCommentSchema, 
  insertInteractionSchema,
  insertCategorySchema,
  updatePostSchema,
} from "@shared/schema";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const updateUserSchema = z.object({
  fullName: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  avatarUrl: z.string().optional(),
}).strict();

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

  // ==================== AUTH ROUTES ====================
  
  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        passwordHash,
        roleId: 3, // Default user role
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt,
        createdAt: new Date(),
      } as any);

      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(400).json({ error: error.message || 'Registration failed' });
    }
  });

  // Login (xác thực login)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // Check if locked
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        return res.status(403).json({ error: 'Account is locked' });
      } else if (user.lockedUntil && new Date() >= new Date(user.lockedUntil)) {
        // Auto unlock if expired
        await storage.unlockUser(user.id);
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt,
        createdAt: new Date(),
      } as any);

      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Refresh token
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken || new Date() > new Date(storedToken.expiresAt)) {
        return res.status(401).json({ error: 'Refresh token expired or invalid' });
      }

      const user = await storage.getUser(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const newAccessToken = generateAccessToken(user as any);

      res.json({ accessToken: newAccessToken });
    } catch (error: any) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await storage.deleteRefreshToken(refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Get current user
  app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Check auto unlock
      if (user.lockedUntil && new Date() >= new Date(user.lockedUntil)) {
        await storage.unlockUser(user.id);
        user.lockedAt = null;
        user.lockedUntil = null;
        user.lockReason = null;
        user.lockedBy = null;
      }
      res.json(user);
    } catch (error: any) {
      console.error('Get me error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // ==================== USER ROUTES ====================

  // Get user profile
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Update user profile
  app.put('/api/users/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      // Authorization check
      if (req.user!.id !== userId && req.user!.roleId !== 1) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Validate input
      const validatedData = updateUserSchema.parse(req.body);

      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Update user error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: error.errors 
        });
      }
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Upload avatar
  app.post('/api/users/:id/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (req.user!.id !== userId && req.user!.roleId !== 1) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarUrl = `/uploads/${req.file.filename}`;
      const updatedUser = await storage.updateUser(userId, { avatarUrl });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  });

  // Get all users (admin only)
  app.get('/api/users', authMiddleware, requireRole(1), async (req: AuthRequest, res) => {
    try {
      // filter emaail, account locked
      const { q, locked } = req.query;
      const filters: any = {};
      if (q) filters.email = q as string;
      if (locked === 'true') filters.locked = true;

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // api lockUser
  app.post('/api/users/:id/lock', authMiddleware, requireRole(1), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { lockedUntil, lockReason } = req.body;
  
      if (!lockedUntil || !lockReason) {
        return res.status(400).json({ error: 'lockedUntil and lockReason are required' });
      }
  
      const lockedUser = await storage.lockUser(userId, {
        lockedBy: req.user!.id,
        lockedAt: new Date(),
        lockedUntil: new Date(lockedUntil),
        lockReason,
      });
  
      if (!lockedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json({ message: 'User locked successfully' });
    } catch (error: any) {
      console.error('Lock user error:', error);
      res.status(500).json({ error: 'Failed to lock user' });
    }
  });

  // api unlock User
  app.post('/api/users/:id/unlock', authMiddleware, requireRole(1), async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.unlockUser(userId);
      res.json({ message: 'User unlocked successfully' });
    } catch (error: any) {
      console.error('Unlock user error:', error);
      res.status(500).json({ error: 'Failed to unlock user' });
    }
  });

  // ==================== POST ROUTES ====================

  // Get all posts with filters
  app.get('/api/posts', optionalAuthMiddleware, async (req: AuthRequest, res) => {
    try {
      const { q, category, tag, status, userId } = req.query;
      
      const filters: any = {
        q: q as string,
        tag: tag as string,
        status: status as string || 'published',
        limit: 50,
        offset: 0,
      };

      if (category && category !== 'all') {
        filters.categoryId = parseInt(category as string);
      }

      if (userId) {
        filters.userId = parseInt(userId as string);
        // If viewing own posts, allow all statuses
        if (req.user && req.user.id === parseInt(userId as string)) {
          filters.status = status as string || 'all';
        }
      }

      const posts = await storage.getPosts(filters);
      res.json(posts);
    } catch (error: any) {
      console.error('Get posts error:', error);
      res.status(500).json({ error: 'Failed to get posts' });
    }
  });

  // Get single post
  app.get('/api/posts/:id', optionalAuthMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await storage.getPost(postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Increment view count
      await storage.incrementViews(postId);

      // Create view interaction if user is logged in
      if (req.user) {
        const existingView = await storage.getInteraction(req.user.id, postId, 'view');
        if (!existingView) {
          await storage.createInteraction({
            userId: req.user.id,
            postId,
            type: 'view',
          });
        }
      }

      res.json(post);
    } catch (error: any) {
      console.error('Get post error:', error);
      res.status(500).json({ error: 'Failed to get post' });
    }
  });

  // Create post
  app.post('/api/posts', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);

      const post = await storage.createPost({
        ...validatedData,
        userId: req.user!.id,
      });

      res.status(201).json(post);
    } catch (error: any) {
      console.error('Create post error:', error);
      res.status(400).json({ error: error.message || 'Failed to create post' });
    }
  });

  // Update post
  app.put('/api/posts/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const existingPost = await storage.getPost(postId);

      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (existingPost.userId !== req.user!.id && req.user!.roleId !== 1) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const validatedData = updatePostSchema.parse(req.body);
      const updatedPost = await storage.updatePost(postId, validatedData);

      res.json(updatedPost);
    } catch (error: any) {
      console.error('Update post error:', error);
      res.status(400).json({ error: error.message || 'Failed to update post' });
    }
  });

  // Delete post (soft delete)
  app.delete('/api/posts/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.userId !== req.user!.id && req.user!.roleId !== 1) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await storage.deletePost(postId);
      res.json({ message: 'Post deleted successfully' });
    } catch (error: any) {
      console.error('Delete post error:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // Publish post immediately
  app.post('/api/posts/:id/publish', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.userId !== req.user!.id && req.user!.roleId !== 1) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedPost = await storage.updatePost(postId, {
        status: 'published',
        publicationDate: new Date(),
      });

      res.json(updatedPost);
    } catch (error: any) {
      console.error('Publish post error:', error);
      res.status(500).json({ error: 'Failed to publish post' });
    }
  });

  // Get post stats
  app.get('/api/posts/:id/stats', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const interactions = await storage.getInteractionsByPost(postId);
      
      const stats = {
        views: post.views,
        likes: interactions.filter(i => i.type === 'like').length,
        loves: interactions.filter(i => i.type === 'love').length,
        bookmarks: interactions.filter(i => i.type === 'bookmark').length,
        shares: interactions.filter(i => i.type === 'share').length,
        comments: post._count?.comments || 0,
      };

      res.json(stats);
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // ==================== COMMENT ROUTES ====================

  // Get comments for a post
  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getCommentsByPost(postId);
      res.json(comments);
    } catch (error: any) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Failed to get comments' });
    }
  });

  // Add comment
  app.post('/api/posts/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        postId,
      });

      const comment = await storage.createComment({
        ...validatedData,
        userId: req.user!.id,
      });

      // Create notification for post author
      const post = await storage.getPost(postId);
      if (post && post.userId !== req.user!.id) {
        await storage.createNotification({
          userId: post.userId,
          message: `${req.user!.username} commented on your post: "${post.title}"`,
          type: 'new_comment',
          postId: post.id,
          read: false,
        });
      }

      res.status(201).json(comment);
    } catch (error: any) {
      console.error('Add comment error:', error);
      res.status(400).json({ error: error.message || 'Failed to add comment' });
    }
  });

  // Delete comment
  app.delete('/api/comments/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getComment(commentId);

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.userId !== req.user!.id && req.user!.roleId !== 1 && req.user!.roleId !== 2) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await storage.deleteComment(commentId);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Delete comment error:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  // ==================== INTERACTION ROUTES ====================

  // Toggle interaction (like, bookmark, etc.)
  app.post('/api/posts/:id/interact', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { type } = req.body;

      if (!['like', 'love', 'bookmark', 'share'].includes(type)) {
        return res.status(400).json({ error: 'Invalid interaction type' });
      }

      const existing = await storage.getInteraction(req.user!.id, postId, type);

      if (existing) {
        // Remove interaction (unlike, unbookmark, etc.)
        await storage.deleteInteraction(req.user!.id, postId, type);
        res.json({ action: 'removed', type });
      } else {
        // Add interaction
        await storage.createInteraction({
          userId: req.user!.id,
          postId,
          type,
        });

        // Create notification for post author (only for likes)
        if (type === 'like' || type === 'love') {
          const post = await storage.getPost(postId);
          if (post && post.userId !== req.user!.id) {
            await storage.createNotification({
              userId: post.userId,
              message: `${req.user!.username} ${type === 'love' ? 'loved' : 'liked'} your post: "${post.title}"`,
              type: 'post_like',
              postId: post.id,
              read: false,
            });
          }
        }

        res.json({ action: 'added', type });
      }
    } catch (error: any) {
      console.error('Interact error:', error);
      res.status(500).json({ error: 'Failed to process interaction' });
    }
  });

  // Get interactions for a post
  app.get('/api/posts/:id/interactions', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const interactions = await storage.getInteractionsByPost(postId);

      const summary = {
        like: interactions.filter(i => i.type === 'like').length,
        love: interactions.filter(i => i.type === 'love').length,
        bookmark: interactions.filter(i => i.type === 'bookmark').length,
        share: interactions.filter(i => i.type === 'share').length,
        view: interactions.filter(i => i.type === 'view').length,
      };

      res.json(summary);
    } catch (error: any) {
      console.error('Get interactions error:', error);
      res.status(500).json({ error: 'Failed to get interactions' });
    }
  });

  // ==================== NOTIFICATION ROUTES ====================

  // Get user notifications
  app.get('/api/notifications', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.user!.id);
      res.json(notifications);
    } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });

  // Mark notification(s) as read
  app.post('/api/notifications/mark-read', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.body;

      if (id) {
        await storage.markNotificationRead(id);
      } else {
        await storage.markAllNotificationsRead(req.user!.id);
      }

      res.json({ message: 'Notifications marked as read' });
    } catch (error: any) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  });

  // ==================== CATEGORY ROUTES ====================

  // Get all categories
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  });

  // Create category (admin only)
  app.post('/api/categories', authMiddleware, requireRole(1), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(400).json({ error: error.message || 'Failed to create category' });
    }
  });

  // ==================== ROLE ROUTES ====================

  // Get all roles (admin only)
  app.get('/api/roles', authMiddleware, requireRole(1), async (req: AuthRequest, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error: any) {
      console.error('Get roles error:', error);
      res.status(500).json({ error: 'Failed to get roles' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
