import api from './supabaseApi';

describe('supabaseApi.nestSolutions', () => {
  it('returns empty array for empty or null input', () => {
    expect(api.nestSolutions([])).toEqual([]);
    expect(api.nestSolutions(null)).toEqual([]);
  });

  it('builds nested tree from parent_solution_id', () => {
    const flat = [
      { id: 'sol1', title: 'Root 1', parent_solution_id: null, sort_index: 0 },
      { id: 'sub1', title: 'Sub 1', parent_solution_id: 'sol1', sort_index: 0 },
      { id: 'sub2', title: 'Sub 2', parent_solution_id: 'sol1', sort_index: 1 }
    ];
    const nested = api.nestSolutions(flat);
    expect(nested).toHaveLength(1);
    expect(nested[0].id).toBe('sol1');
    expect(nested[0].subSolutions).toHaveLength(2);
    expect(nested[0].subSolutions.map((s) => s.id)).toEqual(['sub1', 'sub2']);
  });

  it('supports camelCase parentSolutionId', () => {
    const flat = [
      { id: 'sol1', title: 'Root', parentSolutionId: null },
      { id: 'sub1', title: 'Sub', parentSolutionId: 'sol1' }
    ];
    const nested = api.nestSolutions(flat);
    expect(nested).toHaveLength(1);
    expect(nested[0].subSolutions).toHaveLength(1);
    expect(nested[0].subSolutions[0].id).toBe('sub1');
  });

  it('sorts roots and subSolutions by sort_index / sortIndex', () => {
    const flat = [
      { id: 'b', title: 'B', parent_solution_id: null, sort_index: 1 },
      { id: 'a', title: 'A', parent_solution_id: null, sort_index: 0 },
      { id: 'sub2', title: 'Sub2', parent_solution_id: 'a', sort_index: 1 },
      { id: 'sub1', title: 'Sub1', parent_solution_id: 'a', sort_index: 0 }
    ];
    const nested = api.nestSolutions(flat);
    expect(nested.map((s) => s.id)).toEqual(['a', 'b']);
    expect(nested[0].subSolutions.map((s) => s.id)).toEqual(['sub1', 'sub2']);
  });

  it('promote: solution with parent_solution_id null appears as root', () => {
    const flat = [
      { id: 'sol1', title: 'Parent', parent_solution_id: null },
      { id: 'sub1', title: 'Sub', parent_solution_id: 'sol1' }
    ];
    const nested = api.nestSolutions(flat);
    expect(nested).toHaveLength(1);
    expect(nested[0].subSolutions).toHaveLength(1);

    const promoted = [
      { id: 'sol1', title: 'Parent', parent_solution_id: null },
      { id: 'sub1', title: 'Sub', parent_solution_id: null }
    ];
    const afterPromote = api.nestSolutions(promoted);
    expect(afterPromote).toHaveLength(2);
    expect(afterPromote.map((s) => s.id)).toContain('sub1');
    expect(afterPromote.find((s) => s.id === 'sub1').subSolutions).toEqual([]);
  });

  it('demote: setting parent_solution_id nests solution under parent', () => {
    const flat = [
      { id: 'sol1', title: 'A', parent_solution_id: null },
      { id: 'sol2', title: 'B', parent_solution_id: null }
    ];
    const nested = api.nestSolutions(flat);
    expect(nested).toHaveLength(2);

    const demoted = [
      { id: 'sol1', title: 'A', parent_solution_id: null },
      { id: 'sol2', title: 'B', parent_solution_id: 'sol1' }
    ];
    const afterDemote = api.nestSolutions(demoted);
    expect(afterDemote).toHaveLength(1);
    expect(afterDemote[0].subSolutions).toHaveLength(1);
    expect(afterDemote[0].subSolutions[0].id).toBe('sol2');
  });
});
