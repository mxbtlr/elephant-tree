import React, { useState, useRef, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';

function TaskComposer({ onSave }) {
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setExpanded(false);
      return;
    }
    onSave({ title: title.trim() });
    setTitle('');
    setExpanded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setTitle('');
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <button 
        className="task-composer-trigger"
        onClick={() => setExpanded(true)}
      >
        <FaPlus /> Add a task...
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="task-composer">
      <input
        ref={inputRef}
        type="text"
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay to allow submit to fire first
          setTimeout(() => {
            if (!title.trim()) {
              setExpanded(false);
            }
          }, 200);
        }}
        className="task-composer-input"
      />
    </form>
  );
}

export default TaskComposer;
