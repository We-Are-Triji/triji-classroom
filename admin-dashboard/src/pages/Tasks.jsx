import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { CalendarDays, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { deleteTask, saveTask } from '../lib/adminApi';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

function formatTaskDate(value) {
  if (!value) {
    return 'No deadline';
  }

  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'No deadline' : format(date, 'MMM d, yyyy');
}

const initialForm = {
  title: '',
  details: '',
  subjectId: '',
  deadline: '',
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', details: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), snapshot => {
        setTasks(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, 'subjects'), orderBy('subjectCode', 'asc')), snapshot => {
        setSubjects(snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })));
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const searchValue = searchTerm.toLowerCase();
      const matchesSearch =
        !searchValue ||
        task.title?.toLowerCase().includes(searchValue) ||
        task.details?.toLowerCase().includes(searchValue) ||
        task.description?.toLowerCase().includes(searchValue) ||
        task.subjectName?.toLowerCase().includes(searchValue) ||
        task.subjectCode?.toLowerCase().includes(searchValue);

      const matchesSubject =
        selectedSubject === 'All' ||
        task.subjectId === selectedSubject ||
        task.subjectCode === selectedSubject;

      return matchesSearch && matchesSubject;
    });
  }, [searchTerm, selectedSubject, tasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = task => {
    const deadlineDate = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);

    setEditingTask(task);
    setFormData({
      title: task.title || '',
      details: task.details || task.description || '',
      subjectId: task.subjectId || '',
      deadline:
        task.deadline && !Number.isNaN(deadlineDate.getTime())
          ? deadlineDate.toISOString().split('T')[0]
          : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const subject = subjects.find(entry => entry.id === formData.subjectId);
    if (!subject) {
      setErrorModal({
        isOpen: true,
        title: 'Subject required',
        message: 'Choose a subject before saving this task.',
        details: '',
      });
      return;
    }

    setSubmitting(true);

    try {
      await saveTask({
        taskId: editingTask?.id,
        title: formData.title,
        details: formData.details,
        subjectId: subject.id,
        subjectName: subject.subjectName || subject.name || '',
        subjectCode: subject.subjectCode || subject.code || '',
        deadline: formData.deadline,
      });

      setSuccessModal({
        isOpen: true,
        message: editingTask ? 'Task updated successfully.' : 'Task created successfully.',
      });
      setShowModal(false);
      setEditingTask(null);
      setFormData(initialForm);
    } catch (error) {
      console.error('Failed to save task:', error);
      setErrorModal({
        isOpen: true,
        title: 'Could not save task',
        message: 'The task was not saved. Please review the form and try again.',
        details: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = task => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        try {
          await deleteTask(task.id);
          setSuccessModal({ isOpen: true, message: 'Task removed successfully.' });
        } catch (error) {
          console.error('Failed to delete task:', error);
          setErrorModal({
            isOpen: true,
            title: 'Could not delete task',
            message: 'The task is still live because the delete request failed.',
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
          <p className="eyebrow">Task board</p>
          <h1 className="page-title">Compact task management for the same student board.</h1>
          <p className="page-subtitle">
            New tasks follow the mobile app schema now, so the admin dashboard stops writing a competing shape.
          </p>
        </div>
        <div className="hero-actions">
          <button className="action-button" onClick={openCreateModal}>
            <Plus size={18} />
            <span>New task</span>
          </button>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-grid">
          <label className="field-shell">
            <span className="field-label">Search tasks</span>
            <div className="field-input-wrap">
              <Search size={18} className="field-icon" />
              <input
                className="field-input with-icon"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Title, details, or subject"
              />
            </div>
          </label>

          <label className="field-shell">
            <span className="field-label">Filter by subject</span>
            <select
              className="field-select"
              value={selectedSubject}
              onChange={event => setSelectedSubject(event.target.value)}
            >
              <option value="All">All subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {(subject.subjectCode || subject.code || 'SUBJ').toUpperCase()} •{' '}
                  {subject.subjectName || subject.name || 'Untitled subject'}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="content-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Task log</p>
            <h2 className="panel-title">{filteredTasks.length} task entries</h2>
            <p className="panel-subtitle">The list stays intentionally concise so large boards remain readable.</p>
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
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No tasks match this view</p>
            <p className="empty-copy">Try a different subject filter or create a new task.</p>
          </div>
        ) : (
          <div className="list-stack">
            {filteredTasks.map(task => (
              <article className="list-row" key={task.id}>
                <div className="row-main">
                  <div className="badge-row">
                    <span className="status-badge" data-tone="teal">
                      {task.subjectCode || 'SUBJ'}
                    </span>
                    <span className="status-badge" data-tone="mustard">
                      {Array.isArray(task.completedBy) ? task.completedBy.length : 0} completed
                    </span>
                  </div>
                  <p className="row-title" style={{ marginTop: 12 }}>
                    {task.title || 'Untitled task'}
                  </p>
                  {(task.details || task.description) ? (
                    <p className="row-copy">{task.details || task.description}</p>
                  ) : null}
                  <div className="row-meta">
                    <span className="meta-pill">
                      <CalendarDays size={14} />
                      <span>{formatTaskDate(task.deadline)}</span>
                    </span>
                    <span className="meta-pill">{task.subjectName || 'No subject name'}</span>
                  </div>
                </div>

                <div className="row-actions">
                  <button className="action-mini" data-tone="info" onClick={() => openEditModal(task)}>
                    <Pencil size={16} />
                  </button>
                  <button className="action-mini" data-tone="danger" onClick={() => handleDelete(task)}>
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
                <p className="eyebrow">{editingTask ? 'Edit task' : 'Create task'}</p>
                <h2 className="modal-title">{editingTask ? 'Update task details' : 'Add a new task'}</h2>
                <p className="modal-copy">Keep the entry tight. Students will see the full details in the mobile view.</p>
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
                    placeholder="Midterm review packet"
                    required
                  />
                </label>

                <label className="field-shell">
                  <span className="field-label">Subject</span>
                  <select
                    className="field-select"
                    value={formData.subjectId}
                    onChange={event => setFormData(previous => ({ ...previous, subjectId: event.target.value }))}
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {(subject.subjectCode || subject.code || 'SUBJ').toUpperCase()} •{' '}
                        {subject.subjectName || subject.name || 'Untitled subject'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field-shell">
                <span className="field-label">Details</span>
                <textarea
                  className="field-textarea"
                  value={formData.details}
                  onChange={event => setFormData(previous => ({ ...previous, details: event.target.value }))}
                  placeholder="Add the full instructions students need."
                />
              </label>

              <label className="field-shell">
                <span className="field-label">Deadline</span>
                <input
                  className="field-input"
                  type="date"
                  value={formData.deadline}
                  onChange={event => setFormData(previous => ({ ...previous, deadline: event.target.value }))}
                  required
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-button" disabled={submitting}>
                  {submitting ? 'Saving…' : editingTask ? 'Update task' : 'Create task'}
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
        title="Delete task"
        message="This task will disappear from the student board immediately."
        confirmText="Delete task"
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

export default Tasks;
