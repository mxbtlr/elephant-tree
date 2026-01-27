import React, { useMemo, useState } from 'react';
import './CommandPalette.css';

function CommandPalette({ isOpen, nodes, onClose, onSelect }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return nodes.slice(0, 12);
    return nodes
      .filter((node) => node.title?.toLowerCase().includes(trimmed))
      .slice(0, 12);
  }, [nodes, query]);

  if (!isOpen) return null;

  return (
    <div className="command-backdrop" onClick={onClose}>
      <div className="command-modal" onClick={(event) => event.stopPropagation()}>
        <div className="command-title">Jump to…</div>
        <input
          className="command-input-field"
          autoFocus
          placeholder="Search nodes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="command-results">
          {results.map((node) => (
            <button
              key={node.key}
              type="button"
              className="command-result"
              onClick={() => {
                onSelect?.(node.key);
                setQuery('');
              }}
            >
              <span>{node.title || 'Untitled'}</span>
              <span className="command-type">{node.type}</span>
            </button>
          ))}
          {results.length === 0 && <div className="command-empty">No matches.</div>}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
