import React, { useMemo } from 'react';
import { FaCalendarAlt, FaCheck, FaChevronDown, FaChevronUp, FaPlus, FaTrash } from 'react-icons/fa';
import Avatar from '../Avatar';
import './TodoListPanel.css';

const formatShortDate = (date) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getDateTone = (date) => {
  if (!date) return 'none';
  const today = new Date();
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return 'none';
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'future';
};

function TodoListPanel({
  todos = [],
  draftValue,
  onDraftChange,
  onAdd,
  onToggle,
  onUpdateText,
  onUpdateDueDate,
  onMoveUp,
  onMoveDown,
  onDelete,
  editingTodoId,
  editingTodoTitle,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  userById = {}
}) {
  const totalCount = todos.length;
  const completedCount = useMemo(() => todos.filter((todo) => todo.is_done).length, [todos]);
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const showAllDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="todo-panel">
      <div className="todo-panel-header">
        <div className="todo-panel-title">
          <span>Do</span>
          <div className="todo-panel-progress">
            <span>{completedCount}/{totalCount} done</span>
            <div className="todo-panel-progress-bar">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {showAllDone && (
        <div className="todo-panel-celebrate">Nice — you cleared this test’s tasks ✨</div>
      )}

      <div className="todo-panel-composer">
        <div className="todo-panel-composer-input">
          <FaPlus />
          <input
            value={draftValue}
            placeholder="Add a to-do…"
            maxLength={120}
            onChange={(event) => onDraftChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAdd?.();
              }
            }}
          />
        </div>
        <button type="button" className="todo-panel-add" onClick={() => onAdd?.()}>
          <FaPlus />
          Add
        </button>
      </div>

      {todos.length === 0 ? (
        <div className="todo-panel-empty">No to-dos yet.</div>
      ) : (
        <div className="todo-panel-list">
          {todos.map((todo, index) => {
            const todoAssignee =
              userById[todo.assignee_id || todo.assigneeId || todo.owner_id || todo.owner];
            const dateTone = getDateTone(todo.due_date);
            const dateLabel = formatShortDate(todo.due_date);
            return (
              <div key={todo.id} className={`todo-pill-row ${todo.is_done ? 'done' : ''}`}>
                <label className="todo-pill-check">
                  <input
                    type="checkbox"
                    checked={todo.is_done}
                    onChange={() => onToggle?.(todo)}
                    aria-label={`Toggle ${todo.title}`}
                  />
                  <span className="todo-pill-checkmark">
                    <FaCheck />
                  </span>
                </label>

                <div className="todo-pill-content">
                  {editingTodoId === todo.id ? (
                    <input
                      className="todo-pill-input"
                      value={editingTodoTitle}
                      onChange={(event) => onEditChange?.(event.target.value)}
                      onBlur={() => onCommitEdit?.(todo.id, editingTodoTitle)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onCommitEdit?.(todo.id, editingTodoTitle);
                        }
                        if (event.key === 'Escape') {
                          onCancelEdit?.();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`todo-pill-title ${todo.is_done ? 'done' : ''}`}
                      onClick={() => onStartEdit?.(todo)}
                    >
                      {todo.title}
                    </button>
                  )}
                  {todoAssignee && (
                    <div className="todo-pill-assignee">
                      <Avatar user={todoAssignee} size={18} />
                    </div>
                  )}
                </div>

                <div className="todo-pill-meta">
                  <label className={`todo-date-pill ${dateTone}`}>
                    <FaCalendarAlt />
                    <span>{dateLabel || 'Add date'}</span>
                    <input
                      type="date"
                      value={todo.due_date || ''}
                      onChange={(event) => onUpdateDueDate?.(todo.id, event.target.value)}
                      aria-label="Set due date"
                    />
                  </label>
                  <div className="todo-row-actions">
                    <button
                      type="button"
                      onClick={() => onMoveUp?.(todo.id)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <FaChevronUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDown?.(todo.id)}
                      disabled={index === todos.length - 1}
                      aria-label="Move down"
                    >
                      <FaChevronDown />
                    </button>
                    <button type="button" onClick={() => onDelete?.(todo.id)} aria-label="Delete todo">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TodoListPanel;
