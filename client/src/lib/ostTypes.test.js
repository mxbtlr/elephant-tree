import {
  NODE_TYPES,
  allowedChildren,
  nodeTypeLabels,
  DEFAULT_TITLES,
  getNodeKey,
  parseNodeKey,
  clampConfidenceScore,
  MAX_CHILDREN_VISIBLE,
  TEST_STATUS_OPTIONS,
  normalizeTestStatus,
  getTestStatusLabel,
  RESULT_DECISION_OPTIONS,
  normalizeResultDecision,
  getResultDecisionLabel
} from './ostTypes';

describe('ostTypes', () => {
  describe('NODE_TYPES', () => {
    it('includes outcome, opportunity, solution, test', () => {
      expect(NODE_TYPES).toEqual(['outcome', 'opportunity', 'solution', 'test']);
    });
  });

  describe('allowedChildren', () => {
    it('outcome allows only opportunity', () => {
      expect(allowedChildren.outcome).toEqual(['opportunity']);
    });
    it('opportunity allows sub-opportunity and solution', () => {
      expect(allowedChildren.opportunity).toEqual(['opportunity', 'solution']);
    });
    it('solution allows sub-solution and test', () => {
      expect(allowedChildren.solution).toEqual(['solution', 'test']);
    });
    it('test allows no children', () => {
      expect(allowedChildren.test).toEqual([]);
    });
  });

  describe('getNodeKey', () => {
    it('returns type:id', () => {
      expect(getNodeKey('outcome', 'abc-123')).toBe('outcome:abc-123');
      expect(getNodeKey('test', 'xyz')).toBe('test:xyz');
    });
  });

  describe('parseNodeKey', () => {
    it('parses type:id', () => {
      expect(parseNodeKey('outcome:abc-123')).toEqual({ type: 'outcome', id: 'abc-123' });
      expect(parseNodeKey('test:xyz')).toEqual({ type: 'test', id: 'xyz' });
      expect(parseNodeKey('journey:outcome-id:__unassigned__')).toEqual({
        type: 'journey',
        id: 'outcome-id:__unassigned__'
      });
    });
    it('returns null for empty or invalid', () => {
      expect(parseNodeKey('')).toBeNull();
      expect(parseNodeKey(null)).toBeNull();
      expect(parseNodeKey('no-colon')).toBeNull();
      expect(parseNodeKey('only:')).toBeNull();
    });
  });

  describe('constants', () => {
    it('nodeTypeLabels has labels for each type', () => {
      expect(nodeTypeLabels.outcome).toBe('Outcome');
      expect(nodeTypeLabels.test).toBe('Test');
    });
    it('DEFAULT_TITLES has default for each type', () => {
      expect(DEFAULT_TITLES.outcome).toBe('New Outcome');
    });
    it('MAX_CHILDREN_VISIBLE is a number', () => {
      expect(typeof MAX_CHILDREN_VISIBLE).toBe('number');
      expect(MAX_CHILDREN_VISIBLE).toBeGreaterThan(0);
    });
  });

  describe('TEST_STATUS_OPTIONS', () => {
    it('has idea, draft, designed', () => {
      const values = TEST_STATUS_OPTIONS.map((o) => o.value);
      expect(values).toEqual(['idea', 'draft', 'designed']);
      expect(TEST_STATUS_OPTIONS.some((o) => o.label.includes('Designed experiment'))).toBe(true);
    });
  });

  describe('normalizeTestStatus', () => {
    it('returns canonical values', () => {
      expect(normalizeTestStatus('idea')).toBe('idea');
      expect(normalizeTestStatus('draft')).toBe('draft');
      expect(normalizeTestStatus('designed')).toBe('designed');
    });
    it('maps legacy to canonical', () => {
      expect(normalizeTestStatus('planned')).toBe('draft');
      expect(normalizeTestStatus('running')).toBe('designed');
      expect(normalizeTestStatus('active')).toBe('designed');
      expect(normalizeTestStatus('completed')).toBe('designed');
    });
    it('returns draft for empty or unknown', () => {
      expect(normalizeTestStatus('')).toBe('draft');
      expect(normalizeTestStatus(null)).toBe('draft');
    });
  });

  describe('getTestStatusLabel', () => {
    it('returns label for canonical value', () => {
      expect(getTestStatusLabel('idea')).toBe('Idea');
      expect(getTestStatusLabel('draft')).toBe('Draft');
      expect(getTestStatusLabel('designed')).toBe('Designed experiment');
    });
    it('returns label for legacy value', () => {
      expect(getTestStatusLabel('planned')).toBe('Draft');
      expect(getTestStatusLabel('running')).toBe('Designed experiment');
    });
  });

  describe('RESULT_DECISION_OPTIONS', () => {
    it('has ongoing, pass, iterate, kill', () => {
      const values = RESULT_DECISION_OPTIONS.map((o) => o.value);
      expect(values).toEqual(['ongoing', 'pass', 'iterate', 'kill']);
      expect(RESULT_DECISION_OPTIONS.some((o) => o.label.includes('supported'))).toBe(true);
      expect(RESULT_DECISION_OPTIONS.some((o) => o.label.includes('disproven'))).toBe(true);
    });
  });

  describe('normalizeResultDecision', () => {
    it('returns lowercase ongoing, pass, iterate, kill', () => {
      expect(normalizeResultDecision('pass')).toBe('pass');
      expect(normalizeResultDecision('Kill')).toBe('kill');
      expect(normalizeResultDecision('Ongoing')).toBe('ongoing');
    });
    it('returns null for empty or unknown', () => {
      expect(normalizeResultDecision('')).toBeNull();
      expect(normalizeResultDecision(null)).toBeNull();
      expect(normalizeResultDecision('unknown')).toBeNull();
    });
  });

  describe('getResultDecisionLabel', () => {
    it('returns short label for value', () => {
      expect(getResultDecisionLabel('pass')).toBe('Pass');
      expect(getResultDecisionLabel('kill')).toBe('Kill');
      expect(getResultDecisionLabel('ongoing')).toBe('Ongoing');
    });
    it('returns Ongoing for empty or unknown when no open todos', () => {
      expect(getResultDecisionLabel('')).toBe('Ongoing');
      expect(getResultDecisionLabel(null)).toBe('Ongoing');
    });
    it('returns Ongoing when hasOpenTodos', () => {
      expect(getResultDecisionLabel('pass', true)).toBe('Ongoing');
      expect(getResultDecisionLabel(null, true)).toBe('Ongoing');
    });
  });

  describe('clampConfidenceScore', () => {
    it('returns null for null, undefined, or empty string', () => {
      expect(clampConfidenceScore(null)).toBeNull();
      expect(clampConfidenceScore(undefined)).toBeNull();
      expect(clampConfidenceScore('')).toBeNull();
    });
    it('returns 0–100 for valid numbers', () => {
      expect(clampConfidenceScore(0)).toBe(0);
      expect(clampConfidenceScore(100)).toBe(100);
      expect(clampConfidenceScore(50)).toBe(50);
      expect(clampConfidenceScore('72')).toBe(72);
    });
    it('clamps out-of-range values', () => {
      expect(clampConfidenceScore(-1)).toBe(0);
      expect(clampConfidenceScore(101)).toBe(100);
      expect(clampConfidenceScore(150)).toBe(100);
    });
    it('rounds to integer', () => {
      expect(clampConfidenceScore(72.4)).toBe(72);
      expect(clampConfidenceScore(72.6)).toBe(73);
    });
    it('returns null for NaN', () => {
      expect(clampConfidenceScore('nope')).toBeNull();
    });
  });
});
