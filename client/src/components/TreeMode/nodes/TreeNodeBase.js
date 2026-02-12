import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from 'reactflow';
import { allowedChildren, nodeTypeLabels, getTestStatusLabel, normalizeTestStatus, normalizeResultDecision, getResultDecisionLabel } from '../../../lib/ostTypes';
import { ostTokens } from '../../../lib/ui/tokens';
import ConfidenceBadge from '../../badges/ConfidenceBadge';
import ConfidenceScorePill from '../../badges/ConfidenceScorePill';
import ConfidenceScorePopover from '../../ConfidenceScorePopover';
import { useOstStore } from '../../../store/useOstStore';
import { TEST_TEMPLATES, getTemplateByKey } from '../../../lib/tests/templates';
import { FaTrash } from 'react-icons/fa';
import Avatar, { AvatarGroup } from '../../Avatar';

const zoomSelector = (state) => state.transform[2];

const CONFIDENCE_NODE_TYPES = ['opportunity', 'solution'];

function TreeNodeBase({ data }) {
  const zoom = useStore(zoomSelector);
  const { state, actions } = useOstStore();
  const inputRef = useRef(null);
  const nodeRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [confidencePopoverOpen, setConfidencePopoverOpen] = useState(false);

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
  const testStatusValue = normalizeTestStatus(data.testStatus || data.status);
  const hasOpenTodos = typeof data.todoTotal === 'number' && data.todoTotal > 0 && (data.todoDone || 0) < data.todoTotal;
  const isDraft = testStatusValue === 'draft';
  const cannotDecideYet = hasOpenTodos || isDraft;
  const testDecisionValue = cannotDecideYet ? 'ongoing' : (normalizeResultDecision(data.resultDecision) || 'ongoing');

  const score = data.confidenceScore != null ? Number(data.confidenceScore) : null;
  const confidenceTier = score == null ? null : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  const baseStyle = {
    background: typeTokens.tint || '#fff',
    borderColor: isSelected ? 'var(--brand-600)' : 'transparent',
    boxShadow: isSelected ? ostTokens.node.shadowSelected : ostTokens.node.shadow,
    '--node-accent': typeTokens.accent || '#64748b'
  };
  const contributorUsers = data.contributorUsers || [];
  const showOwner = data.type === 'opportunity' || data.type === 'solution' || data.type === 'test';

  const showConfidenceMenu = CONFIDENCE_NODE_TYPES.includes(data.type);
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={nodeRef}
      className={`tree-node tree-node-${data.type} tree-node-${zoomLevel} ${
        isSelected ? 'selected' : ''
      } ${data.isDimmed ? 'dimmed' : ''} ${data.isSubOpportunity ? 'tree-node-sub-opportunity' : ''} ${data.isSubSolution ? 'tree-node-sub-solution' : ''} ${
        confidenceTier ? `tree-node-confidence-${confidenceTier}` : ''
      } ${data.type === 'solution' && data.hasPassExperiment ? 'tree-node-solution-has-pass' : ''} ${
        data.type === 'solution' && data.allExperimentsKill ? 'tree-node-solution-all-kill' : ''
      }`}
      style={baseStyle}
      onClick={(event) => {
        event.stopPropagation();
        data.onSelect?.(data.nodeKey);
      }}
      onContextMenu={handleContextMenu}
    >
      <Handle type="target" position={Position.Left} className="tree-node-handle" />
      <Handle type="source" position={Position.Right} className="tree-node-handle" />
      <div className="tree-node-header">
        {data.type === 'solution' && data.hasPassExperiment && (
          <span className="tree-node-momentum-dot tree-node-momentum-dot-pass" title="Has passed experiment" />
        )}
        <span className="tree-node-icon" style={{ color: typeTokens.accent }}>
          {data.icon}
        </span>
        <div className="tree-node-title-wrap">
          {data.type === 'outcome' && !isRenaming && (
            <div className="tree-node-outcome-label">🎯 Outcome</div>
          )}
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
        </div>
        {showOwner && (
          <div className="tree-node-avatars">
            {data.ownerUser && (
              <Avatar user={data.ownerUser} size={20} isOwner />
            )}
            {contributorUsers.length > 0 && (
              <AvatarGroup users={contributorUsers} size={18} max={3} />
            )}
          </div>
        )}
        {data.isCollapsed && data.childrenCount > 0 && (
          <span className="tree-node-count-pill">{data.childrenCount}</span>
        )}
      </div>

      {data.description && zoomLevel !== 'compact' && (
        <div
          className={data.type === 'outcome' ? 'tree-node-subtitle' : 'tree-node-description'}
          title={data.description}
        >
          {data.description}
        </div>
      )}

      {zoomLevel !== 'compact' && (
        <div className="tree-node-badges">
          {(data.type === 'opportunity' || data.type === 'solution') && data.confidence != null && (
            <ConfidenceBadge confidence={data.confidence} showExplanation />
          )}
          {(data.type === 'opportunity' || data.type === 'solution') && data.confidenceScore != null && data.confidenceScore !== '' && (
            <ConfidenceScorePill score={data.confidenceScore} />
          )}
          {data.type === 'test' && (
            <>
              <span className="tree-node-pill tree-node-pill-type">
                {testTypeLabel}
              </span>
              <span className={`tree-node-pill tree-node-pill-status status-${testStatusValue}`}>
                {getTestStatusLabel(data.testStatus || data.status)}
              </span>
              <span className={`tree-node-pill tree-node-pill-decision decision-${testDecisionValue}`}>
                {getResultDecisionLabel(data.resultDecision, cannotDecideYet)}
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

      {confidencePopoverOpen && showConfidenceMenu && (
        <ConfidenceScorePopover
          nodeKey={data.nodeKey}
          nodeType={data.type}
          currentScore={data.confidenceScore}
          onSave={(score) => {
            data.onUpdateConfidence?.(data.nodeKey, score);
            setConfidencePopoverOpen(false);
          }}
          onClose={() => setConfidencePopoverOpen(false)}
          anchorRef={nodeRef}
        />
      )}

      {contextMenu && createPortal(
        <>
          <div
            role="presentation"
            className="tree-node-context-menu-backdrop"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="tree-node-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {showConfidenceMenu && (
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setConfidencePopoverOpen(true);
                }}
              >
                Set confidence…
              </button>
            )}
            {data.isSubSolution && (
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  data.onPromoteSubSolution?.(data.nodeKey);
                }}
              >
                Promote to solution
              </button>
            )}
            <button type="button" onClick={() => { setContextMenu(null); handleDelete(); }}>
              Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default TreeNodeBase;
