const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function sendExpoPushNotifications({
  preferenceKey,
  title,
  body,
  data = {},
  excludeUserId = null,
}) {
  try {
    const usersSnapshot = await db.collection('users').get();
    const messages = [];

    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() || {};
      const token = userData.expoPushToken;
      const notificationsEnabled =
        userData.notificationPreferences?.[preferenceKey] !== false &&
        userData.notificationPermissionStatus !== 'denied';

      if (!token || !notificationsEnabled || userDoc.id === excludeUserId) {
        return;
      }

      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      });
    });

    if (messages.length === 0) {
      console.log(`No recipients found for ${preferenceKey} notification.`);
      return null;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const responseBody = await response.json();
    console.log(`Expo push response for ${preferenceKey}:`, responseBody);
    return responseBody;
  } catch (error) {
    console.error(`Failed to send ${preferenceKey} push notifications:`, error);
    return null;
  }
}

exports.sendAnnouncementNotifications = functions.firestore
  .document('announcements/{announcementId}')
  .onCreate(async snapshot => {
    const data = snapshot.data() || {};

    return sendExpoPushNotifications({
      preferenceKey: 'announcements',
      title: data.type ? `${data.type} announcement` : 'New announcement',
      body: data.title || 'A new announcement was posted.',
      data: {
        screen: 'AnnouncementDetail',
        announcementId: snapshot.id,
      },
      excludeUserId: data.authorId || null,
    });
  });

exports.sendTaskNotifications = functions.firestore.document('tasks/{taskId}').onCreate(async snapshot => {
  const data = snapshot.data() || {};
  const subjectLabel = data.subjectCode || data.subjectName || 'Taskboard';

  return sendExpoPushNotifications({
    preferenceKey: 'tasks',
    title: `New task in ${subjectLabel}`,
    body: data.title || 'A new task was posted.',
    data: {
      screen: 'Tasks',
      taskId: snapshot.id,
    },
    excludeUserId: data.userId || null,
  });
});

exports.sendFreedomWallNotifications = functions.firestore
  .document('freedom-wall-posts/{postId}')
  .onCreate(async snapshot => {
    const data = snapshot.data() || {};
    const preview = (data.content || 'A new Freedom Wall post is up.')
      .trim()
      .slice(0, 100);

    return sendExpoPushNotifications({
      preferenceKey: 'freedom_wall',
      title: 'New Freedom Wall post',
      body: preview,
      data: {
        screen: 'FreedomWall',
        postId: snapshot.id,
      },
      excludeUserId: data.authorId || null,
    });
  });

// Scheduled function to run daily at midnight UTC
exports.cleanupExpiredPosts = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async context => {
    const now = admin.firestore.Timestamp.now();

    try {
      // Query for expired posts
      const expiredPostsQuery = await db
        .collection('freedom-wall-posts')
        .where('expiresAt', '<=', now)
        .get();

      if (expiredPostsQuery.empty) {
        console.log('No expired posts to delete');
        return null;
      }

      // Create batch for deletion
      const batch = db.batch();

      expiredPostsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Execute batch deletion
      await batch.commit();

      console.log(`Deleted ${expiredPostsQuery.docs.length} expired posts`);
      return null;
    } catch (error) {
      console.error('Error cleaning up expired posts:', error);
      throw error;
    }
  });
