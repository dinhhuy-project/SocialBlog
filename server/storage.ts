// Referenced from javascript_database blueprint - updated for complete schema
import { 
  users, 
  roles,
  posts, 
  comments, 
  interactions, 
  notifications, 
  categories,
  refreshTokens,
  type User, 
  type InsertUser,
  type SelectUser,
  type Role,
  type InsertRole,
  type Post,
  type InsertPost,
  type UpdatePost,
  type Comment,
  type InsertComment,
  type Interaction,
  type InsertInteraction,
  type Notification,
  type InsertNotification,
  type Category,
  type InsertCategory,
  type RefreshToken,
  type PostWithAuthor,
  type CommentWithAuthor,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, like, ilike, inArray , isNotNull, gt} from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<SelectUser | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { passwordHash: string }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(filters?: { email?: string; locked?: boolean }): Promise<SelectUser[]>;

  // Roles
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  getAllRoles(): Promise<Role[]>;

  // Posts
  getPost(id: number): Promise<PostWithAuthor | undefined>;
  getPosts(filters: {
    userId?: number;
    categoryId?: number;
    tag?: string;
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<PostWithAuthor[]>;
  createPost(post: InsertPost & { userId: number }): Promise<Post>;
  updatePost(id: number, data: UpdatePost): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;
  incrementViews(id: number): Promise<void>;
  getScheduledPosts(): Promise<Post[]>;

  // Comments
  getComment(id: number): Promise<Comment | undefined>;
  getCommentsByPost(postId: number): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment & { userId: number }): Promise<Comment>;
  deleteComment(id: number): Promise<void>;

  // Interactions
  getInteraction(userId: number, postId: number, type: string): Promise<Interaction | undefined>;
  getInteractionsByPost(postId: number): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction & { userId: number }): Promise<Interaction>;
  deleteInteraction(userId: number, postId: number, type: string): Promise<void>;

  // Notifications
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;

  // Categories
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Refresh Tokens
  createRefreshToken(token: RefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<SelectUser | undefined> {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      documentId: users.documentId,
      address: users.address,
      gender: users.gender,
      avatarUrl: users.avatarUrl,
      roleId: users.roleId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { passwordHash: string }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }
  //khóa tài khoản
  async lockUser(id: number, data: { lockedBy: number; lockedAt: Date; lockedUntil: Date; lockReason: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }
  async unlockUser(id: number): Promise<void> {
    await db.update(users).set({
      lockedAt: null,
      lockedUntil: null,
      lockReason: null,
      lockedBy: null,
    }).where(eq(users.id, id));
  }
  //delete user
  async deleteUser(id: number): Promise<void> {
    // await db.delete(users).where(eq(users.id, id));
    // await db.update(users).set({ 
    //   status: 'deleted',  // Giả sử schema có enum status cho user, thêm nếu chưa
    //   lockedUntil: new Date('9999-12-31T23:59:59Z'),  // Hoặc set locked vĩnh viễn như soft delete
    //   updatedAt: new Date() 
    // }).where(eq(users.id, id));  // Sửa: Update thay vì delete, tránh foreign key error
    // console.log(`Soft deleted user ${id}`);  // Thêm log để debug
  }

  // cho phép tìm kiếm bằng email, và tài khoản bị khóa
  async getAllUsers(filters: { email?: string; locked?: boolean } = {}): Promise<SelectUser[]> {
    let query = db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      documentId: users.documentId,
      address: users.address,
      gender: users.gender,
      avatarUrl: users.avatarUrl,
      roleId: users.roleId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lockedAt: users.lockedAt, // Thêm để UI có dữ liệu locked
      lockedUntil: users.lockedUntil, // Thêm
      lockReason: users.lockReason, // Thêm
      lockedBy: users.lockedBy, // Thêm
    }).from(users).$dynamic();
  
    const conditions = [];
  
    if (filters.email) {
      conditions.push(ilike(users.email, `%${filters.email}%`));
    }
  
    if (filters.locked) {
      conditions.push(and(isNotNull(users.lockedUntil), gt(users.lockedUntil, sql`CURRENT_TIMESTAMP`))!); // Sửa: Sử dụng CURRENT_TIMESTAMP thay vì new Date() để so sánh server time
    }
  
    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }
  
    return await query;
  }
  // Roles
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async getAllRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  // Posts
  async getPost(id: number): Promise<PostWithAuthor | undefined> {
    const [post] = await db.select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      userId: posts.userId,
      categoryId: posts.categoryId,
      tags: posts.tags,
      images: posts.images,
      status: posts.status,
      publicationDate: posts.publicationDate,
      scheduledPublishDate: posts.scheduledPublishDate,
      scheduledDeleteDate: posts.scheduledDeleteDate,
      views: posts.views,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        roleId: users.roleId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
      category: categories,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.id, id));

    if (!post) return undefined;

    const [commentCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(eq(comments.postId, id));

    const [interactionCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(interactions)
      .where(eq(interactions.postId, id));

    return {
      ...post,
      _count: {
        comments: commentCount.count,
        interactions: interactionCount.count,
      },
    } as PostWithAuthor;
  }

  async getPosts(filters: {
    userId?: number;
    categoryId?: number;
    tag?: string;
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<PostWithAuthor[]> {
    let query = db.select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      userId: posts.userId,
      categoryId: posts.categoryId,
      tags: posts.tags,
      images: posts.images,
      status: posts.status,
      publicationDate: posts.publicationDate,
      scheduledPublishDate: posts.scheduledPublishDate,
      scheduledDeleteDate: posts.scheduledDeleteDate,
      views: posts.views,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        roleId: users.roleId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
      category: categories,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .$dynamic();

    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(posts.userId, filters.userId));
    }
    
    if (filters.categoryId) {
      conditions.push(eq(posts.categoryId, filters.categoryId));
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(posts.status, filters.status as any));
    } else if (!filters.userId) {
      // Default to only published for public view
      conditions.push(eq(posts.status, 'published'));
    }

    if (filters.q) {
      conditions.push(
        or(
          ilike(posts.title, `%${filters.q}%`),
          ilike(posts.content, `%${filters.q}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }

    const results = await query
      .orderBy(desc(posts.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return results as PostWithAuthor[];
  }

  async createPost(post: InsertPost & { userId: number }): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async updatePost(id: number, data: UpdatePost): Promise<Post | undefined> {
    const [post] = await db.update(posts).set({ ...data, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
    return post || undefined;
  }

  async deletePost(id: number): Promise<void> {
    await db.update(posts).set({ status: 'deleted' }).where(eq(posts.id, id));
  }

  async incrementViews(id: number): Promise<void> {
    await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, id));
  }

  async getScheduledPosts(): Promise<Post[]> {
    const now = new Date();
    return db.select().from(posts).where(
      and(
        eq(posts.status, 'scheduled'),
        sql`${posts.scheduledPublishDate} <= ${now}`
      )!
    );
  }

  // Comments
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment || undefined;
  }

  async getCommentsByPost(postId: number): Promise<CommentWithAuthor[]> {
    const allComments = await db.select({
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        roleId: users.roleId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);

    // Build threaded structure
    const commentMap = new Map();
    const rootComments: CommentWithAuthor[] = [];

    allComments.forEach((comment) => {
      const commentWithReplies = { ...comment, replies: [] };
      commentMap.set(comment.id, commentWithReplies);
    });

    allComments.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        rootComments.push(commentMap.get(comment.id));
      }
    });

    return rootComments;
  }

  async createComment(comment: InsertComment & { userId: number }): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Interactions
  async getInteraction(userId: number, postId: number, type: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(interactions).where(
      and(
        eq(interactions.userId, userId),
        eq(interactions.postId, postId),
        eq(interactions.type, type as any)
      )!
    );
    return interaction || undefined;
  }

  async getInteractionsByPost(postId: number): Promise<Interaction[]> {
    return db.select().from(interactions).where(eq(interactions.postId, postId));
  }

  async createInteraction(interaction: InsertInteraction & { userId: number }): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async deleteInteraction(userId: number, postId: number, type: string): Promise<void> {
    await db.delete(interactions).where(
      and(
        eq(interactions.userId, userId),
        eq(interactions.postId, postId),
        eq(interactions.type, type as any)
      )!
    );
  }

  // Notifications
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  // Categories
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category || undefined;
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Refresh Tokens
  async createRefreshToken(token: RefreshToken): Promise<RefreshToken> {
    const [newToken] = await db.insert(refreshTokens).values(token).returning();
    return newToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }
}

export const storage = new DatabaseStorage();
