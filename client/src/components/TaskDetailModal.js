import React, { useState, useEffect } from 'react';
import { FaTimes, FaTrash } from 'react-icons/fa';

function TaskDetailModal({ task, onSave, onDelete, onClose, currentUser, users = [] }) {
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || currentUser?.id || '');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setDueDate(task.dueDate || '');
      setAssigneeId(task.assignee_id || currentUser?.id || '');
    }
  }, [task, currentUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      notes: notes.trim() || null,
      status,
      priority: priority === 'medium' ? null : priority,
      dueDate: dueDate || null,
      assigneeId: assigneeId || null
    });
  };

  const handleDelete = () => {
    if (window.confirm('Delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail-header">
          <h3>Task Details</h3>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-detail-form">
          <div className="task-detail-field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              required
              autoFocus
            />
          </div>

          <div className="task-detail-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">To Do</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="task-detail-row">
            <div className="task-detail-field">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="task-detail-field">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="task-detail-field">
            <label>Assignee</label>
            <select 
              value={assigneeId} 
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="task-detail-field">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={4}
            />
          </div>

          <div className="task-detail-actions">
            <button type="submit" className="btn-primary">Save</button>
            <button 
              type="button" 
              onClick={handleDelete} 
              className="btn-danger"
            >
              <FaTrash /> Delete
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskDetailModal;
