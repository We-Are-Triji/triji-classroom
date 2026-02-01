import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import {
  SplashScreen,
  LoginScreen,
  RegisterScreen,
  VerificationScreen,
  CreateAnnouncementScreen,
  AnnouncementDetailScreen,
  AccountSettingsScreen,
  EditProfileScreen,
  GradeCalculatorScreen,
  PostDetailScreen,
  CreateTaskScreen,
  TaskDetailScreen,
  ArchivedTasksScreen,
  ProfileScreen,
} from './src/screens';
import TabNavigator from './src/navigation/TabNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkProvider } from './src/context/NetworkContext';
import { ErrorBoundary, OfflineBanner, OfflineScreen } from './src/components';
import {
  setupNotificationListeners,
  registerForPushNotifications,
} from './src/utils/notifications';
import { startAllListeners, stopAllListeners } from './src/utils/firestoreListeners';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebaseConfig';
// Import Firebase to ensure it's initialized before the app starts
import './src/config/firebaseConfig';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry only if DSN is configured
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : Updates?.channel || 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Adds more context data to events (IP address, cookies, user, etc.)
    sendDefaultPii: true,
    // Enable Logs in development
    enableLogs: __DEV__,
    // Session Replay (optional - can be resource intensive)
    _experiments: {
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    },
    // Mobile replay and feedback integrations
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
    // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: __DEV__,
  });
  console.log('Sentry initialized');
} else {
  console.log('Sentry DSN not configured - error tracking disabled');
}

const Stack = createStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [authChecked, setAuthChecked] = useState(false);

  // Check for updates when app comes to foreground (production only)
  useEffect(() => {
    if (__DEV__) return; // Skip in development

    const checkForUpdatesOnResume = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('📦 Update available in background, fetching...');
          await Updates.fetchUpdateAsync();

          // Notify user about update
          Alert.alert(
            'Update Available',
            'A new version of the app has been downloaded. Restart to apply?',
            [
              {
                text: 'Later',
                style: 'cancel',
              },
              {
                text: 'Restart Now',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (error) {
        console.error('Background update check failed:', error);
      }
    };

    // Set up update listener
    const subscription = Updates.addListener(event => {
      if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
        console.log('Update available event triggered');
        checkForUpdatesOnResume();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Global error handler for unhandled promise rejections and errors
  useEffect(() => {
    const logErrorToStorage = async (error, context) => {
      try {
        const logs = await AsyncStorage.getItem('error_logs');
        const errorLogs = logs ? JSON.parse(logs) : [];
        errorLogs.push({
          timestamp: new Date().toISOString(),
          context,
          message: error.message || String(error),
          stack: error.stack || 'No stack trace',
        });
        // Keep only last 50 errors
        await AsyncStorage.setItem('error_logs', JSON.stringify(errorLogs.slice(-50)));
      } catch (e) {
        console.error('Failed to log error to storage:', e);
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = event => {
      const error = event.reason || event;
      console.error('Unhandled promise rejection:', error);
      logErrorToStorage(error, 'Unhandled Promise Rejection');
      if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
        try {
          Sentry.captureException(error);
        } catch (e) {
          console.error('Sentry error:', e);
        }
      }

      if (__DEV__) {
        Alert.alert('Unhandled Error', error.message || String(error));
      }
    };

    // Handle global errors
    const handleGlobalError = (error, isFatal) => {
      console.error('Global error caught:', error, 'isFatal:', isFatal);
      logErrorToStorage(error, isFatal ? 'Fatal Error' : 'Non-Fatal Error');
      if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
        try {
          Sentry.captureException(error);
        } catch (e) {
          console.error('Sentry error:', e);
        }
      }

      if (isFatal && !__DEV__) {
        // In production, log but don't crash the app
        console.error('Fatal error prevented app crash');
      }
    };

    // Set up error listeners
    if (typeof ErrorUtils !== 'undefined') {
      ErrorUtils.setGlobalHandler(handleGlobalError);
    }

    // Note: window.addEventListener for unhandledrejection only works on web
    // React Native doesn't have window.addEventListener for Promise rejections
    // ErrorUtils.setGlobalHandler will catch most errors in React Native
  }, []);

  // Listen to auth state changes and manage Firestore listeners
  useEffect(() => {
    let hasSetInitialRoute = false;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      user => {
        console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');

        if (user) {
          // User is signed in
          // Note: Listeners will be started after app is fully ready and user reaches MainApp
          console.log('User authenticated');

          // Set initial route if not already set
          if (!hasSetInitialRoute && !isReady) {
            setInitialRouteName('MainApp');
            hasSetInitialRoute = true;
          }
        } else {
          // User is signed out, stop listeners
          console.log('User logged out, stopping listeners');
          stopAllListeners();

          // Set initial route if not already set
          if (!hasSetInitialRoute && !isReady) {
            setInitialRouteName('Login');
            hasSetInitialRoute = true;
          }
        }

        setAuthChecked(true);
      },
      error => {
        console.error('Auth state change error:', error);
        // On error, default to login screen
        if (!hasSetInitialRoute && !isReady) {
          setInitialRouteName('Login');
          hasSetInitialRoute = true;
        }
        setAuthChecked(true);
      }
    );

    return () => {
      unsubscribeAuth();
      stopAllListeners();
    };
  }, [isReady]);

  useEffect(() => {
    const initializeApp = async () => {
      const startTime = Date.now();
      const minDisplayTime = 2000; // Minimum 2 seconds for splash

      try {
        setLoadingMessage('Loading assets...');

        // Check for OTA updates first (before anything else)
        if (!__DEV__) {
          try {
            setLoadingMessage('Checking for updates...');
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
              console.log('📦 Update available, fetching...');
              setLoadingMessage('Downloading update...');
              await Updates.fetchUpdateAsync();
              console.log('✅ Update downloaded, reloading app...');

              // Reload the app to apply the update
              await Updates.reloadAsync();
              // Note: Code after reloadAsync won't execute
              return;
            } else {
              console.log('✅ App is up to date');
            }
          } catch (error) {
            console.error('Update check failed:', error);
            // Log but continue - don't block app startup
            if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
              try {
                Sentry.captureException(error, {
                  tags: { context: 'OTA Update Check' },
                });
              } catch (e) { }
            }
          }
        }

        // Check network connectivity
        const NetInfo = await import('@react-native-community/netinfo');
        const netState = await NetInfo.default.fetch();

        if (!netState.isConnected) {
          console.log('App starting in offline mode');
          // Firebase Auth handles offline persistence automatically
          // Just wait for auth check and let onAuthStateChanged handle routing
        }

        // Preload any critical resources here
        await new Promise(resolve => setTimeout(resolve, 500));

        setLoadingMessage('Checking authentication...');
        // Wait for Firebase Auth to restore session (if any)
        // The onAuthStateChanged listener will set initialRouteName
        let authWaitTime = 0;
        const authCheckInterval = 100;
        const maxAuthWait = 5000; // Increased to 5 seconds for slow connections

        while (!authChecked && authWaitTime < maxAuthWait) {
          await new Promise(resolve => setTimeout(resolve, authCheckInterval));
          authWaitTime += authCheckInterval;
        }

        // If auth check timed out or no route set, default to Login
        if (!initialRouteName) {
          console.log('Auth check completed, defaulting to Login screen');
          setInitialRouteName('Login');
        }

        setLoadingMessage('Setting up notifications...');
        // Register for push notifications (local notifications work in Expo Go)
        try {
          await registerForPushNotifications();
        } catch (error) {
          console.log('Push notification setup error:', error.message);
        }

        setLoadingMessage('Finalizing...');
        // Set up notification listeners
        const listeners = setupNotificationListeners(
          notification => {
            console.log('Received notification:', notification);
          },
          response => {
            console.log('Notification tapped:', response);
          }
        );

        // Ensure minimum display time for splash screen
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);

        if (remainingTime > 0) {
          setLoadingMessage('Almost ready...');
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        // Mark app as ready
        setIsReady(true);

        return () => {
          listeners.remove();
          stopAllListeners();
        };
      } catch (error) {
        console.error('Error initializing app:', error);
        // On error, try to recover gracefully
        if (!initialRouteName) {
          setInitialRouteName('Login');
        }
        setIsReady(true);
      }
    };

    initializeApp();
  }, [authChecked]);

  if (!isReady) {
    return (
      <>
        <SplashScreen loadingMessage={loadingMessage} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <View style={{ flex: 1, backgroundColor: '#1B2845' }}>
          <OfflineBanner />
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={initialRouteName}
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#1B2845' },
                animationEnabled: true,
                animationTypeForReplace: 'push',
                cardStyleInterpolator: ({ current, layouts }) => {
                  return {
                    cardStyle: {
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width, 0],
                          }),
                        },
                      ],
                      opacity: current.progress.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0, 1, 1],
                      }),
                    },
                  };
                },
                transitionSpec: {
                  open: {
                    animation: 'spring',
                    config: {
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8,
                      overshootClamping: true,
                      restDisplacementThreshold: 0.01,
                      restSpeedThreshold: 0.01,
                      useNativeDriver: true,
                    },
                  },
                  close: {
                    animation: 'spring',
                    config: {
                      stiffness: 350,
                      damping: 35,
                      mass: 0.7,
                      overshootClamping: true,
                      restDisplacementThreshold: 0.01,
                      restSpeedThreshold: 0.01,
                      useNativeDriver: true,
                    },
                  },
                },
              }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Verification" component={VerificationScreen} />
              <Stack.Screen name="MainApp" component={TabNavigator} />
              <Stack.Screen
                name="CreateAnnouncement"
                component={CreateAnnouncementScreen}
                options={{
                  cardStyleInterpolator: ({ current, layouts }) => ({
                    cardStyle: {
                      transform: [
                        {
                          translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height, 0],
                          }),
                        },
                      ],
                    },
                  }),
                }}
              />
              <Stack.Screen
                name="AnnouncementDetail"
                component={AnnouncementDetailScreen}
                options={{
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                      transform: [
                        {
                          scale: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.92, 1],
                          }),
                        },
                      ],
                    },
                  }),
                }}
              />
              <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="GradeCalculator" component={GradeCalculatorScreen} />
              <Stack.Screen
                name="PostDetail"
                component={PostDetailScreen}
                options={{
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                      transform: [
                        {
                          scale: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.92, 1],
                          }),
                        },
                      ],
                    },
                  }),
                }}
              />
              <Stack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
                options={{
                  cardStyleInterpolator: ({ current, layouts }) => ({
                    cardStyle: {
                      transform: [
                        {
                          translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height, 0],
                          }),
                        },
                      ],
                    },
                  }),
                }}
              />
              <Stack.Screen
                name="TaskDetail"
                component={TaskDetailScreen}
                options={{
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                      transform: [
                        {
                          scale: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.92, 1],
                          }),
                        },
                      ],
                    },
                  }),
                }}
              />
              <Stack.Screen name="ArchivedTasks" component={ArchivedTasksScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Navigator>
            <StatusBar style="light" />
          </NavigationContainer>
        </View>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
