import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { storage } from "./storage";
import { useQuery } from "@tanstack/react-query";

import {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRealClientIp,
  type AuthRequest,
} from "./auth";
import {
  insertUserSchema,
  insertPostSchema,
  insertCommentSchema,
  insertInteractionSchema,
  insertCategorySchema,
  updatePostSchema,
} from "@shared/schema";

import { send2FAEmailWithLinks } from "./email";
import {
  isHighRiskLogin,
  generateVerificationCode,
  generateUniqueToken,
  maskIp,
} from "./auth";

export type SelectUser = {
  id: number;
  username: string;
  email: string;
  lastLoginIp?: string;
  lastLoginAt?: string;
};

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const updateUserSchema = z
  .object({
    fullName: z.string().optional(),
    address: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    avatarUrl: z.string().optional(),
  })
  .strict();

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use("/uploads", express.static(uploadsDir));

  // ==================== AUTH ROUTES ====================

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(
        validatedData.username
      );
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const passwordHash = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        passwordHash,
        roleId: 3,
      });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt,
        createdAt: new Date(),
      } as any);

      res.json({
        user,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        return res.status(403).json({
          error: "Account is locked until " + user.lockedUntil.toLocaleString(),
        });
      } else if (user.lockedUntil && new Date() >= new Date(user.lockedUntil)) {
        await storage.unlockUser(user.id);
      }

      const isPasswordValid = await comparePassword(
        password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // const clientIp =
      //   req.ip || (req.connection.remoteAddress as string) || "unknown";
      const clientIp = getRealClientIp(req);
      const isHighRisk = await isHighRiskLogin(
        user.lastLoginIp,
        user.lastLoginAt,
        clientIp
      );

      if (!isHighRisk) {
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken({ id: user.id });
        // const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // await storage.createRefreshToken({
        //   userId: user.id,
        //   token: refreshToken,
        //   expiresAt,
        //   createdAt: new Date(),
        // } as any);

        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          // sameSite: 'strict',
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          // sameSite: 'strict',
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        await storage.updateUser(user.id, {
          lastLoginIp: clientIp,
          lastLoginAt: new Date(),
        });

        const { passwordHash: _, ...userWithoutPassword } = user;
        return res.json({
          user: userWithoutPassword,
          requiresVerification: false,
        });
      }

      // High-risk login → send 2FA email
      const verificationCode = generateVerificationCode();
      const uniqueToken = generateUniqueToken();
      const deviceFingerprint = req.headers["user-agent"] || "unknown";

      await storage.create2FARequest({
        userId: user.id,
        verificationCode,
        uniqueToken,
        ipAddress: clientIp,
        deviceFingerprint: deviceFingerprint.toString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const baseUrl = process.env.FRONTEND_URL || "http://localhost:5000";
      const approveLink = `${baseUrl}/verify-2fa?token=${uniqueToken}&action=approve`;
      const rejectLink = `${baseUrl}/verify-2fa?token=${uniqueToken}&action=reject`;

      await send2FAEmailWithLinks(
        user.email,
        user.username,
        approveLink,
        rejectLink
      );

      return res.json({
        requiresVerification: true,
        userId: user.id,
        message: "Vui lòng kiểm tra email để xác nhận đăng nhập",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Verify 2FA Email
  app.post("/api/auth/verify-2fa-email", async (req, res) => {
    try {
      const { token, action } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Invalid token" });
      }

      const twoFaRequest = await storage.get2FARequestByToken(token);
      if (!twoFaRequest || new Date() > twoFaRequest.expiresAt) {
        return res.status(401).json({
          error: "Invalid or expired link. Please try logging in again.",
        });
      }

      if (action === "reject") {
        await storage.delete2FARequest(twoFaRequest.id);
        return res.json({
          message: "Login rejected",
          approved: false,
        });
      }

      if (action === "approve") {
        const user = await storage.getUser(twoFaRequest.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken({ id: user.id });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // await storage.createRefreshToken({
        //   userId: user.id,
        //   token: refreshToken,
        //   expiresAt,
        //   createdAt: new Date(),
        // } as any);

        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          // sameSite: 'strict',
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          // sameSite: 'strict',
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        // const clientIp = req.ip || "unknown";
        const clientIp = getRealClientIp(req);
        await storage.updateUser(user.id, {
          lastLoginIp: clientIp,
          lastLoginAt: new Date(),
        });

        // Xóa request 2FA sau khi dùng
        await storage.delete2FARequest(twoFaRequest.id);

        return res.json({
          approved: true,
          user,
          message: "Login approved",
        });
      }

      res.status(400).json({ error: "Invalid action" });
    } catch (error: any) {
      console.error("Email 2FA error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Refresh token
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      // const { refreshToken } = req.body;
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is missing" });
      }
      // xác nhận chữ ký
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // check token exists in DB
      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken || new Date() > new Date(storedToken.expiresAt)) {
        if (storedToken) {
          await storage.deleteRefreshToken(refreshToken);
        }
        return res
          .status(401)
          .json({ error: "Refresh token expired or invalid" });
      }

      // load người dùng
      const user = await storage.getUser(decoded.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      // tạo mới accesstoken (khong refesh token)
      // const newAccessToken = generateAccessToken(user as any);
      const newAccessToken = generateAccessToken(user);

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({ success: true });
      // res.json({
      //   accessToken: newAccessToken,
      //   refreshToken,
      // });
    } catch (error: any) {
      console.error("Refresh error:", error);
      res.status(500).json({ error: "Token refresh failed" });
    }
  });

  // Logout
  app.post(
    "/api/auth/logout",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        // const { refreshToken } = req.body;
        // if (refreshToken) {
        //   await storage.deleteRefreshToken(refreshToken);
        // }
        // res.json({ message: 'Logged out successfully' });
        // XÓA COOKIE
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.json({ message: "Logged out successfully" });
        // XÓA DB (nếu cần)
        // const refreshToken = req.cookies.refreshToken;
        // if (refreshToken) await storage.deleteRefreshToken(refreshToken);
      } catch (error: any) {
        console.error("Logout error:", error);
        res.status(500).json({ error: "Logout failed" });
      }
    }
  );

  // Get current user
  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Nếu tài khoản unlock được, unlock
      if (user.lockedUntil && new Date() >= new Date(user.lockedUntil)) {
        await storage.unlockUser(user.id);
      }

      res.json(user);
    } catch (error: any) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  // lib/auth.ts
  // const { data: currentUser, isLoading } = useQuery<SelectUser | null>({
  //   queryKey: ['/api/auth/me'],
  //   queryFn: async () => {
  //     const res = await fetch('/api/auth/me', { credentials: 'include' });
  //     if (res.status === 401) {
  //       // TỰ ĐỘNG REFRESH
  //       const refreshRes = await fetch('/api/auth/refresh', { credentials: 'include' });
  //       if (refreshRes.ok) {
  //         const retryRes = await fetch('/api/auth/me', { credentials: 'include' });
  //         if (retryRes.ok) return retryRes.json();
  //       }
  //       return null;
  //     }
  //     if (!res.ok) return null;
  //     return res.json();
  //   },
  //   retry: false,
  //   staleTime: 5 * 60 * 1000,
  // });

  // ==================== USER ROUTES ====================

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      if (req.user!.id !== userId && req.user!.roleId !== 1) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const validatedData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Update user error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post(
    "/api/users/:id/avatar",
    authMiddleware,
    upload.single("avatar"),
    async (req: AuthRequest, res) => {
      try {
        const userId = parseInt(req.params.id);
        if (req.user!.id !== userId && req.user!.roleId !== 1) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;
        const updatedUser = await storage.updateUser(userId, { avatarUrl });
        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        const { passwordHash: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error: any) {
        console.error("Upload avatar error:", error);
        res.status(500).json({ error: "Failed to upload avatar" });
      }
    }
  );

  app.get(
    "/api/users",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const { q, locked } = req.query;
        const filters: any = {};
        if (q) filters.email = q as string;
        if (locked === "true") filters.locked = true;

        const users = await storage.getAllUsers(filters);
        res.json(users);
      } catch (error: any) {
        console.error("Get users error:", error);
        res.status(500).json({ error: "Failed to get users" });
      }
    }
  );

  app.post(
    "/api/users/:id/lock",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { lockedUntil, lockReason } = req.body;
        if (!lockedUntil || !lockReason) {
          return res
            .status(400)
            .json({ error: "lockedUntil and lockReason are required" });
        }

        const lockedUser = await storage.lockUser(userId, {
          lockedBy: req.user!.id,
          lockedAt: new Date(),
          lockedUntil: new Date(lockedUntil),
          lockReason,
        });

        if (!lockedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User locked successfully" });
      } catch (error: any) {
        console.error("Lock user error:", error);
        res.status(500).json({ error: "Failed to lock user" });
      }
    }
  );

  app.post(
    "/api/users/:id/unlock",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const userId = parseInt(req.params.id);
        await storage.unlockUser(userId);
        res.json({ message: "User unlocked successfully" });
      } catch (error: any) {
        console.error("Unlock user error:", error);
        res.status(500).json({ error: "Failed to unlock user" });
      }
    }
  );

  app.delete(
    "/api/users/:id",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        await storage.deleteUser(userId);
        res.json({ message: "User deleted successfully" });
      } catch (error: any) {
        console.error("Delete user error:", error);
        res
          .status(500)
          .json({ error: "Failed to delete user", details: error.message });
      }
    }
  );

  app.put(
    "/api/users/:id/role",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { roleId } = req.body;
        if (!roleId || ![1, 2, 3].includes(roleId)) {
          return res.status(400).json({ error: "Invalid roleId" });
        }

        const updatedUser = await storage.updateUser(userId, { roleId });
        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json(updatedUser);
      } catch (error: any) {
        console.error("Update role error:", error);
        res.status(500).json({ error: "Failed to update role" });
      }
    }
  );

  // ==================== POST ROUTES ====================

  app.get(
    "/api/posts",
    optionalAuthMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const { q, category, tag, status, userId } = req.query;
        const filters: any = {
          q: q as string,
          tag: tag as string,
          status: (status as string) || "published",
          limit: 50,
          offset: 0,
        };

        if (category && category !== "all") {
          filters.categoryId = parseInt(category as string);
        }

        if (userId) {
          filters.userId = parseInt(userId as string);
          if (req.user && req.user.id === parseInt(userId as string)) {
            filters.status = (status as string) || "all";
          }
        }

        const posts = await storage.getPosts(filters);
        res.json(posts);
      } catch (error: any) {
        console.error("Get posts error:", error);
        res.status(500).json({ error: "Failed to get posts" });
      }
    }
  );

  app.get(
    "/api/posts/:id",
    optionalAuthMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) {
          return res.status(400).json({ error: "Invalid post ID" });
        }

        const post = await storage.getPost(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        await storage.incrementViews(postId);

        if (req.user) {
          const existingView = await storage.getInteraction(
            req.user.id,
            postId,
            "view"
          );
          if (!existingView) {
            await storage.createInteraction({
              userId: req.user.id,
              postId,
              type: "view",
            });
          }
        }

        res.json(post);
      } catch (error: any) {
        console.error("Get post error:", error);
        res.status(500).json({ error: "Failed to get post" });
      }
    }
  );

  app.post("/api/posts", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await storage.createPost({
        ...validatedData,
        userId: req.user!.id,
      });
      res.status(201).json(post);
    } catch (error: any) {
      console.error("Create post error:", error);
      res.status(400).json({ error: error.message || "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      const existingPost = await storage.getPost(postId);
      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (existingPost.userId !== req.user!.id && req.user!.roleId !== 1) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const validatedData = updatePostSchema.parse(req.body);
      const updatedPost = await storage.updatePost(postId, validatedData);
      res.json(updatedPost);
    } catch (error: any) {
      console.error("Update post error:", error);
      res.status(400).json({ error: error.message || "Failed to update post" });
    }
  });

  app.delete(
    "/api/posts/:id",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const postId = parseInt(req.params.id);
        const post = await storage.getPost(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }
        if (post.userId !== req.user!.id && req.user!.roleId !== 1) {
          return res.status(403).json({ error: "Unauthorized" });
        }
        await storage.deletePost(postId);
        res.json({ message: "Post deleted successfully" });
      } catch (error: any) {
        console.error("Delete post error:", error);
        res.status(500).json({ error: "Failed to delete post" });
      }
    }
  );

  app.post(
    "/api/posts/:id/publish",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const postId = parseInt(req.params.id);
        const post = await storage.getPost(postId);
        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }
        if (post.userId !== req.user!.id && req.user!.roleId !== 1) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        const updatedPost = await storage.updatePost(postId, {
          status: "published",
          publicationDate: new Date(),
        });
        res.json(updatedPost);
      } catch (error: any) {
        console.error("Publish post error:", error);
        res.status(500).json({ error: "Failed to publish post" });
      }
    }
  );

  app.get("/api/posts/:id/stats", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const interactions = await storage.getInteractionsByPost(postId);
      const stats = {
        views: post.views,
        likes: interactions.filter((i) => i.type === "like").length,
        loves: interactions.filter((i) => i.type === "love").length,
        bookmarks: interactions.filter((i) => i.type === "bookmark").length,
        shares: interactions.filter((i) => i.type === "share").length,
        comments: post._count?.comments || 0,
      };
      res.json(stats);
    } catch (error: any) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // ==================== COMMENT ROUTES ====================

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getCommentsByPost(postId);
      res.json(comments);
    } catch (error: any) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  app.post(
    "/api/posts/:id/comments",
    authMiddleware,
    async (req: AuthRequest, res) => {
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

        const post = await storage.getPost(postId);
        if (post && post.userId !== req.user!.id) {
          await storage.createNotification({
            userId: post.userId,
            message: `${req.user!.username} commented on your post: "${
              post.title
            }"`,
            type: "new_comment",
            postId: post.id,
            read: false,
          });
        }

        res.status(201).json(comment);
      } catch (error: any) {
        console.error("Add comment error:", error);
        res
          .status(400)
          .json({ error: error.message || "Failed to add comment" });
      }
    }
  );

  app.delete(
    "/api/comments/:id",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const commentId = parseInt(req.params.id);
        const comment = await storage.getComment(commentId);
        if (!comment) {
          return res.status(404).json({ error: "Comment not found" });
        }
        if (
          comment.userId !== req.user!.id &&
          req.user!.roleId !== 1 &&
          req.user!.roleId !== 2
        ) {
          return res.status(403).json({ error: "Unauthorized" });
        }
        await storage.deleteComment(commentId);
        res.json({ message: "Comment deleted successfully" });
      } catch (error: any) {
        console.error("Delete comment error:", error);
        res.status(500).json({ error: "Failed to delete comment" });
      }
    }
  );

  // ==================== INTERACTION ROUTES ====================

  app.post(
    "/api/posts/:id/interact",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const postId = parseInt(req.params.id);
        const { type } = req.body;
        if (!["like", "love", "bookmark", "share"].includes(type)) {
          return res.status(400).json({ error: "Invalid interaction type" });
        }

        const existing = await storage.getInteraction(
          req.user!.id,
          postId,
          type
        );
        if (existing) {
          await storage.deleteInteraction(req.user!.id, postId, type);
          res.json({ action: "removed", type });
        } else {
          await storage.createInteraction({
            userId: req.user!.id,
            postId,
            type,
          });

          if (type === "like" || type === "love") {
            const post = await storage.getPost(postId);
            if (post && post.userId !== req.user!.id) {
              await storage.createNotification({
                userId: post.userId,
                message: `${req.user!.username} ${
                  type === "love" ? "loved" : "liked"
                } your post: "${post.title}"`,
                type: "post_like",
                postId: post.id,
                read: false,
              });
            }
          }

          res.json({ action: "added", type });
        }
      } catch (error: any) {
        console.error("Interact error:", error);
        res.status(500).json({ error: "Failed to process interaction" });
      }
    }
  );

  app.get("/api/posts/:id/interactions", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const interactions = await storage.getInteractionsByPost(postId);
      const summary = {
        like: interactions.filter((i) => i.type === "like").length,
        love: interactions.filter((i) => i.type === "love").length,
        bookmark: interactions.filter((i) => i.type === "bookmark").length,
        share: interactions.filter((i) => i.type === "share").length,
        view: interactions.filter((i) => i.type === "view").length,
      };
      res.json(summary);
    } catch (error: any) {
      console.error("Get interactions error:", error);
      res.status(500).json({ error: "Failed to get interactions" });
    }
  });

  app.get(
    "/api/posts/:id/user-interactions",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const postId = parseInt(req.params.id);
        const interactions = await storage.getUserPostInteractions(
          req.user!.id,
          postId
        );
        res.json(interactions);
      } catch (error: any) {
        console.error("Get user interactions error:", error);
        res.status(500).json({ error: "Failed to get user interactions" });
      }
    }
  );

  // ==================== NOTIFICATION ROUTES ====================

  app.get(
    "/api/notifications",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const notifications = await storage.getNotificationsByUser(
          req.user!.id
        );
        res.json(notifications);
      } catch (error: any) {
        console.error("Get notifications error:", error);
        res.status(500).json({ error: "Failed to get notifications" });
      }
    }
  );

  app.post(
    "/api/notifications/mark-read",
    authMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const { id } = req.body;
        if (id) {
          await storage.markNotificationRead(id);
        } else {
          await storage.markAllNotificationsRead(req.user!.id);
        }
        res.json({ message: "Notifications marked as read" });
      } catch (error: any) {
        console.error("Mark read error:", error);
        res.status(500).json({ error: "Failed to mark notifications as read" });
      }
    }
  );

  // ==================== CATEGORY ROUTES ====================

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  });

  app.post(
    "/api/categories",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const validatedData = insertCategorySchema.parse(req.body);
        const category = await storage.createCategory(validatedData);
        res.status(201).json(category);
      } catch (error: any) {
        console.error("Create category error:", error);
        res
          .status(400)
          .json({ error: error.message || "Failed to create category" });
      }
    }
  );

  // ==================== ROLE ROUTES ====================

  app.get(
    "/api/roles",
    authMiddleware,
    requireRole(1),
    async (req: AuthRequest, res) => {
      try {
        const roles = await storage.getAllRoles();
        res.json(roles);
      } catch (error: any) {
        console.error("Get roles error:", error);
        res.status(500).json({ error: "Failed to get roles" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
