import { DEFAULT_TITLES, getNodeKey, MAX_CHILDREN_VISIBLE } from './ostTypes';
import { JOURNEY_STAGES, UNASSIGNED_STAGE_ID } from './journeyStages';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const buildNode = (type, data, parentKey, order, overrides, meta = {}) => {
  const key = getNodeKey(type, data.id);
  const override = overrides?.[key] || {};
  return {
    key,
    id: data.id,
    type,
    parentKey,
    order: typeof data.order === 'number' ? data.order : (data.sortIndex ?? data.sort_index ?? order),
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
    journeyStage: data.journeyStage ?? data.journey_stage ?? null,
    confidenceScore: override.confidenceScore ?? data.confidenceScore ?? data.confidence_score ?? null,
    isSubOpportunity: meta.isSubOpportunity ?? false,
    isSubSolution: meta.isSubSolution ?? false,
    raw: data
  };
};

/** Build solution node and its children (sub-solutions + tests). */
function buildSolutionNode(sol, parentKey, index, overrides, isSub = false) {
  const solNode = buildNode('solution', sol, parentKey, index, overrides, { isSubSolution: isSub });
  const subSols = safeArray(sol.subSolutions);
  const tests = safeArray(sol.tests);
  const childNodes = [
    ...subSols.map((sub, i) => buildSolutionNode(sub, solNode.key, i, overrides, true)),
    ...tests.map((test, testIndex) => {
      const testNode = buildNode('test', test, solNode.key, subSols.length + testIndex, overrides);
      testNode.children = [];
      return testNode;
    })
  ];
  solNode.children = childNodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return solNode;
}

/** Build opportunity node and its children (sub-opportunities + solutions). */
function buildOpportunityNode(opp, parentKey, index, overrides, isSub = false) {
  const oppNode = buildNode('opportunity', opp, parentKey, index, overrides, { isSubOpportunity: isSub });
  const subOpps = safeArray(opp.subOpportunities);
  const sols = safeArray(opp.solutions);
  const childNodes = [
    ...subOpps.map((sub, i) => buildOpportunityNode(sub, oppNode.key, i, overrides, true)),
    ...sols.map((sol, solIndex) => buildSolutionNode(sol, oppNode.key, subOpps.length + solIndex, overrides, false))
  ];
  oppNode.children = childNodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return oppNode;
}

export const buildOstTree = (outcome, overrides = {}) => {
  const nodesByKey = {};
  const root = buildNode('outcome', outcome, null, 0, overrides);
  nodesByKey[root.key] = root;

  const opps = safeArray(outcome.opportunities);
  root.children = opps.map((opp, index) => buildOpportunityNode(opp, root.key, index, overrides, false));

  const registerNodes = (node) => {
    if (node && node.key) nodesByKey[node.key] = node;
    (node.children || []).forEach(registerNodes);
  };
  registerNodes(root);

  return { root, nodesByKey };
};

/** Group top-level opportunities by journey_stage for Journey mode. Returns root with journey groups as children. */
export const buildOstTreeWithJourney = (outcome, overrides = {}) => {
  const nodesByKey = {};
  const root = buildNode('outcome', outcome, null, 0, overrides);
  nodesByKey[root.key] = root;

  const opps = safeArray(outcome.opportunities);
  const byStage = new Map();
  opps.forEach((opp) => {
    const stage = opp.journeyStage ?? opp.journey_stage ?? UNASSIGNED_STAGE_ID;
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage).push(opp);
  });

  const stageOrder = [...JOURNEY_STAGES.map((s) => s.id), UNASSIGNED_STAGE_ID];
  const sortedStages = [...byStage.keys()].sort(
    (a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b)
  );

  root.children = sortedStages.map((stageId, stageIndex) => {
    const stageOpps = byStage.get(stageId);
    const journeyKey = `journey:${outcome.id}:${stageId}`;
    return {
      key: journeyKey,
      id: stageId,
      type: 'journey',
      parentKey: root.key,
      order: stageIndex,
      title: stageId === UNASSIGNED_STAGE_ID ? 'Unassigned' : (JOURNEY_STAGES.find((s) => s.id === stageId)?.label ?? stageId),
      isUnassigned: stageId === UNASSIGNED_STAGE_ID,
      count: stageOpps.length,
      children: stageOpps.map((opp, i) => buildOpportunityNode(opp, journeyKey, i, overrides, false))
    };
  });

  const registerNodes = (node) => {
    if (node && node.key) nodesByKey[node.key] = node;
    (node.children || []).forEach(registerNodes);
  };
  registerNodes(root);

  return { root, nodesByKey };
};

export const buildOstForest = (outcomes, overrides = {}, options = {}) => {
  const { treeStructure = 'classic' } = options;
  const roots = [];
  const nodesByKey = {};
  const builder = treeStructure === 'journey' ? buildOstTreeWithJourney : buildOstTree;
  safeArray(outcomes).forEach((outcome) => {
    const tree = builder(outcome, overrides);
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

function findSolutionInTree(sol, type, id, outcome, opp, parentSol = null) {
  if (type === 'solution' && sol.id === id) {
    return { type, node: sol, parent: parentSol || opp, opportunity: opp, root: outcome };
  }
  for (const sub of safeArray(sol.subSolutions)) {
    const found = findSolutionInTree(sub, type, id, outcome, opp, sol);
    if (found) return found;
  }
  for (const test of safeArray(sol.tests)) {
    if (type === 'test' && test.id === id) {
      return { type, node: test, parent: sol, opportunity: opp, root: outcome };
    }
  }
  return null;
}

function findOpportunityInTree(opp, type, id, outcome, parentOpp = null) {
  if (type === 'opportunity' && opp.id === id) {
    return { type, node: opp, parent: parentOpp || outcome, opportunity: opp, root: outcome };
  }
  for (const sub of safeArray(opp.subOpportunities)) {
    const found = findOpportunityInTree(sub, type, id, outcome, opp);
    if (found) return found;
  }
  for (const sol of safeArray(opp.solutions)) {
    const found = findSolutionInTree(sol, type, id, outcome, opp);
    if (found) return found;
  }
  return null;
}

export const findNodeByKey = (outcomes, nodeKey) => {
  if (!nodeKey) return null;
  const [type, id] = nodeKey.split(':');
  if (!type || !id) return null;

  for (const outcome of outcomes) {
    if (type === 'outcome' && outcome.id === id) return { type, node: outcome };
    for (const opp of safeArray(outcome.opportunities)) {
      const found = findOpportunityInTree(opp, type, id, outcome);
      if (found) return found;
    }
  }

  return null;
};
