import AsyncStorage from '@react-native-async-storage/async-storage';

const INBOX_KEY = 'notification_inbox_v1';
const MAX_NOTIFICATIONS = 25;

function buildEntry(content = {}, source = 'received', isRead = false) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: content.title || 'Notification',
    body: content.body || '',
    data: content.data || {},
    source,
    isRead,
    timestamp: new Date().toISOString(),
  };
}

export async function addNotificationToInbox(content, source = 'received', isRead = false) {
  try {
    const current = await getNotificationInbox();
    const next = [buildEntry(content, source, isRead), ...current].slice(0, MAX_NOTIFICATIONS);
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.log('Failed to save notification inbox entry:', error);
    return [];
  }
}

export async function getNotificationInbox() {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.log('Failed to read notification inbox:', error);
    return [];
  }
}

export async function markInboxAsRead() {
  try {
    const current = await getNotificationInbox();
    const next = current.map(item => ({ ...item, isRead: true }));
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.log('Failed to mark notification inbox as read:', error);
    return [];
  }
}
