import dagre from 'dagre';

/* Spacing tuned to avoid overlap: more gap between columns (journey vs first child) */
const RANK_SEP = 88;
const NODE_SEP = 30;
const MARGIN_X = 24;
const MARGIN_Y = 24;

const DEFAULT_SIZE = {
  outcome: { width: 320, height: 120 },
  journey: { width: 96, height: 32 },
  opportunity: { width: 248, height: 80 },
  solution: { width: 228, height: 74 },
  test: { width: 208, height: 70 },
  overflow: { width: 140, height: 48 }
};

export const layoutOstGraph = (nodes, edges, options = {}) => {
  const direction = options.direction || 'LR';
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    ranksep: options.rankSep ?? RANK_SEP,
    nodesep: options.nodeSep ?? NODE_SEP,
    marginx: options.marginX ?? MARGIN_X,
    marginy: options.marginY ?? MARGIN_Y
  });

  nodes.forEach((node) => {
    const type = node.data?.type || node.type;
    const size = DEFAULT_SIZE[type] || DEFAULT_SIZE.solution;
    const isSub = node.data?.isSubOpportunity || node.data?.isSubSolution;
    const w = isSub ? Math.round(size.width * 0.92) : size.width;
    const h = isSub ? Math.round(size.height * 0.88) : size.height;
    graph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const type = node.data?.type || node.type;
    const size = DEFAULT_SIZE[type] || DEFAULT_SIZE.solution;
    const isSub = node.data?.isSubOpportunity || node.data?.isSubSolution;
    const w = isSub ? Math.round(size.width * 0.92) : size.width;
    const h = isSub ? Math.round(size.height * 0.88) : size.height;
    const layoutNode = graph.node(node.id);
    return {
      ...node,
      position: {
        x: layoutNode.x - w / 2,
        y: layoutNode.y - h / 2
      }
    };
  });
};
