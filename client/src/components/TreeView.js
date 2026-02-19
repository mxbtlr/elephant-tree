import React, { useEffect, useMemo, useState } from 'react';
import { FaEllipsisH } from 'react-icons/fa';
import './TreeView.css';
import TreeModeView from './TreeMode/TreeModeView';
import ListModeView from './ListMode/ListModeView';
import { buildOstForest, buildOstTree, collectTreeNodes } from '../lib/ostTree';
import { allowedChildren, parseNodeKey } from '../lib/ostTypes';
import { computeConfidenceMap } from '../lib/confidence/recompute';
import { useOstStore } from '../store/useOstStore';

function TreeView({ outcomes, outcomesCount, workspaceName, decisionSpaceName, onUpdate, onAddOutcome, users, isCreatingOutcome = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    state: { viewMode, treeStructure, layoutUnlocked, nodeOverrides, selectedKey, evidenceByTest },
    actions: { setTreeStructure, setLayoutUnlocked, setCollapseMap, clearOverrides, setRenamingKey, setFocusKey, setSelectedKey }
  } = useOstStore();

  useEffect(() => {
    clearOverrides();
  }, [outcomes, clearOverrides]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (!selectedKey) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        setRenamingKey(selectedKey);
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const parsed = parseNodeKey(selectedKey);
        const childType = parsed ? allowedChildren[parsed.type]?.[0] : null;
        if (childType) {
          onUpdate?.('add-child', { parentKey: selectedKey, childType });
        }
      }
      if (event.key === 'Escape') {
        setFocusKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUpdate, selectedKey, setFocusKey, setRenamingKey]);

  const allNodes = useMemo(() => {
    if (!outcomes || outcomes.length === 0) return [];
    const forest = buildOstForest(outcomes, nodeOverrides, { treeStructure });
    const nodes = [];
    (forest.roots || []).forEach((root) => {
      const walk = (n, d) => {
        nodes.push({ node: n, depth: d });
        (n.children || []).forEach((c) => walk(c, d + 1));
      };
      walk(root, 1);
    });
    return nodes;
  }, [outcomes, nodeOverrides, treeStructure]);

  const handleCollapseAll = () => {
    const next = {};
    allNodes.forEach(({ node }) => {
      if ((node.children || []).length > 0) {
        next[node.key] = true;
      }
    });
    setCollapseMap(next);
  };

  const handleExpandAll = () => {
    const next = {};
    allNodes.forEach(({ node }) => {
      next[node.key] = false;
    });
    setCollapseMap(next);
  };

  const handleExpandToLevel = (level) => {
    const next = {};
    allNodes.forEach(({ node, depth }) => {
      if ((node.children || []).length > 0) {
        next[node.key] = depth >= level;
      }
    });
    setCollapseMap(next);
  };

  const confidenceMap = useMemo(() => {
    if (!outcomes || outcomes.length === 0) return {};
    return computeConfidenceMap(outcomes, evidenceByTest, nodeOverrides);
  }, [outcomes, evidenceByTest, nodeOverrides]);

  const isListView = viewMode === 'list';
  const content = (
    <div className="tree-view-content">
      <div className="tree-container" onClick={() => setSelectedKey(null)}>
        {viewMode === 'tree' ? (
          <TreeModeView
            outcomes={outcomes}
            treeStructure={treeStructure}
            onUpdate={onUpdate}
            users={users}
            confidenceMap={confidenceMap}
            onAddOutcome={onAddOutcome}
            isCreatingOutcome={isCreatingOutcome}
          />
        ) : (
          <ListModeView
            outcomes={outcomes}
            onUpdate={onUpdate}
            confidenceMap={confidenceMap}
            onAddOutcome={onAddOutcome}
            isCreatingOutcome={isCreatingOutcome}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={`tree-view ${isListView ? 'tree-view-list' : 'tree-view-canvas'}`}>
      {isListView ? (
        <>
          <div className="context-bar">
            <span>Workspace · {workspaceName || '—'}</span>
            <span>·</span>
            <span>Decision Space · {decisionSpaceName || '—'}</span>
            <span>·</span>
            <span>{outcomesCount || 0} Outcomes</span>
          </div>
          {content}
        </>
      ) : (
        <div className="canvas-root">
          <div className="context-bar">
            <span>Workspace · {workspaceName || '—'}</span>
            <span>·</span>
            <span>Decision Space · {decisionSpaceName || '—'}</span>
            <span>·</span>
            <span>{outcomesCount || 0} Outcomes</span>
          </div>
          <div className="tree-toolbar">
            {viewMode === 'tree' && (
              <>
                <div className="tree-toolbar-structure" role="group" aria-label="Tree structure">
                  <span className="tree-toolbar-label">Structure:</span>
                  <button
                    type="button"
                    className={`tree-toolbar-btn tree-toolbar-structure-btn ${treeStructure === 'classic' ? 'active' : ''}`}
                    onClick={() => setTreeStructure('classic')}
                  >
                    Classic
                  </button>
                  <button
                    type="button"
                    className={`tree-toolbar-btn tree-toolbar-structure-btn ${treeStructure === 'journey' ? 'active' : ''}`}
                    onClick={() => setTreeStructure('journey')}
                  >
                    Journey
                  </button>
                </div>
                <button className="tree-toolbar-btn" type="button" onClick={handleCollapseAll}>
                  Collapse all
                </button>
                <button className="tree-toolbar-btn" type="button" onClick={handleExpandAll}>
                  Expand all
                </button>
                <div className="tree-toolbar-expand">
                  <button
                    className="tree-toolbar-btn"
                    type="button"
                    onClick={() => handleExpandToLevel(2)}
                  >
                    Expand to level
                  </button>
                  <div className="tree-toolbar-expand-options">
                    {[1, 2, 3, 4].map((level) => (
                      <button key={level} type="button" onClick={() => handleExpandToLevel(level)}>
                        Level {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tree-toolbar-menu">
                  <button
                    className="tree-toolbar-btn icon"
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                  >
                    <FaEllipsisH />
                  </button>
                  {isMenuOpen && (
                    <div className="tree-toolbar-menu-card">
                      <button
                        type="button"
                        onClick={() => {
                          setLayoutUnlocked(!layoutUnlocked);
                          setIsMenuOpen(false);
                        }}
                      >
                        {layoutUnlocked ? 'Lock layout' : 'Unlock layout'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {content}
        </div>
      )}
    </div>
  );
}

export default TreeView;

