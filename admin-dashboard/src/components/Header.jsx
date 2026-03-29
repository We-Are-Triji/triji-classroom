import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Header = ({ setSidebarOpen }) => {
  const { currentUser, logout, profile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const loadingToast = toast.loading('Logging out...');
    
    try {
      // Add a small delay to make the logout feel more intentional
      await new Promise(resolve => setTimeout(resolve, 500));
      await logout();
      toast.success('Logged out successfully', { id: loadingToast });
    } catch (error) {
      console.error('Failed to logout:', error);
      toast.error('Failed to logout. Please try again.', { id: loadingToast });
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="admin-header brutal-card">
      <div className="header-identity">
        <button
          onClick={() => setSidebarOpen(true)}
          className="menu-button"
          aria-label="Open navigation"
        >
          <Menu size={24} />
        </button>
        <div>
          <p className="eyebrow">Triji admin console</p>
          <h2 className="header-title">Neo-brutal command center</h2>
          <p className="header-subtitle">Moderation, campus updates, and account control in one board.</p>
        </div>
      </div>

      <div className="header-user">
        <div className="header-badge">
          <ShieldCheck size={18} />
          <span>{profile?.firstName || 'Admin'}</span>
        </div>
        <div className="header-badge">
          <span>{currentUser?.email}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="ghost-button disabled:opacity-60"
        >
          <LogOut size={18} />
          <span>{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
