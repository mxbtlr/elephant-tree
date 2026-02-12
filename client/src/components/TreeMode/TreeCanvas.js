import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  BaseEdge,
  Controls,
  getSmoothStepPath,
  useEdgesState,
  useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import OutcomeNode from './nodes/OutcomeNode';
import OpportunityNode from './nodes/OpportunityNode';
import SolutionNode from './nodes/SolutionNode';
import TestNode from './nodes/TestNode';
import OverflowNode from './nodes/OverflowNode';
import JourneyNode from './nodes/JourneyNode';
import { buildOstForest, buildVisibleForest, getActivePath } from '../../lib/ostTree';
import { layoutOstGraph } from '../../lib/layout/ostLayout';
import { MAX_CHILDREN_VISIBLE, getNodeKey, normalizeTestStatus, normalizeResultDecision } from '../../lib/ostTypes';
import { useOstStore } from '../../store/useOstStore';
import OverflowModal from './OverflowModal';
import { ostTokens } from '../../lib/ui/tokens';
import './TreeCanvas.css';

const nodeTypes = {
  outcome: OutcomeNode,
  opportunity: OpportunityNode,
  solution: SolutionNode,
  test: TestNode,
  overflow: OverflowNode,
  journey: JourneyNode
};

const EDGE_STATE_STYLES = {
  default: { stroke: ostTokens.edge.base.stroke, strokeWidth: 1.2 },
  draft: { stroke: 'rgba(100, 116, 139, 0.32)', strokeWidth: 1.1 },
  planned: { stroke: ostTokens.status.planned, strokeWidth: 1.1, strokeDasharray: '4 6' },
  live: { stroke: ostTokens.status.live, strokeWidth: 1.4, strokeDasharray: '6 8' },
  done_pass: { stroke: ostTokens.status.done_pass, strokeWidth: 1.5 },
  done_iterate: { stroke: ostTokens.status.done_iterate, strokeWidth: 1.3 },
  done_kill: { stroke: ostTokens.status.done_kill, strokeWidth: 1.5 }
};

const getEdgeState = (targetNode) => {
  if (!targetNode || targetNode.type !== 'test') return 'default';
  const status = normalizeTestStatus(targetNode.testStatus || targetNode.status);
  const decision = (targetNode.resultDecision || '').toLowerCase();
  const hasOpenTodos = typeof targetNode.todoTotal === 'number' && targetNode.todoTotal > 0 && (targetNode.todoDone || 0) < targetNode.todoTotal;
  const canHaveDecision = status === 'designed' && !hasOpenTodos;
  if (canHaveDecision && (decision === 'pass' || decision === 'iterate' || decision === 'kill')) {
    if (decision === 'pass') return 'done_pass';
    if (decision === 'iterate') return 'done_iterate';
    if (decision === 'kill') return 'done_kill';
  }
  if (status === 'designed') return 'live';
  return 'planned';
};

function LiveEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  });
  return <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} className="edge-live-path" />;
}

const edgeTypes = {
  live: LiveEdge
};

/** Collect all experiment result decisions under a solution node (recursively). */
function getTestDecisionsUnderNode(node) {
  const decisions = [];
  const walk = (n) => {
    (n.children || []).forEach((child) => {
      if (child.type === 'test') {
        const d = normalizeResultDecision(child.resultDecision);
        if (d) decisions.push(d);
      } else if (child.type === 'solution') {
        walk(child);
      }
    });
  };
  walk(node);
  return decisions;
}

function TreeCanvas({ outcomes, treeStructure = 'classic', onUpdate, users, confidenceMap, onAddOutcome }) {
  const {
    state: { collapsed, selectedKey, layoutUnlocked, focusKey, nodeOverrides },
    actions: { setSelectedKey, toggleCollapse, clearSelection, setFocusKey }
  } = useOstStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [openAddKey, setOpenAddKey] = useState(null);
  const [overflowState, setOverflowState] = useState(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [hasFit, setHasFit] = useState(false);
  const [flowInstance, setFlowInstance] = useState(null);
  const userMap = useMemo(() => {
    const map = new Map();
    (users || []).forEach((user) => {
      map.set(user.id, user);
    });
    return map;
  }, [users]);
  const ownerMap = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      map[user.id] = user.name || user.email || user.id;
    });
    return map;
  }, [users]);

  const tree = useMemo(
    () => buildOstForest(outcomes, nodeOverrides, { treeStructure }),
    [outcomes, nodeOverrides, treeStructure]
  );
  const collapsedSet = useMemo(
    () => new Set(Object.keys(collapsed).filter((key) => collapsed[key])),
    [collapsed]
  );

  const activeKey = focusKey;
  const activePath = useMemo(
    () => getActivePath(tree.nodesByKey, activeKey),
    [tree.nodesByKey, activeKey]
  );

  const { nodes: visibleNodes, edges: visibleEdges, overflowNodes } = useMemo(
    () => buildVisibleForest(tree.roots, collapsedSet, { maxChildren: MAX_CHILDREN_VISIBLE }),
    [tree.roots, collapsedSet]
  );

  const rawNodes = useMemo(() => {
    const baseNodes = visibleNodes.map((node) => ({
      id: node.key,
      type: node.type,
      data: {
        nodeKey: node.key,
        node,
        type: node.type,
        title: node.title,
        status: node.status,
        ownerLabel: node.owner ? ownerMap[node.owner] || node.owner : '',
        ownerId: node.owner || null,
        ownerUser: node.owner ? userMap.get(node.owner) : null,
        contributorUsers: (node.contributorIds || node.contributors || [])
          .map((id) => userMap.get(id))
          .filter(Boolean),
        description: node.description,
        confidence: confidenceMap?.[node.key],
        testTemplate: node.testTemplate || null,
        testType: node.testType || null,
        testStatus: node.testStatus || null,
        resultDecision: node.resultDecision || null,
        todoDone: node.todoDone ?? null,
        todoTotal: node.todoTotal ?? null,
        isCollapsed: collapsedSet.has(node.key),
        hasChildren: (node.children || []).length > 0,
        isDimmed: activeKey ? !activePath.nodes.has(node.key) : false,
        isHovered: false,
        isSubOpportunity: node.isSubOpportunity === true,
        isSubSolution: node.isSubSolution === true,
        confidenceScore: node.confidenceScore ?? null,
        ...(node.type === 'solution'
          ? (() => {
              const decisions = getTestDecisionsUnderNode(node);
              return {
                hasPassExperiment: decisions.some((d) => d === 'pass'),
                allExperimentsKill: decisions.length > 0 && decisions.every((d) => d === 'kill')
              };
            })()
          : {}),
        onSelect: setSelectedKey,
        onToggleCollapse: toggleCollapse,
        onToggleAdd: (key) => setOpenAddKey((prev) => (prev === key ? null : key)),
        onAddChild: (key, childType) => {
          if (collapsedSet.has(key)) {
            toggleCollapse(key);
          }
          setOpenAddKey(null);
          onUpdate?.('add-child', { parentKey: key, childType });
        },
        onRename: (key, value) => onUpdate?.('rename', { nodeKey: key, title: value }),
        onDelete: (key) => onUpdate?.('delete-node', { nodeKey: key }),
        onUpdateConfidence: (key, score) => onUpdate?.('set-confidence', { nodeKey: key, score }),
        onPromoteSubSolution: (key) => onUpdate?.('promote-sub-solution', { nodeKey: key }),
        isAddOpen: openAddKey === node.key,
        childrenCount: (node.children || []).length
      },
      position: { x: 0, y: 0 },
      sourcePosition: 'right',
      targetPosition: 'left'
    }));

    const overflow = overflowNodes.map((node) => ({
      id: node.key,
      type: 'overflow',
      data: {
        title: node.title,
        hiddenChildren: node.hiddenChildren,
        isDimmed: activeKey ? !activePath.nodes.has(node.parentKey) : false,
        onOpenOverflow: () =>
          setOverflowState({
            parentKey: node.parentKey,
            parentType: tree.nodesByKey[node.parentKey]?.type,
            hiddenChildren: node.hiddenChildren
          })
      },
      position: { x: 0, y: 0 },
      sourcePosition: 'right',
      targetPosition: 'left'
    }));

    return [...baseNodes, ...overflow];
  }, [
    visibleNodes,
    overflowNodes,
    collapsedSet,
    activeKey,
    activePath,
    setSelectedKey,
    toggleCollapse,
    openAddKey,
    onUpdate,
    tree,
    ownerMap,
    confidenceMap,
    userMap
  ]);

  const rawEdges = useMemo(() => {
    return visibleEdges.map((edge) => {
      const sourceType = tree.nodesByKey[edge.source]?.type;
      const targetNode = tree.nodesByKey[edge.target];
      const edgeState = getEdgeState(targetNode);
      const accent = sourceType ? ostTokens.type[sourceType]?.accent : null;
      const isActive = activeKey ? activePath.edges.has(edge.id) : false;
      const baseStyle = EDGE_STATE_STYLES[edgeState] || EDGE_STATE_STYLES.default;
      const resolvedStroke = isActive ? accent || baseStyle.stroke : baseStyle.stroke;
      const resolvedWidth = isActive
        ? Math.max(baseStyle.strokeWidth || 1, ostTokens.edge.active.width)
        : baseStyle.strokeWidth || ostTokens.edge.base.width;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeState === 'live' ? 'live' : 'smoothstep',
        animated: false,
        style: {
          ...baseStyle,
          stroke: resolvedStroke,
          strokeWidth: resolvedWidth
        },
        className: [
          `edge-state-${edgeState}`,
          activeKey && !isActive ? 'edge-dimmed' : '',
          isActive ? 'edge-active' : ''
        ]
          .filter(Boolean)
          .join(' ')
      };
    });
  }, [visibleEdges, activeKey, activePath.edges, tree.nodesByKey]);

  const layoutedNodes = useMemo(() => layoutOstGraph(rawNodes, rawEdges), [rawNodes, rawEdges, layoutTick]);

  useEffect(() => {
    setEdges(rawEdges);
  }, [rawEdges, setEdges]);

  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    if (hasFit || layoutedNodes.length === 0 || !flowInstance) return;
    const handle = window.requestAnimationFrame(() => {
      flowInstance.fitView({ padding: 0.2, duration: 200 });
      setHasFit(true);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [flowInstance, hasFit, layoutedNodes.length]);

  useEffect(() => {
    if (!selectedKey || !flowInstance) return;
    const target = nodes.find((node) => node.id === selectedKey);
    const position = target?.positionAbsolute || target?.position;
    if (position) {
      flowInstance.setCenter(position.x, position.y, { zoom: 1.1, duration: 300 });
    }
  }, [selectedKey, nodes, flowInstance]);

  useEffect(() => {
    const handleResize = () => {
      setLayoutTick((prev) => prev + 1);
    };
    const throttled = () => window.requestAnimationFrame(handleResize);
    window.addEventListener('resize', throttled);
    return () => window.removeEventListener('resize', throttled);
  }, []);

  const handleCanvasClick = () => {
    if (openAddKey) setOpenAddKey(null);
    clearSelection();
    setFocusKey(null);
  };

  if (!outcomes || outcomes.length === 0) {
    return (
      <div className="tree-empty-state">
        <div className="tree-empty-title">This Decision Space has no Outcomes yet</div>
        <div className="tree-empty-subtitle">Outcomes are the root goals of this tree.</div>
        <button type="button" onClick={onAddOutcome} className="tree-empty-cta">
          Add first Outcome
        </button>
      </div>
    );
  }

  return (
    <div className="tree-canvas-card">
      <div className="tree-canvas-body">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={setFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={layoutUnlocked}
          nodesConnectable={false}
          elementsSelectable={true}
          deleteKeyCode={null}
          onPaneClick={handleCanvasClick}
          style={{ background: ostTokens.canvas.bg }}
        >
          <Background gap={20} size={1} color={ostTokens.canvas.gridDot} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
        <button
          className="tree-center-btn"
          type="button"
          onClick={() => flowInstance?.fitView({ padding: 0.2, duration: 200 })}
        >
          Center
        </button>
      </div>

      {overflowState && (
        <OverflowModal
          parentKey={overflowState.parentKey}
          parentType={overflowState.parentType}
          hiddenChildren={overflowState.hiddenChildren}
          onClose={() => setOverflowState(null)}
          onSelect={(key) => setSelectedKey(getNodeKey(key.type, key.id))}
          onAddChild={(childType) => onUpdate?.('add-child', { parentKey: overflowState.parentKey, childType })}
        />
      )}

    </div>
  );
}

export default TreeCanvas;
