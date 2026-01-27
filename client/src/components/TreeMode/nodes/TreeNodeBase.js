import React, { useEffect, useRef } from 'react';
import { Handle, Position, useStore } from 'reactflow';
import { allowedChildren, nodeTypeLabels } from '../../../lib/ostTypes';
import { ostTokens } from '../../../lib/ui/tokens';
import ConfidenceBadge from '../../badges/ConfidenceBadge';
import { useOstStore } from '../../../store/useOstStore';
import { TEST_TEMPLATES, getTemplateByKey } from '../../../lib/tests/templates';
import { FaTrash } from 'react-icons/fa';

const zoomSelector = (state) => state.transform[2];

function TreeNodeBase({ data }) {
  const zoom = useStore(zoomSelector);
  const { state, actions } = useOstStore();
  const inputRef = useRef(null);

  const isSelected = state.selectedKey === data.nodeKey;
  const isRenaming = state.renamingKey === data.nodeKey;
  const childTypes = allowedChildren[data.type] || [];

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameCommit = async (value) => {
    if (!value.trim()) return;
    data.onRename?.(data.nodeKey, value.trim());
    actions.setRenamingKey(null);
  };

  const handleDelete = () => {
    const confirmed = window.confirm('Delete this node and its children?');
    if (!confirmed) return;
    data.onDelete?.(data.nodeKey);
  };

  const zoomLevel = zoom < 0.7 ? 'compact' : zoom < 1 ? 'medium' : 'expanded';
  const typeTokens = ostTokens.type[data.type] || {};
  const testTypeLabel = (() => {
    if (data.type !== 'test') return null;
    const typeLabels = {
      interview: 'Interview',
      cold_outreach: 'Cold Outreach',
      pricing: 'Pricing',
      prototype_usability: 'Prototype Usability',
      custom: 'Custom'
    };
    if (data.testType && typeLabels[data.testType]) {
      return typeLabels[data.testType];
    }
    const template = getTemplateByKey(data.testTemplate);
    if (template) return template.label;
    if (data.title) {
      const normalized = data.title.trim().toLowerCase();
      const match = TEST_TEMPLATES.find(
        (item) =>
          item.label.toLowerCase() === normalized ||
          item.defaultTitle.toLowerCase() === normalized
      );
      if (match) return match.label;
    }
    return 'Custom';
  })();

  const baseStyle = {
    background: typeTokens.tint || '#fff',
    borderColor: isSelected ? typeTokens.accent : 'transparent',
    boxShadow: isSelected ? ostTokens.node.shadowSelected : ostTokens.node.shadow,
    '--node-accent': typeTokens.accent || '#64748b'
  };

  return (
    <div
      className={`tree-node tree-node-${data.type} tree-node-${zoomLevel} ${
        isSelected ? 'selected' : ''
      } ${data.isDimmed ? 'dimmed' : ''}`}
      style={baseStyle}
      onClick={(event) => {
        event.stopPropagation();
        data.onSelect?.(data.nodeKey);
      }}
    >
      <Handle type="target" position={Position.Left} className="tree-node-handle" />
      <Handle type="source" position={Position.Right} className="tree-node-handle" />
      <div className="tree-node-header">
        <span className="tree-node-icon" style={{ color: typeTokens.accent }}>
          {data.icon}
        </span>
        {isRenaming ? (
          <input
            ref={inputRef}
            className="tree-node-input"
            defaultValue={data.title}
            onBlur={(event) => handleRenameCommit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleRenameCommit(event.currentTarget.value);
              }
              if (event.key === 'Escape') {
                actions.setRenamingKey(null);
              }
            }}
          />
        ) : (
          <div className="tree-node-title" title={data.title}>
            {data.title}
          </div>
        )}
        {data.isCollapsed && data.childrenCount > 0 && (
          <span className="tree-node-count-pill">{data.childrenCount}</span>
        )}
      </div>

      {data.description && zoomLevel !== 'compact' && (
        <div className="tree-node-description" title={data.description}>
          {data.description}
        </div>
      )}

      {zoomLevel !== 'compact' && (
        <div className="tree-node-badges">
          {(data.type === 'opportunity' || data.type === 'solution') && data.confidence && (
            <ConfidenceBadge confidence={data.confidence} />
          )}
          {data.type === 'test' && (
            <>
              <span className="tree-node-pill tree-node-pill-type">
                {testTypeLabel}
              </span>
              <span className="tree-node-pill tree-node-pill-status">
                {(data.testStatus || 'planned').replace('_', ' ')}
              </span>
              <span className="tree-node-pill tree-node-pill-decision">
                {(data.resultDecision || 'undecided').replace('_', ' ')}
              </span>
              {typeof data.todoTotal === 'number' && data.todoTotal > 0 && (
                <span className="tree-node-pill tree-node-pill-todos">
                  {`${data.todoDone || 0}/${data.todoTotal}`}
                </span>
              )}
            </>
          )}
          {data.type !== 'test' && data.status && (
            <span className={`tree-node-badge status-${data.status}`}>{data.status}</span>
          )}
          {zoomLevel === 'expanded' && data.owner && (
            <span className="tree-node-badge owner">{data.ownerLabel}</span>
          )}
          {data.isCollapsed && data.childrenCount > 0 && (
            <span className="tree-node-badge count">{data.childrenCount}</span>
          )}
        </div>
      )}

      <div className="tree-node-actions">
        <button
          className="tree-node-action subtle"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
          type="button"
          aria-label="Delete node"
        >
          <FaTrash />
        </button>
        {data.hasChildren && (
          <button
            className="tree-node-action"
            onClick={(event) => {
              event.stopPropagation();
              data.onToggleCollapse?.(data.nodeKey);
            }}
            type="button"
          >
            {data.isCollapsed ? '▸' : '▾'}
          </button>
        )}
        {childTypes.length > 0 && (
          <div className="tree-node-add">
            <button
              className="tree-node-action"
              onClick={(event) => {
                event.stopPropagation();
                data.onToggleAdd?.(data.nodeKey);
              }}
              type="button"
            >
              +
            </button>
            {data.isAddOpen && (
              <div className="tree-node-add-menu">
                {childTypes.map((childType) => (
                  <button
                    key={childType}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onAddChild?.(data.nodeKey, childType);
                    }}
                  >
                    Add {nodeTypeLabels[childType]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TreeNodeBase;
