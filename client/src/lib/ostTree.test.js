import {
  buildOstTree,
  buildOstTreeWithJourney,
  buildOstForest,
  collectTreeNodes,
  findNodeByKey,
  getPathToRoot,
  getActivePath,
  buildVisibleGraph
} from './ostTree';

describe('ostTree', () => {
  const minimalOutcome = {
    id: 'o1',
    title: 'Outcome 1',
    opportunities: [
      {
        id: 'opp1',
        title: 'Opp 1',
        solutions: [
          {
            id: 'sol1',
            title: 'Sol 1',
            tests: [{ id: 't1', title: 'Test 1' }]
          }
        ]
      }
    ]
  };

  describe('buildOstTree', () => {
    it('builds root and nodesByKey from outcome', () => {
      const { root, nodesByKey } = buildOstTree(minimalOutcome);
      expect(root.type).toBe('outcome');
      expect(root.id).toBe('o1');
      expect(root.key).toBe('outcome:o1');
      expect(root.children).toHaveLength(1);
      expect(Object.keys(nodesByKey)).toContain('outcome:o1');
      expect(Object.keys(nodesByKey)).toContain('opportunity:opp1');
      expect(Object.keys(nodesByKey)).toContain('solution:sol1');
      expect(Object.keys(nodesByKey)).toContain('test:t1');
    });

    it('applies overrides when provided', () => {
      const overrides = { 'outcome:o1': { title: 'Overridden' } };
      const { root } = buildOstTree(minimalOutcome, overrides);
      expect(root.title).toBe('Overridden');
    });

    it('handles empty opportunities', () => {
      const empty = { id: 'o2', title: 'Empty', opportunities: [] };
      const { root, nodesByKey } = buildOstTree(empty);
      expect(root.children).toEqual([]);
      expect(Object.keys(nodesByKey)).toEqual(['outcome:o2']);
    });

    it('builds nested sub-opportunities under opportunities', () => {
      const outcome = {
        id: 'o1',
        title: 'Outcome',
        opportunities: [
          {
            id: 'opp1',
            title: 'Parent Opp',
            subOpportunities: [
              { id: 'sub1', title: 'Sub 1', subOpportunities: [], solutions: [] },
              { id: 'sub2', title: 'Sub 2', subOpportunities: [], solutions: [] }
            ],
            solutions: [{ id: 'sol1', title: 'Sol 1', tests: [] }]
          }
        ]
      };
      const { root, nodesByKey } = buildOstTree(outcome);
      expect(root.children).toHaveLength(1);
      const oppNode = root.children[0];
      expect(oppNode.id).toBe('opp1');
      expect(oppNode.children).toHaveLength(3); // 2 sub-opps + 1 solution
      const subOppKeys = oppNode.children.filter((c) => c.type === 'opportunity').map((c) => c.key);
      expect(subOppKeys).toContain('opportunity:sub1');
      expect(subOppKeys).toContain('opportunity:sub2');
      expect(nodesByKey['opportunity:sub1']?.isSubOpportunity).toBe(true);
    });

    it('builds nested sub-solutions under solutions', () => {
      const outcome = {
        id: 'o1',
        title: 'Outcome',
        opportunities: [
          {
            id: 'opp1',
            title: 'Opp',
            subOpportunities: [],
            solutions: [
              {
                id: 'sol1',
                title: 'Parent Sol',
                subSolutions: [
                  { id: 'sub1', title: 'Sub Sol 1', subSolutions: [], tests: [] },
                  { id: 'sub2', title: 'Sub Sol 2', subSolutions: [], tests: [] }
                ],
                tests: [{ id: 't1', title: 'Test 1' }]
              }
            ]
          }
        ]
      };
      const { root, nodesByKey } = buildOstTree(outcome);
      const oppNode = root.children[0];
      const solNode = oppNode.children.find((c) => c.id === 'sol1');
      expect(solNode).toBeDefined();
      expect(solNode.children.some((c) => c.type === 'solution' && c.id === 'sub1')).toBe(true);
      expect(solNode.children.some((c) => c.type === 'solution' && c.id === 'sub2')).toBe(true);
      expect(solNode.children.some((c) => c.type === 'test' && c.id === 't1')).toBe(true);
      expect(nodesByKey['solution:sub1']?.isSubSolution).toBe(true);
      expect(nodesByKey['solution:sub2']?.isSubSolution).toBe(true);
    });

    it('merges confidenceScore from data and overrides', () => {
      const outcome = {
        id: 'o1',
        title: 'Outcome',
        opportunities: [
          {
            id: 'opp1',
            title: 'Opp',
            confidenceScore: 60,
            subOpportunities: [],
            solutions: [{ id: 'sol1', title: 'Sol', subSolutions: [], tests: [] }]
          }
        ]
      };
      const { nodesByKey } = buildOstTree(outcome, { 'opportunity:opp1': { confidenceScore: 80 } });
      expect(nodesByKey['opportunity:opp1'].confidenceScore).toBe(80);
      expect(nodesByKey['solution:sol1'].confidenceScore).toBeNull();
      const withSolConfidence = buildOstTree({
        ...outcome,
        opportunities: [{
          ...outcome.opportunities[0],
          solutions: [{ id: 'sol1', title: 'Sol', confidenceScore: 72, subSolutions: [], tests: [] }]
        }]
      });
      expect(withSolConfidence.nodesByKey['solution:sol1'].confidenceScore).toBe(72);
    });
  });

  describe('buildOstTreeWithJourney', () => {
    it('groups top-level opportunities by journey_stage', () => {
      const outcome = {
        id: 'o1',
        title: 'Outcome',
        opportunities: [
          { id: 'opp1', title: 'A', journeyStage: 'awareness', subOpportunities: [], solutions: [] },
          { id: 'opp2', title: 'B', journeyStage: 'usage', subOpportunities: [], solutions: [] },
          { id: 'opp3', title: 'C', journeyStage: 'awareness', subOpportunities: [], solutions: [] }
        ]
      };
      const { root, nodesByKey } = buildOstTreeWithJourney(outcome);
      expect(root.type).toBe('outcome');
      expect(root.children).toHaveLength(2); // awareness + usage (stages)
      const journeyNodes = root.children.filter((c) => c.type === 'journey');
      expect(journeyNodes).toHaveLength(2);
      const awareness = journeyNodes.find((j) => j.id === 'awareness');
      expect(awareness).toBeDefined();
      expect(awareness.count).toBe(2);
      expect(awareness.children).toHaveLength(2);
      expect(awareness.children.map((c) => c.id)).toEqual(['opp1', 'opp3']);
    });

    it('puts opportunities without journey_stage in Unassigned', () => {
      const outcome = {
        id: 'o1',
        title: 'Outcome',
        opportunities: [
          { id: 'opp1', title: 'No stage', journeyStage: null, subOpportunities: [], solutions: [] }
        ]
      };
      const { root } = buildOstTreeWithJourney(outcome);
      const unassigned = root.children.find((c) => c.type === 'journey' && c.isUnassigned);
      expect(unassigned).toBeDefined();
      expect(unassigned.title).toBe('Unassigned');
      expect(unassigned.children).toHaveLength(1);
      expect(unassigned.children[0].id).toBe('opp1');
    });
  });

  describe('findNodeByKey', () => {
    it('finds sub-opportunity in nested tree', () => {
      const outcome = {
        id: 'o1',
        title: 'Outcome',
        opportunities: [
          {
            id: 'opp1',
            title: 'Parent',
            subOpportunities: [{ id: 'sub1', title: 'Sub', subOpportunities: [], solutions: [] }],
            solutions: []
          }
        ]
      };
      const found = findNodeByKey([outcome], 'opportunity:sub1');
      expect(found).not.toBeNull();
      expect(found.type).toBe('opportunity');
      expect(found.node.id).toBe('sub1');
      expect(found.root.id).toBe('o1');
    });
  });

  describe('buildOstForest', () => {
    it('builds multiple roots and merged nodesByKey', () => {
      const outcomes = [
        { id: 'a', title: 'A', opportunities: [] },
        { id: 'b', title: 'B', opportunities: [] }
      ];
      const { roots, nodesByKey } = buildOstForest(outcomes);
      expect(roots).toHaveLength(2);
      expect(nodesByKey['outcome:a']).toBeDefined();
      expect(nodesByKey['outcome:b']).toBeDefined();
    });
  });

  describe('collectTreeNodes', () => {
    it('collects all nodes with depth', () => {
      const { root } = buildOstTree(minimalOutcome);
      const collected = collectTreeNodes(root);
      expect(collected.length).toBeGreaterThanOrEqual(1);
      expect(collected[0].depth).toBe(1);
      collected.forEach(({ node, depth }) => {
        expect(node).toHaveProperty('key');
        expect(typeof depth).toBe('number');
      });
    });
  });

  describe('getPathToRoot', () => {
    it('returns path from node to root', () => {
      const { nodesByKey } = buildOstTree(minimalOutcome);
      const path = getPathToRoot(nodesByKey, 'test:t1');
      expect(path).toContain('test:t1');
      expect(path).toContain('solution:sol1');
      expect(path).toContain('opportunity:opp1');
      expect(path).toContain('outcome:o1');
    });
  });

  describe('getActivePath', () => {
    it('returns active nodes and edges for a given key', () => {
      const { nodesByKey } = buildOstTree(minimalOutcome);
      const { nodes, edges } = getActivePath(nodesByKey, 'solution:sol1');
      expect(nodes.size).toBeGreaterThan(0);
      expect(nodes.has('solution:sol1')).toBe(true);
      expect(edges.size).toBeGreaterThanOrEqual(0);
    });
    it('returns empty for invalid key', () => {
      const { nodesByKey } = buildOstTree(minimalOutcome);
      const { nodes, edges } = getActivePath(nodesByKey, 'invalid:key');
      expect(nodes.size).toBe(0);
      expect(edges.size).toBe(0);
    });
  });

  describe('buildVisibleGraph', () => {
    it('returns nodes and edges from root', () => {
      const { root } = buildOstTree(minimalOutcome);
      const { nodes, edges } = buildVisibleGraph(root, new Set());
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes.some((n) => n.key === root.key)).toBe(true);
    });
  });

  describe('sub-solution and confidence integration', () => {
    it('builds tree from API-shaped data with sub-solution and confidence, renders correctly', () => {
      const outcomeFromApi = {
        id: 'out-1',
        title: 'Outcome',
        opportunities: [
          {
            id: 'opp-1',
            title: 'Opportunity',
            confidenceScore: 50,
            subOpportunities: [],
            solutions: [
              {
                id: 'sol-1',
                title: 'Solution',
                confidenceScore: 72,
                subSolutions: [
                  {
                    id: 'sub-sol-1',
                    title: 'Sub-Solution',
                    confidenceScore: 90,
                    subSolutions: [],
                    tests: []
                  }
                ],
                tests: []
              }
            ]
          }
        ]
      };
      const { root, nodesByKey } = buildOstTree(outcomeFromApi);
      expect(root).toBeDefined();
      const opp = nodesByKey['opportunity:opp-1'];
      const sol = nodesByKey['solution:sol-1'];
      const subSol = nodesByKey['solution:sub-sol-1'];
      expect(opp.confidenceScore).toBe(50);
      expect(sol.confidenceScore).toBe(72);
      expect(subSol.confidenceScore).toBe(90);
      expect(subSol.isSubSolution).toBe(true);
      expect(sol.isSubSolution).toBe(false);
      const solNode = root.children[0].children.find((c) => c.id === 'sol-1');
      expect(solNode.children.some((c) => c.id === 'sub-sol-1')).toBe(true);
    });
  });
});
