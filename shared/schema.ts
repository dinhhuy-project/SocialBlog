import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, jsonb, pgEnum} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'scheduled', 'deleted', 'archived', 'pending']);
export const interactionTypeEnum = pgEnum('interaction_type', ['like', 'love', 'bookmark', 'share', 'view']);
export const notificationTypeEnum = pgEnum('notification_type', ['post_like', 'new_comment', 'scheduled_publish', 'scheduled_delete', 'mention']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

// Roles table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }),
  documentId: varchar("document_id", { length: 50 }),
  address: text("address"),
  gender: genderEnum("gender"),
  avatarUrl: text("avatar_url"),
  roleId: integer("role_id").references(() => roles.id).default(3).notNull(), // 3 = user role by default
  // Thông tin khóa tài khoản (thời gian)
  lockedAt: timestamp("locked_at"),
  lockedUntil: timestamp("locked_until"), // Thời gian khóa hết hạn - tự động mở khóa
  lockReason: text("lock_reason"),
  lockedBy: integer("locked_by").references(() => users.id, { onDelete: "set null" }),


  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));


export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  lockedByUser: one(users, {
    fields: [users.lockedBy],
    references: [users.id],
  }),
  posts: many(posts),
  comments: many(comments),
  interactions: many(interactions),
  notifications: many(notifications),
  refreshTokens: many(refreshTokens),
}));

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

// Posts/Blogs table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  status: postStatusEnum("status").default('draft').notNull(),
  publicationDate: timestamp("publication_date"),
  scheduledPublishDate: timestamp("scheduled_publish_date"),
  scheduledDeleteDate: timestamp("scheduled_delete_date"),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  comments: many(comments),
  interactions: many(interactions),
}));

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id").references((): any => comments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
    relationName: "lockedBy",
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
}));

// Interactions table
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  type: interactionTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interactionsRelations = relations(interactions, ({ one }) => ({
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [interactions.postId],
    references: [posts.id],
  }),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull(),
  postId: integer("post_id").references(() => posts.id),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
}));

// Refresh tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const selectRoleSchema = createSelectSchema(roles);

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  passwordHash: true 
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = insertUserSchema.partial().omit({ password: true, email: true, username: true });

export const selectUserSchema = createSelectSchema(users).omit({ passwordHash: true });

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const selectCategorySchema = createSelectSchema(categories);

export const insertPostSchema = createInsertSchema(posts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  views: true,
  userId: true,
}).extend({
  tags: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
});

export const updatePostSchema = insertPostSchema.partial();
export const selectPostSchema = createSelectSchema(posts);

export const insertCommentSchema = createInsertSchema(comments).omit({ 
  id: true, 
  createdAt: true,
  userId: true,
});

export const selectCommentSchema = createSelectSchema(comments);

export const insertInteractionSchema = createInsertSchema(interactions).omit({ 
  id: true, 
  createdAt: true,
  userId: true,
});

export const selectInteractionSchema = createSelectSchema(interactions);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true,
});

export const selectNotificationSchema = createSelectSchema(notifications);

// Type exports
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;

// Extended types with relations
export type PostWithAuthor = Post & {
  author: SelectUser;
  category?: Category;
  _count?: {
    comments: number;
    interactions: number;
  };
};

export type CommentWithAuthor = Comment & {
  author: SelectUser;
  replies?: CommentWithAuthor[];
};

export type NotificationWithPost = Notification & {
  post?: Post;
};
