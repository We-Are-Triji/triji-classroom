import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and register for push notifications
 * @returns {Promise<string|null>} Push token if successful, null otherwise
 */
export async function registerForPushNotifications() {
  let token = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted');
      return null;
    }

    // Only try to get push token in production/development builds
    // Skip in Expo Go which doesn't support remote notifications in SDK 53+
    if (finalStatus === 'granted') {
      try {
        // Attempt to get push token - will fail gracefully in Expo Go
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData.data;
        console.log('Push notification token:', token);
      } catch (error) {
        // Expected error in Expo Go SDK 53+ - just log it
        if (error.message.includes('Expo Go')) {
          console.log(
            'Skipping remote push notifications - not supported in Expo Go (use development build for full functionality)'
          );
        } else {
          console.log('Could not get push token:', error.message);
        }
      }
    }
  } catch (error) {
    // Catch any permission-related errors
    console.log('Push notification setup error:', error.message);
    return null;
  }

  // Android-specific configuration
  if (Platform.OS === 'android') {
    // Create multiple channels for different notification types
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Tasks',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22e584',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF4444',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('freedomwall', {
      name: 'Freedom Wall',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3498DB',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  return token;
}

/**
 * Schedule a local push notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to pass with notification
 * @param {string} channelId - Android notification channel ID
 */
export async function schedulePushNotification(title, body, data = {}, channelId = 'default') {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.log('Error scheduling notification:', error);
  }
}

/**
 * Get notification preference for a specific type
 * @param {string} type - 'tasks', 'announcements', or 'freedom_wall'
 * @returns {Promise<boolean>} Whether notifications are enabled for this type
 */
export async function getNotificationPreference(type) {
  try {
    const value = await AsyncStorage.getItem(`notifications_${type}`);
    // Default to true (enabled) if no preference is set
    if (value === null) {
      return true;
    }
    return value === 'true';
  } catch (error) {
    console.log('Error reading notification preference:', error);
    // Default to true on error
    return true;
  }
}

/**
 * Set notification preference for a specific type
 * @param {string} type - 'tasks', 'announcements', or 'freedom_wall'
 * @param {boolean} enabled - Whether to enable notifications
 */
export async function setNotificationPreference(type, enabled) {
  try {
    await AsyncStorage.setItem(`notifications_${type}`, enabled.toString());
  } catch (error) {
    console.log('Error saving notification preference:', error);
  }
}

/**
 * Check if user has granted notification permissions
 * @returns {Promise<boolean>} Whether permissions are granted
 */
export async function checkNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Set up notification listeners
 * @param {function} onNotificationReceived - Callback when notification is received
 * @param {function} onNotificationTapped - Callback when notification is tapped
 * @returns {object} Object with subscription remove functions
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
  // Listener for when a notification is received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when a user taps on or interacts with a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return {
    notificationListener,
    responseListener,
    remove: () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    },
  };
}
