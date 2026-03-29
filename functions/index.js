const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const HttpsError = functions.https.HttpsError;
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const ANNOUNCEMENT_TYPES = ['General', 'Reminder', 'Event', 'Critical'];
const REPORT_REASONS = [
  'Spam',
  'Harassment or Hate Speech',
  'Personal Information',
  'Inappropriate Content',
];
const REPORT_STATUSES = ['Pending', 'Reviewed', 'Resolved'];
const USER_ROLES = ['student', 'officer', 'admin'];

const GLOBAL_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 120,
};

const RATE_LIMITS = {
  saveTask: { windowMs: 10 * 60 * 1000, maxRequests: 30 },
  deleteTask: { windowMs: 10 * 60 * 1000, maxRequests: 30 },
  toggleTaskCompletion: { windowMs: 15 * 60 * 1000, maxRequests: 90 },
  saveAnnouncement: { windowMs: 10 * 60 * 1000, maxRequests: 30 },
  deleteAnnouncement: { windowMs: 10 * 60 * 1000, maxRequests: 30 },
  createFreedomWallPost: { windowMs: 15 * 60 * 1000, maxRequests: 4 },
  deleteFreedomWallPost: { windowMs: 10 * 60 * 1000, maxRequests: 40 },
  toggleFreedomWallLike: { windowMs: 15 * 60 * 1000, maxRequests: 120 },
  submitReport: { windowMs: 60 * 60 * 1000, maxRequests: 12 },
  updateReportStatus: { windowMs: 10 * 60 * 1000, maxRequests: 50 },
  deleteReport: { windowMs: 10 * 60 * 1000, maxRequests: 30 },
  updateUserRole: { windowMs: 60 * 60 * 1000, maxRequests: 12 },
};

function ensureAuthenticated(context) {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
  }
  return uid;
}

async function getUserProfile(uid) {
  const userSnapshot = await db.collection('users').doc(uid).get();

  if (!userSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'User profile not found.');
  }

  const userData = userSnapshot.data() || {};
  return {
    id: userSnapshot.id,
    ...userData,
    role: userData.role || 'student',
  };
}

async function requireProfileWithRoles(uid, roles) {
  const profile = await getUserProfile(uid);

  if (roles && roles.length > 0 && !roles.includes(profile.role)) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action.');
  }

  return profile;
}

async function enforceRateLimit(uid, key, { windowMs, maxRequests }) {
  const bucketRef = db.collection('_rate_limits').doc(`${uid}_${key}`);
  const now = Date.now();

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(bucketRef);
    const data = snapshot.exists ? snapshot.data() || {} : {};

    const currentWindowStart = data.windowStart?.toMillis?.() || 0;
    const shouldReset = currentWindowStart === 0 || now - currentWindowStart >= windowMs;
    const nextWindowStart = shouldReset ? now : currentWindowStart;
    const currentCount = shouldReset ? 0 : Number(data.count || 0);

    if (currentCount >= maxRequests) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }

    transaction.set(
      bucketRef,
      {
        count: currentCount + 1,
        windowStart: Timestamp.fromMillis(nextWindowStart),
        expiresAt: Timestamp.fromMillis(nextWindowStart + windowMs),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function runProtectedCall(name, context, options, handler) {
  const uid = ensureAuthenticated(context);

  await enforceRateLimit(uid, 'global', GLOBAL_RATE_LIMIT);
  await enforceRateLimit(uid, name, options.rateLimit || GLOBAL_RATE_LIMIT);

  const profile = await requireProfileWithRoles(uid, options.roles || null);
  return handler({ uid, profile });
}

function sanitizeText(value, { maxLength = 200, multiline = false, label = 'Field' } = {}) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${label} must be text.`);
  }

  let normalized = value
    .normalize('NFKC')
    .replace(/\0/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/javascript:/gi, '')
    .trim();

  normalized = multiline
    ? normalized
        .replace(/\r\n?/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
    : normalized.replace(/\s+/g, ' ');

  if (!normalized) {
    throw new HttpsError('invalid-argument', `${label} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new HttpsError('invalid-argument', `${label} must be ${maxLength} characters or less.`);
  }

  return normalized;
}

function sanitizeOptionalText(value, { maxLength = 500, multiline = false } = {}) {
  if (value == null || value === '') {
    return '';
  }

  return sanitizeText(value, {
    maxLength,
    multiline,
    label: 'Field',
  });
}

function sanitizeEmail(value) {
  const email = sanitizeText(value, {
    maxLength: 120,
    multiline: false,
    label: 'Email',
  }).toLowerCase();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new HttpsError('invalid-argument', 'Please provide a valid email address.');
  }

  return email;
}

function sanitizeEnum(value, allowedValues, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return allowedValues.includes(value) ? value : fallback;
}

function sanitizeDocId(value, label = 'Document ID') {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${label} is missing.`);
  }

  const sanitized = value.trim();
  if (!sanitized || sanitized.length > 200 || /[\/\s]/.test(sanitized)) {
    throw new HttpsError('invalid-argument', `${label} is invalid.`);
  }

  return sanitized;
}

function sanitizeColor(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const candidate = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate.toUpperCase() : fallback;
}

function sanitizeDate(value, label = 'Date') {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError('invalid-argument', `${label} is invalid.`);
  }

  return date;
}

function buildDisplayName(profile) {
  const firstName = typeof profile.firstName === 'string' ? profile.firstName.trim() : '';
  const lastName = typeof profile.lastName === 'string' ? profile.lastName.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || sanitizeEmail(profile.email || 'unknown@triji.app');
}

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

exports.saveTask = functions.https.onCall((data, context) =>
  runProtectedCall('saveTask', context, { roles: ['admin'], rateLimit: RATE_LIMITS.saveTask }, async ({ uid }) => {
    const taskId = data?.taskId ? sanitizeDocId(data.taskId, 'Task ID') : null;
    const title = sanitizeText(data?.title, { maxLength: 120, label: 'Task title' });
    const details = sanitizeOptionalText(data?.details || '', {
      maxLength: 2000,
      multiline: true,
    });
    const subjectId = sanitizeText(data?.subjectId, { maxLength: 120, label: 'Subject ID' });
    const subjectName = sanitizeText(data?.subjectName, { maxLength: 120, label: 'Subject name' });
    const subjectCode = sanitizeText(data?.subjectCode, { maxLength: 24, label: 'Subject code' }).toUpperCase();
    const deadlineDate = sanitizeDate(data?.deadline, 'Deadline');

    if (!deadlineDate) {
      throw new HttpsError('invalid-argument', 'Deadline is required.');
    }

    const taskRef = taskId ? db.collection('tasks').doc(taskId) : db.collection('tasks').doc();
    const existingSnapshot = taskId ? await taskRef.get() : null;
    const existingData = existingSnapshot?.exists ? existingSnapshot.data() || {} : {};

    const payload = {
      title,
      details,
      deadline: deadlineDate.toISOString(),
      subjectId,
      subjectName,
      subjectCode,
      status: existingData.status || 'To Do',
      userId: existingData.userId || uid,
      completedBy: Array.isArray(existingData.completedBy) ? existingData.completedBy : [],
      createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await taskRef.set(payload, { merge: false });

    return {
      ok: true,
      taskId: taskRef.id,
    };
  })
);

exports.deleteTask = functions.https.onCall((data, context) =>
  runProtectedCall('deleteTask', context, { roles: ['admin'], rateLimit: RATE_LIMITS.deleteTask }, async () => {
    const taskId = sanitizeDocId(data?.taskId, 'Task ID');
    await db.collection('tasks').doc(taskId).delete();
    return { ok: true };
  })
);

exports.toggleTaskCompletion = functions.https.onCall((data, context) =>
  runProtectedCall(
    'toggleTaskCompletion',
    context,
    { rateLimit: RATE_LIMITS.toggleTaskCompletion },
    async ({ uid }) => {
      const taskId = sanitizeDocId(data?.taskId, 'Task ID');
      const taskRef = db.collection('tasks').doc(taskId);

      const result = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(taskRef);

        if (!snapshot.exists) {
          throw new HttpsError('not-found', 'Task not found.');
        }

        const task = snapshot.data() || {};
        const completedBy = Array.isArray(task.completedBy) ? [...task.completedBy] : [];
        const hasCompleted = completedBy.includes(uid);
        const nextCompletedBy = hasCompleted
          ? completedBy.filter(entry => entry !== uid)
          : [...completedBy, uid];

        transaction.update(taskRef, {
          completedBy: nextCompletedBy,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          completed: !hasCompleted,
          completedBy: nextCompletedBy,
        };
      });

      return {
        ok: true,
        ...result,
      };
    }
  )
);

exports.saveAnnouncement = functions.https.onCall((data, context) =>
  runProtectedCall(
    'saveAnnouncement',
    context,
    { roles: ['admin', 'officer'], rateLimit: RATE_LIMITS.saveAnnouncement },
    async ({ uid, profile }) => {
      const announcementId = data?.announcementId
        ? sanitizeDocId(data.announcementId, 'Announcement ID')
        : null;
      const title = sanitizeText(data?.title, {
        maxLength: 120,
        label: 'Announcement title',
      });
      const content = sanitizeText(data?.content, {
        maxLength: 4000,
        multiline: true,
        label: 'Announcement content',
      });
      const type = sanitizeEnum(data?.type, ANNOUNCEMENT_TYPES, 'General');
      const expiresAt = sanitizeDate(data?.expiresAt, 'Expiry date');

      const announcementRef = announcementId
        ? db.collection('announcements').doc(announcementId)
        : db.collection('announcements').doc();
      const existingSnapshot = announcementId ? await announcementRef.get() : null;
      const existingData = existingSnapshot?.exists ? existingSnapshot.data() || {} : {};

      if (
        announcementId &&
        existingSnapshot.exists &&
        profile.role !== 'admin' &&
        existingData.authorId !== uid
      ) {
        throw new HttpsError('permission-denied', 'You can only edit your own announcements.');
      }

      const payload = {
        title,
        content,
        type,
        authorName: existingData.authorName || buildDisplayName(profile),
        authorId: existingData.authorId || uid,
        authorPhotoURL: existingData.authorPhotoURL || '',
        createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
      };

      await announcementRef.set(payload, { merge: false });

      return {
        ok: true,
        announcementId: announcementRef.id,
      };
    }
  )
);

exports.deleteAnnouncement = functions.https.onCall((data, context) =>
  runProtectedCall(
    'deleteAnnouncement',
    context,
    { rateLimit: RATE_LIMITS.deleteAnnouncement },
    async ({ uid, profile }) => {
      const announcementId = sanitizeDocId(data?.announcementId, 'Announcement ID');
      const announcementRef = db.collection('announcements').doc(announcementId);
      const snapshot = await announcementRef.get();

      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Announcement not found.');
      }

      const announcement = snapshot.data() || {};
      if (profile.role !== 'admin' && announcement.authorId !== uid) {
        throw new HttpsError('permission-denied', 'You can only delete your own announcements.');
      }

      await announcementRef.delete();
      return { ok: true };
    }
  )
);

exports.createFreedomWallPost = functions.https.onCall((data, context) =>
  runProtectedCall(
    'createFreedomWallPost',
    context,
    { rateLimit: RATE_LIMITS.createFreedomWallPost },
    async ({ uid }) => {
      const content = sanitizeText(data?.content, {
        maxLength: 500,
        multiline: true,
        label: 'Post content',
      });
      const persona = sanitizeText(data?.persona || 'Anonymous', {
        maxLength: 32,
        label: 'Persona',
      });
      const personaColor = sanitizeColor(data?.personaColor, '#2A9D8F');
      const noteColor = sanitizeColor(data?.noteColor, '#FFFACD');

      const createdAt = Date.now();
      const expiresAt = createdAt + 24 * 60 * 60 * 1000;

      const postRef = db.collection('freedom-wall-posts').doc();
      await postRef.set({
        content,
        persona,
        personaColor,
        noteColor,
        authorId: uid,
        likeCount: 0,
        likedBy: [],
        reportedBy: [],
        createdAt: Timestamp.fromMillis(createdAt),
        expiresAt: Timestamp.fromMillis(expiresAt),
      });

      return {
        ok: true,
        postId: postRef.id,
      };
    }
  )
);

exports.deleteFreedomWallPost = functions.https.onCall((data, context) =>
  runProtectedCall(
    'deleteFreedomWallPost',
    context,
    { rateLimit: RATE_LIMITS.deleteFreedomWallPost },
    async ({ uid, profile }) => {
      const postId = sanitizeDocId(data?.postId, 'Post ID');
      const postRef = db.collection('freedom-wall-posts').doc(postId);
      const snapshot = await postRef.get();

      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Post not found.');
      }

      const post = snapshot.data() || {};
      if (profile.role !== 'admin' && post.authorId !== uid) {
        throw new HttpsError('permission-denied', 'You can only delete your own posts.');
      }

      await postRef.delete();
      return { ok: true };
    }
  )
);

exports.toggleFreedomWallLike = functions.https.onCall((data, context) =>
  runProtectedCall(
    'toggleFreedomWallLike',
    context,
    { rateLimit: RATE_LIMITS.toggleFreedomWallLike },
    async ({ uid }) => {
      const postId = sanitizeDocId(data?.postId, 'Post ID');
      const postRef = db.collection('freedom-wall-posts').doc(postId);

      const result = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(postRef);

        if (!snapshot.exists) {
          throw new HttpsError('not-found', 'Post not found.');
        }

        const post = snapshot.data() || {};
        const likedBy = Array.isArray(post.likedBy) ? [...post.likedBy] : [];
        const hasLiked = likedBy.includes(uid);
        const nextLikedBy = hasLiked ? likedBy.filter(entry => entry !== uid) : [...likedBy, uid];
        const likeCount = Math.max(0, nextLikedBy.length);

        transaction.update(postRef, {
          likedBy: nextLikedBy,
          likeCount,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          liked: !hasLiked,
          likedBy: nextLikedBy,
          likeCount,
        };
      });

      return {
        ok: true,
        ...result,
      };
    }
  )
);

exports.submitReport = functions.https.onCall((data, context) =>
  runProtectedCall(
    'submitReport',
    context,
    { rateLimit: RATE_LIMITS.submitReport },
    async ({ uid }) => {
      const postId = sanitizeDocId(data?.postId, 'Post ID');
      const reason = sanitizeEnum(data?.reason, REPORT_REASONS, null);
      const description = sanitizeOptionalText(data?.description || '', {
        maxLength: 1000,
        multiline: true,
      });

      if (!reason) {
        throw new HttpsError('invalid-argument', 'Please select a valid report reason.');
      }

      const postRef = db.collection('freedom-wall-posts').doc(postId);
      const reportRef = db.collection('reports').doc();

      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(postRef);

        if (!snapshot.exists) {
          throw new HttpsError('not-found', 'Post not found.');
        }

        const post = snapshot.data() || {};
        const reportedBy = Array.isArray(post.reportedBy) ? [...post.reportedBy] : [];

        if (reportedBy.includes(uid)) {
          throw new HttpsError('already-exists', 'You have already reported this post.');
        }

        transaction.set(reportRef, {
          postId,
          postContent: sanitizeOptionalText(post.content || '', {
            maxLength: 500,
            multiline: true,
          }),
          reason,
          description,
          userId: uid,
          reporterId: uid,
          status: 'Pending',
          reportedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        transaction.update(postRef, {
          reportedBy: [...reportedBy, uid],
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return {
        ok: true,
        reportId: reportRef.id,
      };
    }
  )
);

exports.updateReportStatus = functions.https.onCall((data, context) =>
  runProtectedCall(
    'updateReportStatus',
    context,
    { roles: ['admin'], rateLimit: RATE_LIMITS.updateReportStatus },
    async () => {
      const reportId = sanitizeDocId(data?.reportId, 'Report ID');
      const status = sanitizeEnum(data?.status, REPORT_STATUSES, null);

      if (!status) {
        throw new HttpsError('invalid-argument', 'Please provide a valid report status.');
      }

      await db.collection('reports').doc(reportId).update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { ok: true };
    }
  )
);

exports.deleteReport = functions.https.onCall((data, context) =>
  runProtectedCall(
    'deleteReport',
    context,
    { roles: ['admin'], rateLimit: RATE_LIMITS.deleteReport },
    async () => {
      const reportId = sanitizeDocId(data?.reportId, 'Report ID');
      await db.collection('reports').doc(reportId).delete();
      return { ok: true };
    }
  )
);

exports.updateUserRole = functions.https.onCall((data, context) =>
  runProtectedCall(
    'updateUserRole',
    context,
    { roles: ['admin'], rateLimit: RATE_LIMITS.updateUserRole },
    async ({ uid }) => {
      const userId = sanitizeDocId(data?.userId, 'User ID');
      const role = sanitizeEnum(data?.role, USER_ROLES, null);

      if (!role) {
        throw new HttpsError('invalid-argument', 'Please choose a valid user role.');
      }

      if (userId === uid && role !== 'admin') {
        throw new HttpsError(
          'failed-precondition',
          'Use another admin account before removing your own admin access.'
        );
      }

      await db.collection('users').doc(userId).set(
        {
          role,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { ok: true };
    }
  )
);

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

exports.sendTaskNotifications = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(async snapshot => {
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

exports.cleanupExpiredPosts = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    try {
      const expiredPostsQuery = await db
        .collection('freedom-wall-posts')
        .where('expiresAt', '<=', now)
        .get();

      if (expiredPostsQuery.empty) {
        console.log('No expired posts to delete');
        return null;
      }

      const batch = db.batch();
      expiredPostsQuery.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });

      await batch.commit();

      console.log(`Deleted ${expiredPostsQuery.docs.length} expired posts`);
      return null;
    } catch (error) {
      console.error('Error cleaning up expired posts:', error);
      throw error;
    }
  });
