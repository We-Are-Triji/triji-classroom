import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function mapLoginError(error) {
  if (!error) {
    return 'Unable to sign in right now.';
  }

  if (error.message?.includes('Admin privileges required')) {
    return 'This dashboard is reserved for admin accounts only.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'That email address format looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No admin account matches that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The password does not match this account.';
    case 'auth/missing-profile':
      return 'Your admin profile is missing from Firestore.';
    default:
      return error.message || 'Unable to sign in right now.';
  }
}

const Login = () => {
  const navigate = useNavigate();
  const { login, currentUser, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async event => {
    event.preventDefault();
    setFeedback('');
    clearError();

    if (!email.trim() || !password) {
      setFeedback('Use your admin email and password to continue.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Admin login failed:', error);
      setFeedback(mapLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-grid">
        <section className="poster-panel brutal-card">
          <p className="eyebrow">Triji admin</p>
          <h1 className="poster-title">Campus control that feels clear, fast, and human.</h1>
          <p className="poster-copy">
            Moderate the Freedom Wall, publish school updates, assign roles, and keep the student
            experience aligned with the mobile app without falling back to a stale dashboard theme.
          </p>

          <div className="poster-chip-row">
            <span className="hero-chip">
              <ShieldCheck size={16} />
              <span>Admin-only access</span>
            </span>
            <span className="hero-chip">
              <LockKeyhole size={16} />
              <span>Rate-limited backend actions</span>
            </span>
          </div>

          <div className="poster-notes">
            <div className="poster-note">
              <strong>Shared source of truth</strong>
              <span>The web panel talks to the same Firebase project and rules as the mobile app.</span>
            </div>
            <div className="poster-note">
              <strong>Readable by design</strong>
              <span>High-contrast paper cards, stronger labels, and compact moderation flows.</span>
            </div>
            <div className="poster-note">
              <strong>Safer critical actions</strong>
              <span>Task, announcement, report, and role changes now go through protected callables.</span>
            </div>
          </div>
        </section>

        <section className="login-panel brutal-card">
          <p className="eyebrow">Welcome back</p>
          <h2 className="login-title">Sign in to the dashboard</h2>
          <p className="helper-copy">
            Use the same Firebase-backed account you manage in the mobile app. Non-admin accounts are
            blocked automatically.
          </p>

          {feedback || authError ? (
            <div className="feedback-box">{feedback || authError}</div>
          ) : null}

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field-shell">
              <span className="field-label">Admin email</span>
              <div className="field-input-wrap">
                <Mail size={18} className="field-icon" />
                <input
                  className="field-input with-icon"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="name@school.edu"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </label>

            <label className="field-shell">
              <span className="field-label">Password</span>
              <div className="field-input-wrap">
                <LockKeyhole size={18} className="field-icon" />
                <input
                  className="field-input with-icon"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Your secure password"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </label>

            <button type="submit" className="action-button" disabled={loading}>
              <ShieldCheck size={18} />
              <span>{loading ? 'Verifying access…' : 'Enter dashboard'}</span>
            </button>

            <button type="button" className="ghost-button" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
              <span>Back to app download</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
