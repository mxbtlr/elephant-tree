import React from 'react';
import { Handle, Position } from 'reactflow';
import { FaRoute } from 'react-icons/fa';
import { useOstStore } from '../../../store/useOstStore';

function JourneyNode({ data }) {
  const { state, actions } = useOstStore();
  const isSelected = state.selectedKey === data.nodeKey;
  const isCollapsed = state.collapsed?.[data.nodeKey];
  const node = data.node || {};
  const count = node.count ?? 0;
  const isUnassigned = node.isUnassigned === true;

  return (
    <div
      className={`tree-node tree-node-journey ${isSelected ? 'selected' : ''} ${isUnassigned ? 'journey-unassigned' : ''}`}
      style={{
        borderColor: isUnassigned ? 'rgba(234, 179, 8, 0.4)' : 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        borderStyle: 'solid'
      }}
      onClick={(e) => {
        e.stopPropagation();
        data.onSelect?.(data.nodeKey);
      }}
    >
      <Handle type="target" position={Position.Left} className="tree-node-handle" />
      <Handle type="source" position={Position.Right} className="tree-node-handle" />
      <div className="tree-node-journey-inner">
        <button
          type="button"
          className="tree-node-journey-collapse"
          onClick={(e) => {
            e.stopPropagation();
            actions.toggleCollapse(data.nodeKey);
          }}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <span className="tree-node-journey-chevron">{isCollapsed ? '▶' : '▼'}</span>
        </button>
        <span className="tree-node-journey-icon" style={{ color: 'var(--journey-accent, #64748b)' }}>
          <FaRoute />
        </span>
        <span className="tree-node-journey-title" title={isUnassigned ? 'Assign a journey stage to move these opportunities' : undefined}>
          {node.title}
        </span>
        <span className="tree-node-journey-count">{count}</span>
        {data.onAddChild && (
          <button
            type="button"
            className="tree-node-journey-add"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddChild(data.nodeKey, 'opportunity');
            }}
            aria-label="Add opportunity"
            title="Add opportunity"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export default JourneyNode;
