import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { CalendarClock, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { db } from '../lib/firebase';
import { deleteAnnouncement, saveAnnouncement } from '../lib/adminApi';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

const announcementTypes = ['All', 'General', 'Reminder', 'Event', 'Critical'];

function getTone(type) {
  switch (type) {
    case 'Critical':
      return 'danger';
    case 'Event':
      return 'lavender';
    case 'Reminder':
      return 'mustard';
    default:
      return 'sky';
  }
}

function isExpired(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = typeof dateValue?.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
  return !Number.isNaN(date.getTime()) && !isAfter(date, new Date());
}

function formatAnnouncementDate(dateValue) {
  if (!dateValue) {
    return 'No expiry';
  }

  const date = typeof dateValue?.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
  return Number.isNaN(date.getTime()) ? 'No expiry' : format(date, 'MMM d, yyyy');
}

const initialForm = {
  title: '',
  content: '',
  type: 'General',
  expiresAt: '',
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', details: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
      snapshot => {
        setAnnouncements(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(announcement => {
      const matchesType = typeFilter === 'All' || announcement.type === typeFilter;
      const expired = isExpired(announcement.expiresAt);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && !expired) ||
        (statusFilter === 'Expired' && expired);
      return matchesType && matchesStatus;
    });
  }, [announcements, statusFilter, typeFilter]);

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = announcement => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      type: announcement.type || 'General',
      expiresAt: announcement.expiresAt
        ? new Date(announcement.expiresAt.toDate?.() || announcement.expiresAt)
            .toISOString()
            .split('T')[0]
        : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await saveAnnouncement({
        announcementId: editingAnnouncement?.id,
        title: formData.title,
        content: formData.content,
        type: formData.type,
        expiresAt: formData.expiresAt || null,
      });

      setSuccessModal({
        isOpen: true,
        message: editingAnnouncement ? 'Announcement updated successfully.' : 'Announcement published successfully.',
      });
      setShowModal(false);
      setEditingAnnouncement(null);
      setFormData(initialForm);
    } catch (error) {
      console.error('Failed to save announcement:', error);
      setErrorModal({
        isOpen: true,
        title: 'Could not save announcement',
        message: 'The announcement was not published. Please check the details and try again.',
        details: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = announcement => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await deleteAnnouncement(announcement.id);
          setSuccessModal({ isOpen: true, message: 'Announcement deleted successfully.' });
        } catch (error) {
          console.error('Failed to delete announcement:', error);
          setErrorModal({
            isOpen: true,
            title: 'Could not delete announcement',
            message: 'The announcement is still visible because the delete request failed.',
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
          <p className="eyebrow">Announcement board</p>
          <h1 className="page-title">Notice-board publishing without the old oversized cards.</h1>
          <p className="page-subtitle">
            This board now mirrors the mobile app: compact in the list, full detail only when students open the post.
          </p>
        </div>
        <div className="hero-actions">
          <button className="action-button" onClick={openCreateModal}>
            <Plus size={18} />
            <span>New announcement</span>
          </button>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-grid">
          <label className="field-shell">
            <span className="field-label">Announcement type</span>
            <select className="field-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              {announcementTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="field-shell">
            <span className="field-label">Status</span>
            <select className="field-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="All">All announcements</option>
              <option value="Active">Active only</option>
              <option value="Expired">Expired only</option>
            </select>
          </label>
        </div>
      </section>

      <section className="content-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Announcement log</p>
            <h2 className="panel-title">{filteredAnnouncements.length} announcement entries</h2>
            <p className="panel-subtitle">
              The feed focuses on type, title, author, and timing so admins can scan quickly.
            </p>
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
        ) : filteredAnnouncements.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No announcements in this view</p>
            <p className="empty-copy">Change the filters or publish a new notice.</p>
          </div>
        ) : (
          <div className="list-stack">
            {filteredAnnouncements.map(announcement => (
              <article className="list-row" key={announcement.id}>
                <div className="row-main">
                  <div className="badge-row">
                    <span className="status-badge" data-tone={getTone(announcement.type)}>
                      {announcement.type || 'General'}
                    </span>
                    {isExpired(announcement.expiresAt) ? (
                      <span className="status-badge" data-tone="danger">
                        Expired
                      </span>
                    ) : (
                      <span className="status-badge" data-tone="mint">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="row-title" style={{ marginTop: 12 }}>
                    {announcement.title || 'Untitled announcement'}
                  </p>
                  <p className="row-copy">{announcement.content || 'No content provided.'}</p>

                  <div className="row-meta">
                    <span className="meta-pill">
                      <Megaphone size={14} />
                      <span>{announcement.authorName || 'Campus team'}</span>
                    </span>
                    <span className="meta-pill">
                      <CalendarClock size={14} />
                      <span>Expires {formatAnnouncementDate(announcement.expiresAt)}</span>
                    </span>
                  </div>
                </div>

                <div className="row-actions">
                  <button className="action-mini" data-tone="info" onClick={() => openEditModal(announcement)}>
                    <Pencil size={16} />
                  </button>
                  <button className="action-mini" data-tone="danger" onClick={() => handleDelete(announcement)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showModal ? (
        <div className="modal-backdrop">
          <div className="modal-panel brutal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{editingAnnouncement ? 'Edit post' : 'Compose post'}</p>
                <h2 className="modal-title">
                  {editingAnnouncement ? 'Update announcement' : 'Publish a new announcement'}
                </h2>
                <p className="modal-copy">Write the full notice here. The list view will stay compact automatically.</p>
              </div>
              <button className="icon-button" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field-shell">
                  <span className="field-label">Title</span>
                  <input
                    className="field-input"
                    value={formData.title}
                    onChange={event => setFormData(previous => ({ ...previous, title: event.target.value }))}
                    placeholder="Updated class schedule"
                    required
                  />
                </label>

                <label className="field-shell">
                  <span className="field-label">Type</span>
                  <select
                    className="field-select"
                    value={formData.type}
                    onChange={event => setFormData(previous => ({ ...previous, type: event.target.value }))}
                  >
                    {announcementTypes.filter(type => type !== 'All').map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field-shell">
                <span className="field-label">Content</span>
                <textarea
                  className="field-textarea"
                  value={formData.content}
                  onChange={event => setFormData(previous => ({ ...previous, content: event.target.value }))}
                  placeholder="Add the complete announcement body."
                  required
                />
              </label>

              <label className="field-shell">
                <span className="field-label">Expiry date</span>
                <input
                  className="field-input"
                  type="date"
                  value={formData.expiresAt}
                  onChange={event => setFormData(previous => ({ ...previous, expiresAt: event.target.value }))}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-button" disabled={submitting}>
                  {submitting ? 'Saving…' : editingAnnouncement ? 'Update announcement' : 'Publish announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={confirmModal.action}
        title="Delete announcement"
        message="This notice will disappear from the student board for everyone."
        confirmText="Delete announcement"
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

export default Announcements;
