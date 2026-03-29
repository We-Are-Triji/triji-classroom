import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig, { isDemoMode } from '../config/firebase';

// Initialize Firebase
let app;
let auth;
let db;
let functions;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  
  if (isDemoMode) {
    console.warn('⚠️ DEMO MODE: Firebase credentials not configured');
    console.log('To connect to Firebase:');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log('2. Get your project credentials');
    console.log('3. Add them to the .env file');
  } else {
    console.log('✅ Firebase initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  // Don't throw in demo mode, just log the error
  if (!isDemoMode) {
    throw new Error('Firebase initialization failed. Please check your configuration.');
  }
}

export { auth, db, functions, isDemoMode };
export default app;
