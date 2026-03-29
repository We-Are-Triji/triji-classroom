import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { CheckCircle2, Eye, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { deleteReport, updateReportStatus } from '../lib/adminApi';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

function getStatusTone(status) {
  switch (status) {
    case 'Resolved':
      return 'mint';
    case 'Reviewed':
      return 'sky';
    default:
      return 'danger';
  }
}

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', details: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'reports'), orderBy('reportedAt', 'desc')),
      snapshot => {
        setReports(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        report.reason?.toLowerCase().includes(search) ||
        report.description?.toLowerCase().includes(search) ||
        report.postContent?.toLowerCase().includes(search) ||
        report.reporterId?.toLowerCase().includes(search);

      const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  const handleStatusUpdate = (report, status) => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await updateReportStatus(report.id, status);
          setSuccessModal({ isOpen: true, message: `Report marked as ${status.toLowerCase()}.` });
        } catch (error) {
          console.error('Failed to update report status:', error);
          setErrorModal({
            isOpen: true,
            title: 'Could not update report',
            message: 'The moderation state did not change.',
            details: error.message,
          });
        }
      },
    });
  };

  const handleDelete = report => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await deleteReport(report.id);
          setSuccessModal({ isOpen: true, message: 'Report deleted successfully.' });
        } catch (error) {
          console.error('Failed to delete report:', error);
          setErrorModal({
            isOpen: true,
            title: 'Could not delete report',
            message: 'The report is still in the queue because the delete request failed.',
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
          <p className="eyebrow">Reports</p>
          <h1 className="page-title">A moderation queue shaped around the actual report data.</h1>
          <p className="page-subtitle">
            The old dashboard expected a different schema. This version reads the same report shape the mobile app actually submits.
          </p>
        </div>
        <div className="hero-actions">
          <span className="hero-chip">
            {reports.filter(report => report.status === 'Pending').length} pending review
          </span>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-grid">
          <label className="field-shell">
            <span className="field-label">Search reports</span>
            <div className="field-input-wrap">
              <Search size={18} className="field-icon" />
              <input
                className="field-input with-icon"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Reason, content, or reporter UID"
              />
            </div>
          </label>

          <label className="field-shell">
            <span className="field-label">Status</span>
            <select className="field-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>
        </div>
      </section>

      <section className="content-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Report queue</p>
            <h2 className="panel-title">{filteredReports.length} report records</h2>
            <p className="panel-subtitle">Review first, resolve second, delete only when the record itself should be removed.</p>
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
        ) : filteredReports.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No reports in this filter</p>
            <p className="empty-copy">You&apos;re either caught up or filtering too narrowly.</p>
          </div>
        ) : (
          <div className="list-stack">
            {filteredReports.map(report => (
              <article className="list-row" key={report.id}>
                <div className="row-main">
                  <div className="badge-row">
                    <span className="status-badge" data-tone="mustard">
                      {report.reason || 'Unknown reason'}
                    </span>
                    <span className="status-badge" data-tone={getStatusTone(report.status || 'Pending')}>
                      {report.status || 'Pending'}
                    </span>
                  </div>

                  <p className="row-title" style={{ marginTop: 12 }}>
                    Reported by {report.reporterId || report.userId || 'Unknown reporter'}
                  </p>
                  {report.description ? <p className="row-copy">{report.description}</p> : null}
                  {report.postContent ? (
                    <div className="content-panel" style={{ marginTop: 14, background: '#fffaf0', padding: 16 }}>
                      <p className="eyebrow">Reported post snapshot</p>
                      <p className="row-copy">{report.postContent}</p>
                    </div>
                  ) : null}

                  <div className="row-meta">
                    <span className="meta-pill">
                      <ShieldAlert size={14} />
                      <span>Post ID {report.postId || 'N/A'}</span>
                    </span>
                    <span className="meta-pill">
                      <span>
                        {report.reportedAt?.toDate
                          ? format(report.reportedAt.toDate(), 'MMM d, yyyy h:mm a')
                          : 'Unknown time'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="row-actions">
                  {report.status === 'Pending' ? (
                    <button
                      className="action-mini"
                      data-tone="info"
                      onClick={() => handleStatusUpdate(report, 'Reviewed')}
                    >
                      <Eye size={16} />
                    </button>
                  ) : null}
                  {report.status !== 'Resolved' ? (
                    <button
                      className="action-mini"
                      data-tone="success"
                      onClick={() => handleStatusUpdate(report, 'Resolved')}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  ) : null}
                  <button className="action-mini" data-tone="danger" onClick={() => handleDelete(report)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={confirmModal.action}
        title="Confirm moderation action"
        message="This updates the shared moderation record used by the mobile app and admin console."
        confirmText="Continue"
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

export default Reports;
