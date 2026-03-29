// Firebase configuration
// Replace these values with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Check if we're in demo mode
export const isDemoMode = !import.meta.env.VITE_FIREBASE_API_KEY || 
                          import.meta.env.VITE_FIREBASE_API_KEY === '';

if (isDemoMode) {
  console.warn('⚠️ Running in DEMO MODE - Firebase is not configured. Please add your Firebase credentials to .env file.');
}

export default firebaseConfig;
