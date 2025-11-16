// import * as admin from 'firebase-admin';
// import { config } from 'dotenv';

// config();

// const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// if (!serviceAccountKey) {
//   console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not set - Push notifications disabled');
// }

// if (serviceAccountKey) {
//   try {
//     const serviceAccount = JSON.parse(serviceAccountKey);
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//     });
//     console.log('✅ Firebase initialized');
//   } catch (error) {
//     console.error('Firebase initialization error:', error);
//   }
// }

// export async function sendPushNotification(
//   fcmToken: string,
//   payload: {
//     title: string;
//     body: string;
//     data?: Record<string, string>;
//   }
// ): Promise<boolean> {
//   try {
//     if (!admin.apps.length) {
//       console.warn('Firebase not initialized');
//       return false;
//     }

//     await admin.messaging().send({
//       notification: {
//         title: payload.title,
//         body: payload.body,
//       },
//       data: payload.data || {},
//       token: fcmToken,
//       android: {
//         priority: 'high',
//         ttl: 300,
//       },
//       webpush: {
//         headers: {
//           TTL: '300', // thời gian sống của thông báo (tính bằng giây)
//           Urgency: 'high', // độ ưu tiên: 'very-low' | 'low' | 'normal' | 'high'
//         },
//       },
//     });

//     console.log('✅ Push notification sent');
//     return true;
//   } catch (error) {
//     console.error('Firebase send error:', error);
//     return false;
//   }
// }