export const NODE_TYPES = ['outcome', 'opportunity', 'solution', 'test'];

export const allowedChildren = {
  outcome: ['opportunity'],
  opportunity: ['solution'],
  solution: ['test'],
  test: []
};

export const nodeTypeLabels = {
  outcome: 'Outcome',
  opportunity: 'Opportunity',
  solution: 'Solution',
  test: 'Test'
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

export const MAX_CHILDREN_VISIBLE = 8;

export const getNodeKey = (type, id) => `${type}:${id}`;

export const parseNodeKey = (key) => {
  if (!key) return null;
  const [type, id] = key.split(':');
  if (!type || !id) return null;
  return { type, id };
};
