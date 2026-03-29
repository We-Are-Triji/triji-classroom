import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { CalendarClock, Heart, MessageSquareText, ShieldAlert, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { db } from '../lib/firebase';
import { deleteFreedomWallPost } from '../lib/adminApi';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

function normalizeDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = typeof dateValue?.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

const FreedomWall = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', details: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'freedom-wall-posts'), orderBy('createdAt', 'desc')),
      snapshot => {
        setPosts(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const reportCount = Array.isArray(post.reportedBy) ? post.reportedBy.length : 0;
      const expiresAt = normalizeDate(post.expiresAt);
      const expiresSoon = expiresAt ? expiresAt.getTime() - Date.now() < 3 * 60 * 60 * 1000 : false;

      if (view === 'Flagged') {
        return reportCount > 0;
      }

      if (view === 'Expiring soon') {
        return expiresSoon;
      }

      return true;
    });
  }, [posts, view]);

  const handleDelete = post => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await deleteFreedomWallPost(post.id);
          setSuccessModal({ isOpen: true, message: 'Freedom Wall post deleted successfully.' });
        } catch (error) {
          console.error('Failed to delete Freedom Wall post:', error);
          setErrorModal({
            isOpen: true,
            title: 'Could not delete post',
            message: 'The post is still live because the moderation request failed.',
            details: error.message,
          });
        }
      },
    });
  };

  return (
    <div className="page-stack">
      <section className="page-hero brutal-card">
        <div className="page-hero-copy">
          <p className="eyebrow">Freedom Wall moderation</p>
          <h1 className="page-title">A cleaner moderation board for anonymous campus posts.</h1>
          <p className="page-subtitle">
            This screen is focused on review and removal only, which matches the actual admin job better than pretending the wall is another content composer.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button" onClick={() => setView('All')}>All posts</button>
          <button className="ghost-button" onClick={() => setView('Flagged')}>Flagged</button>
          <button className="ghost-button" onClick={() => setView('Expiring soon')}>Expiring soon</button>
        </div>
      </section>

      <section className="content-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Moderation queue</p>
            <h2 className="panel-title">{filteredPosts.length} visible posts</h2>
            <p className="panel-subtitle">Likes and report counts stay visible, while destructive actions stay compact and deliberate.</p>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            <div className="skeleton-card">
              <div className="skeleton-line medium" />
              <div className="skeleton-line short" />
            </div>
            <div className="skeleton-card">
              <div className="skeleton-line medium" />
              <div className="skeleton-line short" />
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">Nothing to moderate in this view</p>
            <p className="empty-copy">Switch filters or wait for new wall activity.</p>
          </div>
        ) : (
          <div className="list-stack">
            {filteredPosts.map(post => {
              const createdAt = normalizeDate(post.createdAt);
              const expiresAt = normalizeDate(post.expiresAt);
              const reportCount = Array.isArray(post.reportedBy) ? post.reportedBy.length : 0;

              return (
                <article className="list-row" key={post.id}>
                  <div className="row-main">
                    <div className="badge-row">
                      <span className="status-badge" data-tone="lavender">
                        {post.persona || 'Anonymous'}
                      </span>
                      {reportCount > 0 ? (
                        <span className="status-badge" data-tone="danger">
                          {reportCount} report{reportCount === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="status-badge" data-tone="mint">Clean</span>
                      )}
                    </div>

                    <p className="row-title" style={{ marginTop: 12 }}>
                      {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'Just now'}
                    </p>
                    <p className="row-copy">{post.content || 'No content available.'}</p>

                    <div className="row-meta">
                      <span className="meta-pill">
                        <Heart size={14} />
                        <span>{post.likeCount || 0} hearts</span>
                      </span>
                      <span className="meta-pill">
                        <ShieldAlert size={14} />
                        <span>{reportCount} reports</span>
                      </span>
                      <span className="meta-pill">
                        <CalendarClock size={14} />
                        <span>{expiresAt ? `Expires ${format(expiresAt, 'MMM d, yyyy h:mm a')}` : 'No expiry'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="row-actions">
                    <button className="action-mini" data-tone="danger" onClick={() => handleDelete(post)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={confirmModal.action}
        title="Delete wall post"
        message="This removes the post from the live wall and cannot be undone."
        confirmText="Delete post"
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '', details: '' })}
        title={errorModal.title}
        message={errorModal.message}
        details={errorModal.details}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
        autoClose
      />
    </div>
  );
};

export default FreedomWall;
