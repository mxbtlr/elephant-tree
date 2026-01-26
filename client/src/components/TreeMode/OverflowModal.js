import React, { useMemo, useState } from 'react';
import { allowedChildren, nodeTypeLabels } from '../../lib/ostTypes';
import './TreeMode.css';

function OverflowModal({ parentType, hiddenChildren, onClose, onSelect, onAddChild }) {
  const [query, setQuery] = useState('');
  const childType = parentType ? allowedChildren[parentType]?.[0] : null;
  const filtered = useMemo(() => {
    if (!query) return hiddenChildren;
    return hiddenChildren.filter((child) =>
      child.title?.toLowerCase().includes(query.toLowerCase())
    );
  }, [hiddenChildren, query]);

  return (
    <div className="overflow-modal-backdrop" onClick={onClose}>
      <div className="overflow-modal" onClick={(event) => event.stopPropagation()}>
        <div className="overflow-modal-header">
          <div>
            Hidden items ({hiddenChildren.length})
          </div>
          <div className="overflow-modal-actions">
            {childType && (
              <button type="button" onClick={() => onAddChild?.(childType)}>
                Add {nodeTypeLabels[childType]}
              </button>
            )}
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <input
          className="overflow-search"
          placeholder="Search hidden items"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="overflow-list">
          {filtered.map((child) => (
            <button
              key={child.key}
              type="button"
              className="overflow-item"
              onClick={() => {
                onSelect?.({ type: child.type, id: child.id });
                onClose();
              }}
            >
              <span className="overflow-item-type">{nodeTypeLabels[child.type]}</span>
              <span className="overflow-item-title">{child.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OverflowModal;
