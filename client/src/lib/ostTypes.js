export const NODE_TYPES = ['outcome', 'opportunity', 'solution', 'test'];

export const allowedChildren = {
  outcome: ['opportunity'],
  opportunity: ['opportunity', 'solution'], // sub-opportunity + solution
  solution: ['solution', 'test'], // sub-solution + test
  test: [],
  journey: ['opportunity']
};

export const nodeTypeLabels = {
  outcome: 'Outcome',
  opportunity: 'Opportunity',
  subOpportunity: 'Sub-Opportunity',
  solution: 'Solution',
  subSolution: 'Sub-Solution',
  test: 'Test',
  journey: 'Journey stage'
};

export const DEFAULT_TITLES = {
  outcome: 'New Outcome',
  opportunity: 'New Opportunity',
  solution: 'New Solution',
  test: 'New Test'
};

export const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'validated', label: 'Validated' },
  { value: 'killed', label: 'Killed' }
];

/** Test/experiment status: idea → draft → designed (design phase, not execution) */
export const TEST_STATUS_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'draft', label: 'Draft' },
  { value: 'designed', label: 'Designed experiment' }
];

/** Normalize legacy or API status to canonical test status (idea / draft / designed) */
export const normalizeTestStatus = (value) => {
  if (!value) return 'draft';
  const v = String(value).toLowerCase().trim();
  if (v === 'idea' || v === 'draft' || v === 'designed') return v;
  if (v === 'planned' || v === 'blocked' || v === 'draft') return 'draft';
  if (v === 'running' || v === 'active' || v === 'testing' || v === 'live') return 'designed';
  if (v === 'done' || v === 'completed' || v === 'done_pass' || v === 'done_iterate' || v === 'done_kill') return 'designed';
  return 'draft';
};

/** Human-readable label for test status (for display in UI) */
export const getTestStatusLabel = (value) => {
  const canonical = normalizeTestStatus(value);
  const option = TEST_STATUS_OPTIONS.find((o) => o.value === canonical);
  return option ? option.label : 'Draft';
};

/** Result decision: ongoing while work is open; otherwise pass / iterate / kill */
export const RESULT_DECISION_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'pass', label: 'Pass — hypothesis supported' },
  { value: 'iterate', label: 'Iterate — refine and retest' },
  { value: 'kill', label: 'Kill — hypothesis disproven' }
];

/** Normalize result decision from API for consistent select value */
export const normalizeResultDecision = (value) => {
  if (value == null || value === '') return null;
  const v = String(value).toLowerCase().trim();
  if (v === 'ongoing' || v === 'pass' || v === 'iterate' || v === 'kill') return v;
  return null;
};

/** Human-readable label for result decision (for display in UI). Call with hasOpenTodos to show Ongoing. */
export const getResultDecisionLabel = (value, hasOpenTodos = false) => {
  if (hasOpenTodos) return 'Ongoing';
  const v = normalizeResultDecision(value);
  if (!v || v === 'ongoing') return 'Ongoing';
  const option = RESULT_DECISION_OPTIONS.find((o) => o.value === v);
  return option ? option.label.split(' — ')[0] : v;
};

export const MAX_CHILDREN_VISIBLE = 8;

export const getNodeKey = (type, id) => `${type}:${id}`;

export const parseNodeKey = (key) => {
  if (!key) return null;
  const i = key.indexOf(':');
  if (i <= 0 || i === key.length - 1) return null;
  const type = key.slice(0, i);
  const id = key.slice(i + 1);
  return { type, id };
};

/** Clamp confidence score to 0–100 (integer) or null. Used for validation before API/DB. */
export const clampConfidenceScore = (value) => {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
};
