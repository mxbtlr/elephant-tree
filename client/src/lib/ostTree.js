import { DEFAULT_TITLES, getNodeKey, MAX_CHILDREN_VISIBLE } from './ostTypes';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const buildNode = (type, data, parentKey, order, overrides) => {
  const key = getNodeKey(type, data.id);
  const override = overrides?.[key] || {};
  return {
    key,
    id: data.id,
    type,
    parentKey,
    order: typeof data.order === 'number' ? data.order : order,
    title: override.title ?? data.title ?? DEFAULT_TITLES[type],
    description: override.description ?? data.description ?? '',
    status: override.status ?? data.status ?? null,
    owner: override.owner ?? data.owner ?? null,
    contributorIds:
      override.contributorIds ??
      data.contributorIds ??
      data.contributor_ids ??
      data.contributors ??
      [],
    evidence: override.evidence ?? data.evidence ?? '',
    result: override.result ?? data.result ?? '',
    testTemplate: override.testTemplate ?? data.testTemplate ?? null,
    testType: override.testType ?? data.testType ?? data.type ?? null,
    testStatus: override.testStatus ?? data.testStatus ?? null,
    resultDecision: override.resultDecision ?? data.resultDecision ?? null,
    todoDone: override.todoDone ?? data.todoDone ?? null,
    todoTotal: override.todoTotal ?? data.todoTotal ?? null,
    raw: data
  };
};

export const buildOstTree = (outcome, overrides = {}) => {
  const nodesByKey = {};
  const root = buildNode('outcome', outcome, null, 0, overrides);
  nodesByKey[root.key] = root;

  const opps = safeArray(outcome.opportunities);
  root.children = opps.map((opp, index) => {
    const oppNode = buildNode('opportunity', opp, root.key, index, overrides);
    nodesByKey[oppNode.key] = oppNode;

    const sols = safeArray(opp.solutions);
    oppNode.children = sols.map((sol, solIndex) => {
      const solNode = buildNode('solution', sol, oppNode.key, solIndex, overrides);
      nodesByKey[solNode.key] = solNode;

      const tests = safeArray(sol.tests);
      solNode.children = tests.map((test, testIndex) => {
        const testNode = buildNode('test', test, solNode.key, testIndex, overrides);
        nodesByKey[testNode.key] = testNode;
        testNode.children = [];
        return testNode;
      });

      return solNode;
    });

    return oppNode;
  });

  return { root, nodesByKey };
};

export const buildOstForest = (outcomes, overrides = {}) => {
  const roots = [];
  const nodesByKey = {};
  safeArray(outcomes).forEach((outcome) => {
    const tree = buildOstTree(outcome, overrides);
    roots.push(tree.root);
    Object.assign(nodesByKey, tree.nodesByKey);
  });
  return { roots, nodesByKey };
};

export const collectTreeNodes = (root) => {
  const all = [];
  const walk = (node, depth) => {
    all.push({ node, depth });
    node.children?.forEach((child) => walk(child, depth + 1));
  };
  walk(root, 1);
  return all;
};

export const getPathToRoot = (nodesByKey, nodeKey) => {
  const path = [];
  let current = nodesByKey[nodeKey];
  while (current) {
    path.push(current.key);
    current = current.parentKey ? nodesByKey[current.parentKey] : null;
  }
  return path;
};

export const getActivePath = (nodesByKey, nodeKey) => {
  if (!nodeKey || !nodesByKey[nodeKey]) return { nodes: new Set(), edges: new Set() };
  const activeNodes = new Set();
  const activeEdges = new Set();

  const addAncestors = (current) => {
    if (!current) return;
    activeNodes.add(current.key);
    if (current.parentKey) {
      activeEdges.add(`${current.parentKey}->${current.key}`);
      addAncestors(nodesByKey[current.parentKey]);
    }
  };

  const addDescendants = (current) => {
    if (!current) return;
    activeNodes.add(current.key);
    (current.children || []).forEach((child) => {
      activeEdges.add(`${current.key}->${child.key}`);
      addDescendants(nodesByKey[child.key]);
    });
  };

  const start = nodesByKey[nodeKey];
  addAncestors(start);
  addDescendants(start);

  return { nodes: activeNodes, edges: activeEdges };
};

export const buildVisibleGraph = (root, collapsedSet, options = {}) => {
  const nodes = [];
  const edges = [];
  const overflowNodes = [];
  const maxChildren = options.maxChildren ?? MAX_CHILDREN_VISIBLE;

  const walk = (node) => {
    nodes.push(node);
    if (collapsedSet?.has(node.key)) return;

    const sortedChildren = [...(node.children || [])].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 0;
      const orderB = typeof b.order === 'number' ? b.order : 0;
      return orderA - orderB;
    });

    const visibleChildren = sortedChildren.slice(0, maxChildren);
    const hiddenChildren = sortedChildren.slice(maxChildren);

    visibleChildren.forEach((child) => {
      edges.push({ id: `${node.key}->${child.key}`, source: node.key, target: child.key });
      walk(child);
    });

    if (hiddenChildren.length > 0) {
      const overflowKey = `${node.key}:overflow`;
      overflowNodes.push({
        key: overflowKey,
        id: overflowKey,
        type: 'overflow',
        parentKey: node.key,
        title: `+${hiddenChildren.length} more`,
        hiddenChildren
      });
      edges.push({ id: `${node.key}->${overflowKey}`, source: node.key, target: overflowKey });
    }
  };

  walk(root);
  return { nodes, edges, overflowNodes };
};

export const buildVisibleForest = (roots, collapsedSet, options = {}) => {
  const nodes = [];
  const edges = [];
  const overflowNodes = [];
  const maxChildren = options.maxChildren ?? MAX_CHILDREN_VISIBLE;

  const walk = (node) => {
    nodes.push(node);
    if (collapsedSet?.has(node.key)) return;

    const sortedChildren = [...(node.children || [])].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 0;
      const orderB = typeof b.order === 'number' ? b.order : 0;
      return orderA - orderB;
    });

    const visibleChildren = sortedChildren.slice(0, maxChildren);
    const hiddenChildren = sortedChildren.slice(maxChildren);

    visibleChildren.forEach((child) => {
      edges.push({ id: `${node.key}->${child.key}`, source: node.key, target: child.key });
      walk(child);
    });

    if (hiddenChildren.length > 0) {
      const overflowKey = `${node.key}:overflow`;
      overflowNodes.push({
        key: overflowKey,
        id: overflowKey,
        type: 'overflow',
        parentKey: node.key,
        title: `+${hiddenChildren.length} more`,
        hiddenChildren
      });
      edges.push({ id: `${node.key}->${overflowKey}`, source: node.key, target: overflowKey });
    }
  };

  (roots || []).forEach((root) => walk(root));
  return { nodes, edges, overflowNodes };
};

export const findNodeByKey = (outcomes, nodeKey) => {
  if (!nodeKey) return null;
  const [type, id] = nodeKey.split(':');
  if (!type || !id) return null;

  for (const outcome of outcomes) {
    if (type === 'outcome' && outcome.id === id) return { type, node: outcome };
    for (const opp of safeArray(outcome.opportunities)) {
      if (type === 'opportunity' && opp.id === id) return { type, node: opp, parent: outcome };
      for (const sol of safeArray(opp.solutions)) {
      if (type === 'solution' && sol.id === id) {
        return { type, node: sol, parent: opp, opportunity: opp, root: outcome };
      }
        for (const test of safeArray(sol.tests)) {
        if (type === 'test' && test.id === id) {
          return { type, node: test, parent: sol, opportunity: opp, root: outcome };
        }
        }
      }
    }
  }

  return null;
};
