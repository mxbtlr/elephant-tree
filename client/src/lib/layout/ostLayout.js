import dagre from 'dagre';

const DEFAULT_SIZE = {
  outcome: { width: 280, height: 96 },
  opportunity: { width: 260, height: 88 },
  solution: { width: 260, height: 88 },
  test: { width: 240, height: 84 },
  overflow: { width: 150, height: 52 }
};

export const layoutOstGraph = (nodes, edges, options = {}) => {
  const direction = options.direction || 'LR';
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    ranksep: options.rankSep ?? 120,
    nodesep: options.nodeSep ?? 40,
    marginx: options.marginX ?? 40,
    marginy: options.marginY ?? 40
  });

  nodes.forEach((node) => {
    const size = DEFAULT_SIZE[node.data?.type || node.type] || DEFAULT_SIZE.solution;
    graph.setNode(node.id, { width: size.width, height: size.height });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const size = DEFAULT_SIZE[node.data?.type || node.type] || DEFAULT_SIZE.solution;
    const layoutNode = graph.node(node.id);
    return {
      ...node,
      position: {
        x: layoutNode.x - size.width / 2,
        y: layoutNode.y - size.height / 2
      }
    };
  });
};
