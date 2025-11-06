import { storage } from './storage';
import { hashPassword } from './auth';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create roles
    console.log('Creating roles...');
    const adminRole = await storage.createRole({
      name: 'admin',
      description: 'Administrator with full access',
    });

    const moderatorRole = await storage.createRole({
      name: 'moderator',
      description: 'Moderator with content management access',
    });

    const userRole = await storage.createRole({
      name: 'user',
      description: 'Regular user',
    });

    console.log('✅ Roles created');

    // Create users
    console.log('Creating users...');
    
    const alicePassword = await hashPassword('Password1!');
    const alice = await storage.createUser({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: alicePassword,
      fullName: 'Alice Johnson',
      gender: 'female',
      roleId: adminRole.id,
    });

    const bobPassword = await hashPassword('Password1!');
    const bob = await storage.createUser({
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: bobPassword,
      fullName: 'Bob Smith',
      gender: 'male',
      roleId: userRole.id,
    });

    const charliePassword = await hashPassword('Password1!');
    const charlie = await storage.createUser({
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: charliePassword,
      fullName: 'Charlie Davis',
      roleId: userRole.id,
    });

    console.log('✅ Users created');

    // Create categories
    console.log('Creating categories...');
    
    const techCategory = await storage.createCategory({
      name: 'Technology',
      description: 'Posts about tech, programming, and innovation',
    });

    const lifeCategory = await storage.createCategory({
      name: 'Lifestyle',
      description: 'Life experiences, travel, and personal stories',
    });

    const businessCategory = await storage.createCategory({
      name: 'Business',
      description: 'Business insights, entrepreneurship, and leadership',
    });

    const scienceCategory = await storage.createCategory({
      name: 'Science',
      description: 'Scientific discoveries and research',
    });

    console.log('✅ Categories created');

    // Create sample posts
    console.log('Creating sample posts...');

    const post1 = await storage.createPost({
      title: 'Welcome to SocialBlog: A New Era of Storytelling',
      content: `
        <h2>Introduction</h2>
        <p>Welcome to SocialBlog, where stories come to life! We're excited to launch this platform designed for writers, thinkers, and creators who want to share their voices with the world.</p>
        
        <h2>What Makes SocialBlog Special?</h2>
        <p>SocialBlog isn't just another blogging platform. It's a community-driven space where your stories matter. Whether you're writing about technology, sharing life experiences, or discussing business strategies, you'll find an engaged audience here.</p>
        
        <h2>Features You'll Love</h2>
        <ul>
          <li><strong>Rich Text Editor:</strong> Create beautiful, formatted content with ease</li>
          <li><strong>Scheduled Publishing:</strong> Plan your content calendar and publish automatically</li>
          <li><strong>Community Engagement:</strong> Connect with readers through comments and interactions</li>
          <li><strong>Categories & Tags:</strong> Organize your content and help readers discover your posts</li>
        </ul>
        
        <h2>Getting Started</h2>
        <p>Ready to share your story? Click the "Create Post" button and start writing. We can't wait to read what you have to say!</p>
      `,
      userId: alice.id,
      categoryId: techCategory.id,
      tags: ['announcement', 'welcome', 'SocialBlog'],
      images: [],
      status: 'published',
      publicationDate: new Date(),
      views: 127,
    });

    const post2 = await storage.createPost({
      title: 'The Future of Web Development: Trends to Watch in 2025',
      content: `
        <h2>Introduction</h2>
        <p>The web development landscape is constantly evolving. As we move through 2025, several exciting trends are shaping how we build and interact with web applications.</p>
        
        <h2>1. AI-Powered Development</h2>
        <p>Artificial Intelligence is revolutionizing how we write code. From intelligent code completion to automated testing, AI tools are making developers more productive than ever.</p>
        
        <h2>2. Edge Computing</h2>
        <p>Edge computing is bringing computation closer to users, resulting in faster load times and better user experiences. This trend is particularly important for global applications.</p>
        
        <h2>3. Progressive Web Apps (PWAs)</h2>
        <p>PWAs continue to blur the line between web and native applications, offering offline functionality and native-like experiences in the browser.</p>
        
        <h2>Conclusion</h2>
        <p>The future of web development is bright and full of possibilities. Stay curious, keep learning, and embrace these new technologies!</p>
      `,
      userId: alice.id,
      categoryId: techCategory.id,
      tags: ['webdev', 'technology', 'trends', '2025'],
      images: [],
      status: 'published',
      publicationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      views: 89,
    });

    const post3 = await storage.createPost({
      title: 'My Journey to Remote Work: Lessons Learned',
      content: `
        <h2>The Beginning</h2>
        <p>Three years ago, I made the leap to full-time remote work. It wasn't an easy decision, but it's one I haven't regretted. Here's what I've learned along the way.</p>
        
        <h2>Setting Boundaries</h2>
        <p>One of the biggest challenges was learning to separate work from home life. Creating a dedicated workspace and maintaining regular hours helped tremendously.</p>
        
        <h2>Communication is Key</h2>
        <p>Over-communication becomes essential when you're not in an office. I learned to be explicit about my availability, progress, and challenges.</p>
        
        <h2>Building Connections</h2>
        <p>Remote work doesn't mean isolation. I've made meaningful connections with colleagues through virtual coffee chats and team-building activities.</p>
        
        <h2>Final Thoughts</h2>
        <p>Remote work isn't for everyone, but for me, it's been transformative. The flexibility and autonomy have improved both my productivity and quality of life.</p>
      `,
      userId: bob.id,
      categoryId: lifeCategory.id,
      tags: ['remote-work', 'lifestyle', 'productivity', 'work-life-balance'],
      images: [],
      status: 'published',
      publicationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      views: 156,
    });

    const post4 = await storage.createPost({
      title: 'Building a Sustainable Startup: Beyond the Hype',
      content: `
        <h2>The Reality of Startups</h2>
        <p>The startup world is often glamorized, but building a sustainable business requires more than just a great idea. It takes dedication, smart planning, and resilience.</p>
        
        <h2>Focus on Fundamentals</h2>
        <p>While it's easy to get caught up in the latest trends, sustainable startups focus on strong fundamentals: solving real problems, understanding their market, and maintaining healthy financials.</p>
        
        <h2>Customer-Centric Approach</h2>
        <p>Your customers should be at the heart of everything you do. Regular feedback loops and genuine relationships with users will guide your product development more than any framework.</p>
        
        <h2>The Long Game</h2>
        <p>Building a sustainable startup is a marathon, not a sprint. Be patient, stay focused, and remember why you started.</p>
      `,
      userId: charlie.id,
      categoryId: businessCategory.id,
      tags: ['startup', 'entrepreneurship', 'business', 'sustainability'],
      images: [],
      status: 'published',
      publicationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      views: 73,
    });

    const post5 = await storage.createPost({
      title: 'Understanding Climate Science: A Beginner\'s Guide',
      content: `
        <h2>Why Climate Science Matters</h2>
        <p>Climate change is one of the most pressing issues of our time. Understanding the science behind it is crucial for making informed decisions about our future.</p>
        
        <h2>The Greenhouse Effect</h2>
        <p>The greenhouse effect is a natural process where certain gases in the atmosphere trap heat from the sun. Without it, Earth would be too cold to support life as we know it.</p>
        
        <h2>Human Impact</h2>
        <p>Since the Industrial Revolution, human activities have significantly increased greenhouse gas concentrations, intensifying the natural greenhouse effect and leading to global warming.</p>
        
        <h2>What Can We Do?</h2>
        <p>Individual actions matter. From reducing energy consumption to supporting sustainable practices, each of us can contribute to mitigating climate change.</p>
      `,
      userId: bob.id,
      categoryId: scienceCategory.id,
      tags: ['climate', 'science', 'environment', 'education'],
      images: [],
      status: 'published',
      publicationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      views: 201,
    });

    console.log('✅ Posts created');

    // Create some sample interactions
    console.log('Creating sample interactions...');
    
    await storage.createInteraction({ userId: bob.id, postId: post1.id, type: 'like' });
    await storage.createInteraction({ userId: charlie.id, postId: post1.id, type: 'like' });
    await storage.createInteraction({ userId: bob.id, postId: post1.id, type: 'bookmark' });
    
    await storage.createInteraction({ userId: alice.id, postId: post3.id, type: 'like' });
    await storage.createInteraction({ userId: charlie.id, postId: post3.id, type: 'love' });
    
    await storage.createInteraction({ userId: alice.id, postId: post4.id, type: 'like' });
    await storage.createInteraction({ userId: bob.id, postId: post4.id, type: 'bookmark' });

    console.log('✅ Interactions created');

    // Create some sample comments
    console.log('Creating sample comments...');
    
    const comment1 = await storage.createComment({
      postId: post1.id,
      userId: bob.id,
      content: 'Great introduction! Really excited to be part of this community.',
    });

    await storage.createComment({
      postId: post1.id,
      userId: charlie.id,
      content: 'The features look amazing. Can\'t wait to start writing!',
    });

    await storage.createComment({
      postId: post1.id,
      userId: alice.id,
      content: 'Thank you for the warm welcome! We\'re thrilled to have you here.',
      parentId: comment1.id,
    });

    await storage.createComment({
      postId: post3.id,
      userId: alice.id,
      content: 'Your insights on remote work are spot on. The boundary-setting part really resonates with me.',
    });

    console.log('✅ Comments created');

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📝 Test Accounts:');
    console.log('   Admin: alice@example.com / Password1!');
    console.log('   User: bob@example.com / Password1!');
    console.log('   User: charlie@example.com / Password1!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
