import React, { useMemo, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import Avatar from '../Avatar';
import TodoProgress from './TodoProgress';

const getTestTypeLabel = (type) => {
  const labels = {
    interview: 'Interview',
    cold_outreach: 'Cold Outreach',
    pricing: 'Pricing',
    prototype_usability: 'Prototype',
    custom: 'Test'
  };
  return labels[type] || 'Test';
};

function TodoTestCard({
  group,
  testMeta,
  users = [],
  onOpenTest,
  onToggleTodo,
  onAssignOwner,
  expanded = false,
  onToggleExpand,
  toastMessageById = {},
  isHighlighted = false
}) {
  const [showAssign, setShowAssign] = useState(false);
  const todos = group.todos || [];
  const completedCount = todos.filter((todo) => todo.is_done).length;
  const totalCount = todos.length;
  const showCompleted = totalCount > 0 && completedCount === totalCount;
  const whyText = useMemo(() => {
    if (testMeta?.description && testMeta.description.length <= 90) {
      return testMeta.description;
    }
    return 'Validate this assumption before scaling.';
  }, [testMeta?.description]);
  const ownerUser = testMeta?.ownerUser || null;
  const visibleTodos = expanded ? todos : todos.slice(0, 3);
  const remaining = totalCount - visibleTodos.length;
  const testTypeLabel = getTestTypeLabel(testMeta?.testType);
  const breadcrumb = testMeta?.breadcrumb || '';
  const title = group.experimentTitle || testMeta?.title || 'Experiment';

  return (
    <div className={`todo-test-card ${isHighlighted ? 'highlight' : ''}`}>
      <button type="button" className="todo-test-card-header" onClick={() => onOpenTest?.(group.experimentId)}>
        <div className="todo-test-card-title">
          <span>{title}</span>
          {showCompleted && <span className="todo-test-card-complete">Completed ✨</span>}
        </div>
        <div className="todo-test-card-meta">
          <span className="todo-test-card-badge">{testTypeLabel}</span>
          {breadcrumb && <span className="todo-test-card-breadcrumb">{breadcrumb}</span>}
        </div>
        <div className="todo-test-card-why">{whyText}</div>
      </button>
      <div className="todo-test-card-progress">
        <TodoProgress completed={completedCount} total={totalCount} />
      </div>
      <div className="todo-test-card-owner">
        {ownerUser ? (
          <button type="button" className="todo-owner-btn" onClick={() => setShowAssign((prev) => !prev)}>
            <Avatar user={ownerUser} size={22} isOwner />
          </button>
        ) : (
          <button type="button" className="todo-owner-btn assign" onClick={() => setShowAssign((prev) => !prev)}>
            <FaPlus />
            <span>Assign</span>
          </button>
        )}
        {showAssign && (
          <select
            className="todo-assign-select"
            value={ownerUser?.id || ''}
            onChange={(event) => {
              setShowAssign(false);
              onAssignOwner?.(group.experimentId, event.target.value || null);
            }}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="todo-test-card-list">
        {visibleTodos.map((todo) => (
          <label key={todo.id} className={`todo-test-item ${todo.is_done ? 'done' : ''}`}>
            <input
              type="checkbox"
              checked={todo.is_done}
              onChange={() => onToggleTodo?.(todo)}
              aria-label={`Toggle ${todo.title}`}
            />
            <span className="todo-test-item-title">{todo.title}</span>
            {toastMessageById[todo.id] && (
              <span className="todo-test-item-toast">{toastMessageById[todo.id]}</span>
            )}
          </label>
        ))}
        {remaining > 0 && (
          <button type="button" className="todo-test-more" onClick={onToggleExpand}>
            +{remaining} more
          </button>
        )}
      </div>
    </div>
  );
}

export default TodoTestCard;
