import React, { useEffect, useMemo, useState } from 'react';
import { FaEllipsisH } from 'react-icons/fa';
import './TreeView.css';
import TreeModeView from './TreeMode/TreeModeView';
import ListModeView from './ListMode/ListModeView';
import SidePanel from './SidePanel';
import api from '../services/supabaseApi';
import { buildOstTree, collectTreeNodes } from '../lib/ostTree';
import { allowedChildren, parseNodeKey } from '../lib/ostTypes';
import { computeConfidenceMap } from '../lib/confidence/recompute';
import { useOstStore } from '../store/useOstStore';

function TreeView({ outcomes, outcomesCount, workspaceName, decisionSpaceName, onUpdate, onAddOutcome }) {
  const [users, setUsers] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    state: { viewMode, layoutUnlocked, nodeOverrides, selectedKey, evidenceByTest },
    actions: { setLayoutUnlocked, setCollapseMap, clearOverrides, setRenamingKey, setFocusKey }
  } = useOstStore();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersList = await api.getUsers();
      setUsers(usersList || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

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
    const tree = buildOstTree(outcomes[0], nodeOverrides);
    return collectTreeNodes(tree.root);
  }, [outcomes, nodeOverrides]);

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

  return (
    <div className="tree-view">
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
      <div className="tree-view-content">
        <div className="tree-container">
          {viewMode === 'tree' ? (
            <TreeModeView
              outcomes={outcomes}
              onUpdate={onUpdate}
              users={users}
              confidenceMap={confidenceMap}
              onAddOutcome={onAddOutcome}
            />
          ) : (
            <ListModeView
              outcomes={outcomes}
              onUpdate={onUpdate}
              confidenceMap={confidenceMap}
              onAddOutcome={onAddOutcome}
            />
          )}
        </div>
        <SidePanel outcomes={outcomes || []} users={users} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

export default TreeView;

