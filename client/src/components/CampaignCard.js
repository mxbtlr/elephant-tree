import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronRight, FaEdit, FaTrash, FaCalendarAlt } from 'react-icons/fa';
import TaskList from './TaskList';
import api from '../services/supabaseApi';

function CampaignCard({ campaign, onUpdate, onDelete, onTaskUpdate, currentUser, users = [], isExpanded, onToggleExpanded }) {
  const [expanded, setExpanded] = useState(isExpanded || false);
  const [editing, setEditing] = useState(false);

  // Sync local state with prop when it changes
  useEffect(() => {
    if (isExpanded !== undefined) {
      setExpanded(isExpanded);
    }
  }, [isExpanded]);

  const handleSave = async (data) => {
    await onUpdate(campaign.id, data);
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete sprint "${campaign.title}" and all its tasks?`)) {
      onDelete(campaign.id);
    }
  };

  const tasks = campaign.tasks || [];
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`campaign-card ${expanded ? 'expanded' : ''}`}>
      <div className="campaign-card-header" onClick={() => {
        const newExpanded = !expanded;
        setExpanded(newExpanded);
        if (onToggleExpanded) onToggleExpanded();
      }}>
        <button 
          className="campaign-expand-toggle"
          onClick={(e) => {
            e.stopPropagation();
            const newExpanded = !expanded;
            setExpanded(newExpanded);
            if (onToggleExpanded) onToggleExpanded();
          }}
        >
          {expanded ? <FaChevronDown /> : <FaChevronRight />}
        </button>
        
        <div className="campaign-card-main">
          {editing ? (
            <CampaignEditForm
              campaign={campaign}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="campaign-card-title">{campaign.title}</div>
              <div className="campaign-card-meta">
                <span className={`status-badge status-${campaign.status}`}>
                  {campaign.status}
                </span>
                {campaign.startDate && (
                  <span className="campaign-date">
                    <FaCalendarAlt /> {formatDate(campaign.startDate)}
                    {campaign.endDate && ` - ${formatDate(campaign.endDate)}`}
                  </span>
                )}
                <div className="campaign-task-count">
                  <span className="task-count-text">{openTasks} open</span>
                  {totalTasks > 0 && (
                    <div className="task-progress-bar">
                      <div 
                        className="task-progress-fill" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="campaign-card-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="action-btn"
              onClick={() => setEditing(true)}
              title="Edit sprint"
            >
              <FaEdit />
            </button>
            <button 
              className="action-btn danger"
              onClick={handleDelete}
              title="Delete sprint"
            >
              <FaTrash />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="campaign-card-content">
          {campaign.description && (
            <div className="campaign-description">{campaign.description}</div>
          )}
          <TaskList
            campaignId={campaign.id}
            tasks={tasks}
            onUpdate={onTaskUpdate}
            currentUser={currentUser}
            users={users}
          />
        </div>
      )}
    </div>
  );
}

function CampaignEditForm({ campaign, onSave, onCancel }) {
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description || '');
  const [status, setStatus] = useState(campaign.status);
  const [startDate, setStartDate] = useState(campaign.startDate || '');
  const [endDate, setEndDate] = useState(campaign.endDate || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="campaign-edit-form" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="campaign-edit-input"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="campaign-edit-textarea"
      />
      <div className="campaign-edit-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="done">Done</option>
          <option value="archived">Archived</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End date"
        />
      </div>
      <div className="campaign-edit-actions">
        <button type="submit" className="btn-primary-small">Save</button>
        <button type="button" onClick={onCancel} className="btn-secondary-small">Cancel</button>
      </div>
    </form>
  );
}

export default CampaignCard;
