import React, { useMemo } from 'react';
import { FaChevronDown, FaChevronRight, FaPlus } from 'react-icons/fa';
import { allowedChildren, nodeTypeLabels } from '../../lib/ostTypes';
import ConfidenceBadge from '../badges/ConfidenceBadge';
import { buildOstForest } from '../../lib/ostTree';
import { useOstStore } from '../../store/useOstStore';
import './ListMode.css';

function ListModeView({ outcomes, onUpdate, confidenceMap, onAddOutcome, isCreatingOutcome = false }) {
  const {
    state: { collapsed, selectedKey, nodeOverrides, renamingKey },
    actions: { setSelectedKey, toggleCollapse, setRenamingKey }
  } = useOstStore();

  const forest = useMemo(() => {
    if (!outcomes || outcomes.length === 0) return null;
    return buildOstForest(outcomes, nodeOverrides);
  }, [outcomes, nodeOverrides]);

  return (
    <div className="list-mode-view">
      {!forest ? (
        <div className="empty-state compact">
          <p>This Decision Space has no Outcomes yet.</p>
          <button type="button" className="tree-empty-cta" onClick={onAddOutcome} disabled={isCreatingOutcome}>
            {isCreatingOutcome ? 'Creating…' : 'Add first Outcome'}
          </button>
        </div>
      ) : (
        <div className="list-tree">
          {forest.roots.map((root) => (
            <ListNode
              key={root.key}
              node={root}
              depth={0}
              collapsed={collapsed}
              selectedKey={selectedKey}
              renamingKey={renamingKey}
              onSelect={setSelectedKey}
              onToggleCollapse={toggleCollapse}
              onRename={(key, title) => onUpdate?.('rename', { nodeKey: key, title })}
              onAddChild={(key, childType) => {
                onUpdate?.('add-child', { parentKey: key, childType });
              }}
              onSetRenaming={setRenamingKey}
              confidenceMap={confidenceMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListNode({
  node,
  depth,
  collapsed,
  selectedKey,
  renamingKey,
  onSelect,
  onToggleCollapse,
  onRename,
  onAddChild,
  onSetRenaming,
  confidenceMap
}) {
  const isCollapsed = collapsed[node.key];
  const isSelected = selectedKey === node.key;
  const isRenaming = renamingKey === node.key;
  const canAdd = allowedChildren[node.type]?.length > 0;
  const hasChildren = node.children?.length > 0;
  const handleAddChild = (childType) => {
    if (collapsed[node.key]) {
      onToggleCollapse(node.key);
    }
    onAddChild(node.key, childType);
  };
  const commitRename = (value) => {
    const next = value.trim();
    if (!next) return;
    onRename(node.key, next);
    onSetRenaming(null);
  };

  return (
    <div className={`list-node list-node-${node.type}`}>
      <div
        className={`list-node-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 18}px` }}
        onClick={() => onSelect(node.key)}
      >
        {hasChildren ? (
          <button
            className="list-node-toggle"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse(node.key);
            }}
          >
            {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
          </button>
        ) : (
          <span className="list-node-toggle spacer" />
        )}

        {isRenaming ? (
          <input
            className="list-node-input"
            defaultValue={node.title}
            autoFocus
            onBlur={(event) => commitRename(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitRename(event.currentTarget.value);
              }
              if (event.key === 'Escape') {
                onSetRenaming(null);
              }
            }}
          />
        ) : (
          <span className="list-node-title">{node.title}</span>
        )}

        {(node.type === 'opportunity' || node.type === 'solution') && confidenceMap?.[node.key] && (
          <ConfidenceBadge confidence={confidenceMap[node.key]} showExplanation />
        )}

        {canAdd && (
          <button
            className="list-node-action"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleAddChild(allowedChildren[node.type][0]);
            }}
          >
            <FaPlus />
            {nodeTypeLabels[allowedChildren[node.type][0]]}
          </button>
        )}

        <button
          className="list-node-action secondary"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSetRenaming(node.key);
          }}
        >
          Rename
        </button>
      </div>

      {!isCollapsed && hasChildren && (
        <div className="list-node-children">
          {node.children.map((child) => (
            <ListNode
              key={child.key}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              selectedKey={selectedKey}
              renamingKey={renamingKey}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
              onRename={onRename}
              onAddChild={onAddChild}
              onSetRenaming={onSetRenaming}
              confidenceMap={confidenceMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ListModeView;
