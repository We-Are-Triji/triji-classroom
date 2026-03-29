import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { CheckSquare, Flag, Megaphone, MessageSquare, RefreshCw, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const statConfig = [
  {
    key: 'tasks',
    label: 'Open tasks',
    icon: CheckSquare,
    tone: 'teal',
    accent: '#d9f3ef',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    tone: 'coral',
    accent: '#ffd8d2',
  },
  {
    key: 'reports',
    label: 'Pending reports',
    icon: Flag,
    tone: 'mustard',
    accent: '#fff1c8',
  },
  {
    key: 'users',
    label: 'Total users',
    icon: Users,
    tone: 'lavender',
    accent: '#ece1ff',
  },
];

function buildActivityItem(id, type, data) {
  return {
    id,
    type,
    title:
      data.title ||
      data.persona ||
      data.authorName ||
      (type === 'freedom-wall' ? 'Freedom Wall post' : 'Untitled item'),
    copy: data.details || data.content || data.reason || '',
    createdAt: data.createdAt?.toDate?.() || null,
  };
}

const Dashboard = () => {
  const { profile, currentUser } = useAuth();
  const [stats, setStats] = useState({
    tasks: 0,
    announcements: 0,
    reports: 0,
    users: 0,
    freedomWall: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const readyState = {
      tasks: false,
      announcements: false,
      reports: false,
      users: false,
      recentTasks: false,
      recentAnnouncements: false,
      recentFreedomWall: false,
    };

    const recentBuckets = {
      recentTasks: [],
      recentAnnouncements: [],
      recentFreedomWall: [],
    };

    const markReady = key => {
      readyState[key] = true;
      setLoading(Object.values(readyState).some(value => !value));
    };

    const syncRecentActivity = () => {
      const merged = [
        ...recentBuckets.recentTasks,
        ...recentBuckets.recentAnnouncements,
        ...recentBuckets.recentFreedomWall,
      ]
        .filter(item => item.createdAt)
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 6);

      setRecentActivity(merged);
    };

    const unsubscribers = [
      onSnapshot(collection(db, 'tasks'), snapshot => {
        setStats(previous => ({ ...previous, tasks: snapshot.size }));
        markReady('tasks');
      }),
      onSnapshot(collection(db, 'announcements'), snapshot => {
        setStats(previous => ({ ...previous, announcements: snapshot.size }));
        markReady('announcements');
      }),
      onSnapshot(query(collection(db, 'reports'), where('status', '==', 'Pending')), snapshot => {
        setStats(previous => ({ ...previous, reports: snapshot.size }));
        markReady('reports');
      }),
      onSnapshot(collection(db, 'users'), snapshot => {
        setStats(previous => ({ ...previous, users: snapshot.size }));
        markReady('users');
      }),
      onSnapshot(
        query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(4)),
        snapshot => {
          recentBuckets.recentTasks = snapshot.docs.map(docSnapshot =>
            buildActivityItem(docSnapshot.id, 'task', docSnapshot.data())
          );
          syncRecentActivity();
          markReady('recentTasks');
        }
      ),
      onSnapshot(
        query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(4)),
        snapshot => {
          recentBuckets.recentAnnouncements = snapshot.docs.map(docSnapshot =>
            buildActivityItem(docSnapshot.id, 'announcement', docSnapshot.data())
          );
          syncRecentActivity();
          markReady('recentAnnouncements');
        }
      ),
      onSnapshot(
        query(collection(db, 'freedom-wall-posts'), orderBy('createdAt', 'desc'), limit(4)),
        snapshot => {
          setStats(previous => ({ ...previous, freedomWall: snapshot.size }));
          recentBuckets.recentFreedomWall = snapshot.docs.map(docSnapshot =>
            buildActivityItem(docSnapshot.id, 'freedom-wall', docSnapshot.data())
          );
          syncRecentActivity();
          markReady('recentFreedomWall');
        }
      ),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const quickStats = useMemo(
    () =>
      statConfig.map(item => ({
        ...item,
        value: stats[item.key],
      })),
    [stats]
  );

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) {
    return (
      <div className="page-stack">
        <section className="page-hero brutal-card">
          <div className="page-hero-copy">
            <p className="eyebrow">Overview</p>
            <h1 className="page-title">Loading the admin board…</h1>
          </div>
        </section>
        <div className="skeleton-grid">
          <div className="skeleton-card">
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
          </div>
          <div className="skeleton-card">
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
          </div>
          <div className="skeleton-card">
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-hero brutal-card">
        <div className="page-hero-copy">
          <p className="eyebrow">Overview</p>
          <h1 className="page-title">Welcome back, {profile?.firstName || 'Admin'}.</h1>
          <p className="page-subtitle">
            Keep the student experience tidy from one place: post updates, review reports, and spot
            activity spikes before they become issues.
          </p>
        </div>
        <div className="hero-actions">
          <div className="hero-chip">
            <span>Signed in as {currentUser?.email}</span>
          </div>
          <div className="hero-chip">
            <span>{stats.freedomWall} active wall snapshots tracked</span>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {quickStats.map(item => (
          <article className="metric-card" key={item.key}>
            <div className="metric-head">
              <div className="metric-icon" style={{ background: item.accent }}>
                <item.icon size={22} />
              </div>
              <span className="status-badge" data-tone={item.tone}>
                Live
              </span>
            </div>
            <p className="metric-value">{item.value}</p>
            <p className="metric-label">{item.label}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="content-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2 className="panel-title">What changed most recently</h2>
              <p className="panel-subtitle">A compact feed of the latest tasks, announcements, and wall posts.</p>
            </div>
            <button className="icon-button" onClick={handleRefresh} aria-label="Refresh recent activity">
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No fresh activity yet</p>
              <p className="empty-copy">New tasks, announcements, and wall posts will appear here.</p>
            </div>
          ) : (
            <div className="recent-list">
              {recentActivity.map(item => (
                <div className="recent-item" key={`${item.type}-${item.id}`}>
                  <p className="recent-item-title">{item.title}</p>
                  <p className="recent-item-meta">
                    {item.type.replace('-', ' ')} •{' '}
                    {item.createdAt
                      ? formatDistanceToNow(item.createdAt, { addSuffix: true })
                      : 'just now'}
                  </p>
                  {item.copy ? <p className="row-copy" style={{ marginTop: 8 }}>{item.copy}</p> : null}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="content-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Quick pulse</p>
              <h2 className="panel-title">Today&apos;s focus</h2>
            </div>
          </div>

          <div className="list-stack">
            <div className="list-row">
              <div className="row-main">
                <p className="row-title">Pending reports</p>
                <p className="row-copy">Keep this close to zero so moderation stays calm and predictable.</p>
              </div>
              <div className="status-badge" data-tone={stats.reports > 0 ? 'danger' : 'mint'}>
                {stats.reports}
              </div>
            </div>
            <div className="list-row">
              <div className="row-main">
                <p className="row-title">Announcements queue</p>
                <p className="row-copy">Check expiring notices and remove duplicates before students drown in noise.</p>
              </div>
              <div className="status-badge" data-tone="coral">
                {stats.announcements}
              </div>
            </div>
            <div className="list-row">
              <div className="row-main">
                <p className="row-title">Task pressure</p>
                <p className="row-copy">A smaller, cleaner task board is easier for students to trust at a glance.</p>
              </div>
              <div className="status-badge" data-tone="teal">
                {stats.tasks}
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
