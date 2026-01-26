import React, { useState } from 'react';
import { FaCheckCircle, FaCircle, FaExclamationCircle, FaPauseCircle, FaEdit } from 'react-icons/fa';
import TaskComposer from './TaskComposer';
import TaskDetailModal from './TaskDetailModal';
import api from '../services/supabaseApi';

function TaskList({ campaignId, tasks, onUpdate, currentUser, users = [] }) {
  const [filter, setFilter] = useState('all'); // all, open, done
  const [editingTaskId, setEditingTaskId] = useState(null);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'open') return task.status !== 'done';
    if (filter === 'done') return task.status === 'done';
    return true;
  });

  const handleTaskCreate = async (taskData) => {
    try {
      await api.createTask(campaignId, taskData);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleTaskToggle = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await api.updateTask(task.id, { status: newStatus });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskUpdate = async (taskId, data) => {
    try {
      await api.updateTask(taskId, data);
      setEditingTaskId(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <FaCheckCircle className="task-icon task-icon-done" />;
      case 'doing':
        return <FaExclamationCircle className="task-icon task-icon-doing" />;
      case 'blocked':
        return <FaPauseCircle className="task-icon task-icon-blocked" />;
      default:
        return <FaCircle className="task-icon task-icon-todo" />;
    }
  };

  const getPriorityClass = (priority) => {
    if (!priority) return '';
    return `task-priority task-priority-${priority}`;
  };

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? user.name : null;
  };

  return (
    <div className="task-list">
      <div className="task-list-header">
        <div className="task-filters">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({tasks.length})
          </button>
          <button 
            className={filter === 'open' ? 'active' : ''}
            onClick={() => setFilter('open')}
          >
            Open ({tasks.filter(t => t.status !== 'done').length})
          </button>
          <button 
            className={filter === 'done' ? 'active' : ''}
            onClick={() => setFilter('done')}
          >
            Done ({tasks.filter(t => t.status === 'done').length})
          </button>
        </div>
      </div>

      <TaskComposer onSave={handleTaskCreate} />

      <div className="tasks-container">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            {filter === 'done' ? 'No completed tasks' : 'No tasks yet'}
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task.id} 
              className={`task-item ${task.status === 'done' ? 'done' : ''} ${getPriorityClass(task.priority)}`}
            >
              <button
                className="task-checkbox"
                onClick={() => handleTaskToggle(task)}
                title={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
              >
                {getStatusIcon(task.status)}
              </button>
              
              <div 
                className="task-content"
                onClick={() => setEditingTaskId(task.id)}
              >
                <div className="task-title">{task.title}</div>
                {(task.notes || task.assignee_id || task.dueDate) && (
                  <div className="task-meta">
                    {task.assignee_id && (
                      <span className="task-assignee">
                        {getUserName(task.assignee_id)}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="task-due">
                        Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {task.priority && task.priority !== 'medium' && (
                <span className={`priority-dot priority-${task.priority}`} title={`${task.priority} priority`} />
              )}
            </div>
          ))
        )}
      </div>

      {editingTaskId && (
        <TaskDetailModal
          task={filteredTasks.find(t => t.id === editingTaskId)}
          onSave={handleTaskUpdate}
          onDelete={handleTaskDelete}
          onClose={() => setEditingTaskId(null)}
          currentUser={currentUser}
          users={users}
        />
      )}
    </div>
  );
}

export default TaskList;
