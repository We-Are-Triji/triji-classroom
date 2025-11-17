import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { schedulePushNotification, getNotificationPreference } from './notifications';

let tasksUnsubscribe = null;
let announcementsUnsubscribe = null;
let freedomWallUnsubscribe = null;

/**
 * Start listening for new tasks in Firestore and send notifications
 */
export function startTasksListener() {
  // Check if user is authenticated
  if (!auth.currentUser) {
    console.log('Cannot start tasks listener: User not authenticated');
    return;
  }

  if (tasksUnsubscribe) {
    console.log('Tasks listener already active');
    return; // Already listening
  }

  try {
    // Track the timestamp when listener starts
    const listenerStartTime = new Date();
    let isFirstSnapshot = true;

    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(10));

    tasksUnsubscribe = onSnapshot(
      tasksQuery,
      async snapshot => {
        try {
          // Check if user has enabled tasks notifications
          const notificationsEnabled = await getNotificationPreference('tasks');
          if (!notificationsEnabled) {
            return;
          }

          // Skip the first snapshot - it contains existing documents
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            console.log('Tasks listener: Initial snapshot received, skipping notifications');
            return;
          }

          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              try {
                const task = change.doc.data();
                const currentUser = auth.currentUser;

                // Don't notify user about their own tasks
                if (task.authorId === currentUser?.uid || task.createdBy === currentUser?.uid) {
                  return;
                }

                // Additional check: Only notify about tasks created after listener started
                const taskCreatedAt = task.createdAt?.toDate
                  ? task.createdAt.toDate()
                  : new Date(task.createdAt);

                if (taskCreatedAt < listenerStartTime) {
                  console.log('Skipping old task notification:', task.title);
                  return;
                }

                const subject = task.subjectCode || task.subject || 'Task';
                const title = task.title || 'New assignment';

                console.log('🔔 Sending Task notification:', {
                  subject,
                  title,
                  createdAt: taskCreatedAt,
                });

                schedulePushNotification(
                  '📋 New Task Added',
                  `${subject} • ${title}`,
                  { type: 'task', taskId: change.doc.id },
                  'tasks'
                );
              } catch (notificationError) {
                console.error('Error processing task notification:', notificationError);
              }
            }
          });
        } catch (snapshotError) {
          console.error('Error in tasks snapshot handler:', snapshotError);
        }
      },
      error => {
        console.error('Tasks listener error:', error);
        // Clean up on error
        tasksUnsubscribe = null;
      }
    );
  } catch (error) {
    console.error('Failed to start tasks listener:', error);
    tasksUnsubscribe = null;
  }
}

/**
 * Start listening for new announcements in Firestore and send notifications
 */
export function startAnnouncementsListener() {
  // Check if user is authenticated
  if (!auth.currentUser) {
    console.log('Cannot start announcements listener: User not authenticated');
    return;
  }

  if (announcementsUnsubscribe) {
    console.log('Announcements listener already active');
    return; // Already listening
  }

  try {
    // Track the timestamp when listener starts
    const listenerStartTime = new Date();
    let isFirstSnapshot = true;

    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    announcementsUnsubscribe = onSnapshot(
      announcementsQuery,
      async snapshot => {
        try {
          const notificationsEnabled = await getNotificationPreference('announcements');
          if (!notificationsEnabled) {
            return;
          }

          // Skip the first snapshot - it contains existing documents
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            console.log(
              'Announcements listener: Initial snapshot received, skipping notifications'
            );
            return;
          }

          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              try {
                const announcement = change.doc.data();
                const currentUser = auth.currentUser;

                if (
                  announcement.authorId === currentUser?.uid ||
                  announcement.createdBy === currentUser?.uid
                ) {
                  return;
                }

                // Additional check: Only notify about announcements created after listener started
                const announcementCreatedAt = announcement.createdAt?.toDate
                  ? announcement.createdAt.toDate()
                  : new Date(announcement.createdAt);

                if (announcementCreatedAt < listenerStartTime) {
                  console.log('Skipping old announcement notification:', announcement.title);
                  return;
                }

                const announcementType =
                  announcement.announcementType || announcement.type || 'General';
                let emoji = '📢';
                switch (announcementType) {
                  case 'Critical':
                    emoji = '🚨';
                    break;
                  case 'Event':
                    emoji = '📅';
                    break;
                  case 'Reminder':
                    emoji = '⏰';
                    break;
                  case 'General':
                    emoji = '📢';
                    break;
                }

                console.log('🔔 Sending Announcement notification:', {
                  type: announcementType,
                  title: announcement.title,
                });

                schedulePushNotification(
                  `${emoji} ${announcementType} Announcement`,
                  announcement.title || 'A new announcement has been posted',
                  { type: 'announcement', announcementId: change.doc.id },
                  'announcements'
                );
              } catch (notificationError) {
                console.error('Error processing announcement notification:', notificationError);
              }
            }
          });
        } catch (snapshotError) {
          console.error('Error in announcements snapshot handler:', snapshotError);
        }
      },
      error => {
        console.error('Announcements listener error:', error);
        // Clean up on error
        announcementsUnsubscribe = null;
      }
    );
  } catch (error) {
    console.error('Failed to start announcements listener:', error);
    announcementsUnsubscribe = null;
  }
}

/**
 * Start listening for new Freedom Wall posts and send notifications
 */
export function startFreedomWallListener() {
  // Check if user is authenticated
  if (!auth.currentUser) {
    console.log('Cannot start freedom wall listener: User not authenticated');
    return;
  }

  if (freedomWallUnsubscribe) {
    console.log('Freedom Wall listener already active');
    return; // Already listening
  }

  try {
    // Track the timestamp when listener starts to only notify about NEW posts
    const listenerStartTime = new Date();
    let isFirstSnapshot = true;

    const freedomWallQuery = query(
      collection(db, 'freedom-wall-posts'),
      orderBy('createdAt', 'desc'),
      limit(10) // Increased to catch multiple posts
    );

    freedomWallUnsubscribe = onSnapshot(
      freedomWallQuery,
      async snapshot => {
        try {
          const notificationsEnabled = await getNotificationPreference('freedom_wall');
          if (!notificationsEnabled) {
            return;
          }

          // Skip the first snapshot - it contains existing documents
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            console.log('Freedom Wall listener: Initial snapshot received, skipping notifications');
            return;
          }

          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              try {
                const post = change.doc.data();
                const currentUser = auth.currentUser;

                // Don't notify about own posts
                if (post.authorId === currentUser?.uid || post.userId === currentUser?.uid) {
                  return;
                }

                // Additional check: Only notify about posts created after listener started
                const postCreatedAt = post.createdAt?.toDate
                  ? post.createdAt.toDate()
                  : new Date(post.createdAt);

                if (postCreatedAt < listenerStartTime) {
                  console.log('Skipping old Freedom Wall post notification');
                  return; // Post existed before listener started
                }

                const content = post.content || post.note || 'New post';
                const preview = content.substring(0, 60);
                const author = post.nickname || post.displayName || 'Anonymous';

                console.log('🔔 Sending Freedom Wall notification:', { author, preview });

                schedulePushNotification(
                  '💬 New Freedom Wall Post',
                  `${author}: ${preview}${content.length > 60 ? '...' : ''}`,
                  { type: 'freedomWall', postId: change.doc.id },
                  'freedomwall'
                );
              } catch (notificationError) {
                console.error('Error processing Freedom Wall notification:', notificationError);
              }
            }
          });
        } catch (snapshotError) {
          console.error('Error in Freedom Wall snapshot handler:', snapshotError);
        }
      },
      error => {
        console.error('Freedom Wall listener error:', error);
        // Clean up on error
        freedomWallUnsubscribe = null;
      }
    );
  } catch (error) {
    console.error('Failed to start Freedom Wall listener:', error);
    freedomWallUnsubscribe = null;
  }
}

/**
 * Start all listeners with a delay to ensure app is fully initialized
 */
export function startAllListeners() {
  console.log('Starting all notification listeners...');

  // Add a small delay to ensure app is fully initialized
  setTimeout(() => {
    try {
      startTasksListener();
      startAnnouncementsListener();
      startFreedomWallListener();
      console.log('All notification listeners started successfully');
    } catch (error) {
      console.error('Error starting listeners:', error);
    }
  }, 1000); // 1 second delay
}

/**
 * Stop all listeners safely
 */
export function stopAllListeners() {
  console.log('Stopping all notification listeners...');

  try {
    if (tasksUnsubscribe && typeof tasksUnsubscribe === 'function') {
      tasksUnsubscribe();
      tasksUnsubscribe = null;
      console.log('Tasks listener stopped');
    }
  } catch (error) {
    console.error('Error stopping tasks listener:', error);
    tasksUnsubscribe = null;
  }

  try {
    if (announcementsUnsubscribe && typeof announcementsUnsubscribe === 'function') {
      announcementsUnsubscribe();
      announcementsUnsubscribe = null;
      console.log('Announcements listener stopped');
    }
  } catch (error) {
    console.error('Error stopping announcements listener:', error);
    announcementsUnsubscribe = null;
  }

  try {
    if (freedomWallUnsubscribe && typeof freedomWallUnsubscribe === 'function') {
      freedomWallUnsubscribe();
      freedomWallUnsubscribe = null;
      console.log('Freedom Wall listener stopped');
    }
  } catch (error) {
    console.error('Error stopping freedom wall listener:', error);
    freedomWallUnsubscribe = null;
  }

  console.log('All notification listeners stopped');
}
