import { NavLink } from 'react-router-dom';
import { CheckSquare, Flag, LayoutDashboard, Megaphone, MessageSquare, Users, X } from 'lucide-react';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/dashboard/freedom-wall', label: 'Freedom Wall', icon: MessageSquare },
    { path: '/dashboard/reports', label: 'Reports', icon: Flag },
    { path: '/dashboard/users', label: 'Users', icon: Users },
  ];

  return (
    <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="admin-sidebar-panel brutal-card">
        <div className="brand-lockup">
          <div className="brand-stack">
            <div className="brand-mark">
              <img src="/icon.png" alt="Triji logo" />
            </div>
            <div>
              <h1 className="brand-name">Triji Admin</h1>
              <p className="brand-caption">Campus operations board</p>
            </div>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav-stack">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footnote">
          <p>
            Everything here points at the same Firebase project as the mobile app, so permissions
            and moderation changes take effect in one place.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
