import cron from 'node-cron';
import { storage } from './storage';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { posts } from '@shared/schema';

export function startScheduler() {
  // Run every minute to check for scheduled posts
  cron.schedule('* * * * *', async () => {
    try {
      console.log('[Scheduler] Checking for scheduled posts...');

      const now = new Date();
      
      // Get posts that should be published
      const postsToPublish = await storage.getScheduledPosts();

      for (const post of postsToPublish) {
        console.log(`[Scheduler] Publishing post: ${post.title} (ID: ${post.id})`);
        
        await storage.updatePost(post.id, {
          status: 'published',
          publicationDate: now,
        });

        // Create notification for author
        await storage.createNotification({
          userId: post.userId,
          message: `Your post "${post.title}" has been published!`,
          type: 'scheduled_publish',
          postId: post.id,
          read: false,
        });
      }

      // Check for posts that should be deleted
      const postsToDelete = await db.select().from(posts).where(
        sql`${posts.scheduledDeleteDate} IS NOT NULL AND ${posts.scheduledDeleteDate} <= ${now}`
      );

      for (const post of postsToDelete) {
        console.log(`[Scheduler] Deleting post: ${post.title} (ID: ${post.id})`);
        
        await storage.deletePost(post.id);

        // Create notification for author
        await storage.createNotification({
          userId: post.userId,
          message: `Your post "${post.title}" has been automatically deleted as scheduled.`,
          type: 'scheduled_delete',
          postId: post.id,
          read: false,
        });
      }

      if (postsToPublish.length > 0 || postsToDelete.length > 0) {
        console.log(`[Scheduler] Processed ${postsToPublish.length} posts to publish and ${postsToDelete.length} posts to delete`);
      }
    } catch (error) {
      console.error('[Scheduler] Error processing scheduled posts:', error);
    }
  });

  console.log('[Scheduler] Started - Running every minute');
}
