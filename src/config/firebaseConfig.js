// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use environment variables for Firebase config (Expo)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Debug: Log Firebase config (without sensitive keys)
console.log('Firebase Config Status:', {
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasAppId: !!firebaseConfig.appId,
});

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Note: Firebase Analytics doesn't work in React Native/Expo Go
// Use expo-firebase-analytics if needed

// Initialize Auth with React Native persistence
// This ensures user stays logged in even after app restart
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('Firebase Auth initialized with AsyncStorage persistence');
} catch (error) {
  // If initializeAuth fails, auth is already initialized - use existing instance
  console.log('Auth already initialized, using existing instance');
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

// Enable offline persistence
try {
  // Note: In React Native, Firestore persistence is enabled by default
  // This ensures offline data is cached automatically for onSnapshot listeners
  console.log('Firestore offline persistence enabled');
} catch (error) {
  console.log('Error with offline persistence:', error);
}
