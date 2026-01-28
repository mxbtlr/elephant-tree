import React from 'react';

function TodoProgress({ completed = 0, total = 0 }) {
  if (!total) {
    return <div className="todo-progress-empty">—</div>;
  }
  const percent = Math.min(100, Math.round((completed / total) * 100));
  return (
    <div className="todo-progress-ring" style={{ '--percent': percent }}>
      <span>{percent}%</span>
    </div>
  );
}

export default TodoProgress;
