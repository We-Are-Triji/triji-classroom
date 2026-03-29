import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Edit3, Search, Shield, UserCheck, Users as UsersIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { updateUserRole } from '../lib/adminApi';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

function normalizeRole(role) {
  return role || 'student';
}

function roleTone(role) {
  switch (role) {
    case 'admin':
      return 'danger';
    case 'officer':
      return 'lavender';
    default:
      return 'sky';
  }
}

function roleIcon(role) {
  switch (role) {
    case 'admin':
      return Shield;
    case 'officer':
      return UserCheck;
    default:
      return UsersIcon;
  }
}

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [nextRole, setNextRole] = useState('student');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', details: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      snapshot => {
        setUsers(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const role = normalizeRole(user.role);
      const search = searchTerm.toLowerCase();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      const matchesSearch =
        !search || fullName.includes(search) || (user.email || '').toLowerCase().includes(search);
      const matchesRole = roleFilter === 'All' || role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, searchTerm, users]);

  const stats = useMemo(
    () => ({
      total: users.length,
      students: users.filter(user => normalizeRole(user.role) === 'student').length,
      officers: users.filter(user => normalizeRole(user.role) === 'officer').length,
      admins: users.filter(user => normalizeRole(user.role) === 'admin').length,
    }),
    [users]
  );

  const openRoleModal = user => {
    setSelectedUser(user);
    setNextRole(normalizeRole(user.role));
  };

  const handleUpdateRole = () => {
    if (!selectedUser) return;

    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await updateUserRole(selectedUser.id, nextRole);
          setSuccessModal({
            isOpen: true,
            message: `Updated ${selectedUser.firstName || selectedUser.email}'s role to ${nextRole}.`,
          });
          setSelectedUser(null);
        } catch (error) {
          console.error('Failed to update role:', error);
          setErrorModal({
            isOpen: true,
            title: 'Could not update role',
            message: 'The user role did not change.',
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
          <p className="eyebrow">People and permissions</p>
          <h1 className="page-title">Role management that stays visible and hard to misuse.</h1>
          <p className="page-subtitle">
            Only admins can change roles now, and the mutation runs through a protected backend action instead of a raw client update.
          </p>
        </div>
      </section>

      <section className="metrics-grid">
        {[
          { label: 'Total users', value: stats.total, icon: UsersIcon, tone: 'mint' },
          { label: 'Students', value: stats.students, icon: UsersIcon, tone: 'sky' },
          { label: 'Officers', value: stats.officers, icon: UserCheck, tone: 'lavender' },
          { label: 'Admins', value: stats.admins, icon: Shield, tone: 'danger' },
        ].map(item => (
          <article className="metric-card" key={item.label}>
            <div className="metric-head">
              <div className="metric-icon" style={{ background: '#fffef8' }}>
                <item.icon size={22} />
              </div>
              <span className="status-badge" data-tone={item.tone}>
                {item.label}
              </span>
            </div>
            <p className="metric-value">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="filter-panel">
        <div className="filter-grid">
          <label className="field-shell">
            <span className="field-label">Search users</span>
            <div className="field-input-wrap">
              <Search size={18} className="field-icon" />
              <input
                className="field-input with-icon"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Name or email"
              />
            </div>
          </label>

          <label className="field-shell">
            <span className="field-label">Role filter</span>
            <select className="field-select" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
              <option value="All">All roles</option>
              <option value="student">Students</option>
              <option value="officer">Officers</option>
              <option value="admin">Admins</option>
            </select>
          </label>
        </div>
      </section>

      <section className="content-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Directory</p>
            <h2 className="panel-title">{filteredUsers.length} user records</h2>
            <p className="panel-subtitle">Compact rows keep role audits readable even as the roster grows.</p>
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
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No users match this view</p>
            <p className="empty-copy">Try another search or filter.</p>
          </div>
        ) : (
          <div className="list-stack">
            {filteredUsers.map(user => {
              const RoleIcon = roleIcon(normalizeRole(user.role));
              const joinedAt = user.createdAt?.toDate
                ? format(user.createdAt.toDate(), 'MMM d, yyyy')
                : user.createdAt
                ? format(new Date(user.createdAt), 'MMM d, yyyy')
                : 'Unknown date';

              return (
                <article className="list-row" key={user.id}>
                  <div className="row-main">
                    <div className="badge-row">
                      <span className="status-badge" data-tone={roleTone(normalizeRole(user.role))}>
                        <RoleIcon size={14} />
                        <span>{normalizeRole(user.role)}</span>
                      </span>
                    </div>
                    <p className="row-title" style={{ marginTop: 12 }}>
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
                    </p>
                    <p className="row-copy">{user.email || 'No email provided'}</p>
                    <div className="row-meta">
                      <span className="meta-pill">Joined {joinedAt}</span>
                      <span className="meta-pill">UID {user.id}</span>
                    </div>
                  </div>

                  <div className="row-actions">
                    <button className="action-mini" data-tone="info" onClick={() => openRoleModal(user)}>
                      <Edit3 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedUser ? (
        <div className="modal-backdrop">
          <div className="modal-panel compact brutal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Role change</p>
                <h2 className="modal-title">Update access level</h2>
                <p className="modal-copy">
                  Changes apply to the mobile app and web dashboard because the role lives on the shared user profile.
                </p>
              </div>
              <button className="icon-button" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="content-panel" style={{ padding: 18, background: '#fffef8' }}>
              <p className="row-title" style={{ margin: 0 }}>
                {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
              </p>
              <p className="row-copy">{selectedUser.email}</p>
            </div>

            <label className="field-shell" style={{ marginTop: 18 }}>
              <span className="field-label">Role</span>
              <select className="field-select" value={nextRole} onChange={event => setNextRole(event.target.value)}>
                <option value="student">Student</option>
                <option value="officer">Officer</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setSelectedUser(null)}>
                Cancel
              </button>
              <button className="action-button" onClick={handleUpdateRole} disabled={nextRole === normalizeRole(selectedUser.role)}>
                Save role
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={confirmModal.action}
        title="Confirm role update"
        message="Role changes affect dashboard access and mobile permissions immediately."
        confirmText="Update role"
        type="warning"
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

export default Users;
