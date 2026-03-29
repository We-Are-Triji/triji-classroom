import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isDemoMode } from '../lib/firebase';
import { sanitizeEmailInput } from '../lib/security';

const AuthContext = createContext(null);

const SESSION_TIMEOUT = 3 * 24 * 60 * 60 * 1000;

function getStoredActivity() {
  const value = localStorage.getItem('adminLastActivity');
  return value ? Number(value) : 0;
}

function updateStoredActivity() {
  localStorage.setItem('adminLastActivity', String(Date.now()));
}

function clearStoredActivity() {
  localStorage.removeItem('adminLastActivity');
}

function isSessionExpired() {
  const lastActivity = getStoredActivity();
  return Boolean(lastActivity) && Date.now() - lastActivity > SESSION_TIMEOUT;
}

async function loadAdminProfile(user) {
  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));

  if (!profileSnapshot.exists()) {
    const error = new Error('User profile not found');
    error.code = 'auth/missing-profile';
    throw error;
  }

  const profile = profileSnapshot.data() || {};
  const role = profile.role || 'student';

  if (role !== 'admin') {
    const error = new Error('Admin privileges required');
    error.code = 'auth/insufficient-role';
    throw error;
  }

  return {
    ...profile,
    role,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      setError('Firebase not configured');
      return undefined;
    }

    setPersistence(auth, browserLocalPersistence).catch(persistenceError => {
      console.error('Failed to enable local auth persistence:', persistenceError);
    });

    const unsubscribe = onAuthStateChanged(
      auth,
      async user => {
        if (!user) {
          clearStoredActivity();
          setCurrentUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (isSessionExpired()) {
          await signOut(auth).catch(() => null);
          clearStoredActivity();
          setCurrentUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        try {
          const adminProfile = await loadAdminProfile(user);
          updateStoredActivity();
          setCurrentUser(user);
          setProfile(adminProfile);
          setError(null);
        } catch (authError) {
          await signOut(auth).catch(() => null);
          clearStoredActivity();
          setCurrentUser(null);
          setProfile(null);
          setError(authError.message);
        } finally {
          setLoading(false);
        }
      },
      authError => {
        console.error('Failed to watch auth state:', authError);
        setError(authError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const markActivity = () => {
      updateStoredActivity();
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(eventName => window.addEventListener(eventName, markActivity));

    const intervalId = window.setInterval(() => {
      if (isSessionExpired()) {
        signOut(auth).catch(() => null);
        clearStoredActivity();
        setCurrentUser(null);
        setProfile(null);
      }
    }, 60_000);

    return () => {
      activityEvents.forEach(eventName => window.removeEventListener(eventName, markActivity));
      window.clearInterval(intervalId);
    };
  }, [currentUser]);

  const login = async (email, password) => {
    setError(null);

    const sanitizedEmail = sanitizeEmailInput(email);
    const credential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);

    try {
      const adminProfile = await loadAdminProfile(credential.user);
      updateStoredActivity();
      setCurrentUser(credential.user);
      setProfile(adminProfile);
      return credential;
    } catch (authError) {
      await signOut(auth).catch(() => null);
      clearStoredActivity();
      throw authError;
    }
  };

  const logout = async () => {
    await signOut(auth);
    clearStoredActivity();
    setCurrentUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      profile,
      role: profile?.role || null,
      isAdmin: profile?.role === 'admin',
      login,
      logout,
      loading,
      error,
      clearError: () => setError(null),
    }),
    [currentUser, profile, loading, error]
  );

  if (loading) {
    return (
      <div className="admin-auth-state">
        <div className="auth-loader-card brutal-card">
          <div className="skeleton-orb" />
          <p className="eyebrow">Securing admin access</p>
          <h2>Checking your dashboard session…</h2>
        </div>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className="admin-auth-state">
        <div className="auth-demo-card brutal-card">
          <p className="eyebrow">Setup required</p>
          <h2>Firebase isn&apos;t configured for the admin dashboard yet.</h2>
          <p>
            Add the `VITE_FIREBASE_*` values in `admin-dashboard/.env` so this panel can connect to
            the same project as the mobile app.
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
