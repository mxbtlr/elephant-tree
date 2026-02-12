/** Tony Fadell Product Journey stages (canonical enum) */
export const JOURNEY_STAGE_IDS = [
  'awareness',
  'education',
  'acquisition',
  'product',
  'onboarding',
  'usage',
  'support',
  'loyalty'
];

export const JOURNEY_STAGES = [
  { id: 'awareness', label: 'Awareness', sortOrder: 1 },
  { id: 'education', label: 'Education', sortOrder: 2 },
  { id: 'acquisition', label: 'Acquisition', sortOrder: 3 },
  { id: 'product', label: 'Product', sortOrder: 4 },
  { id: 'onboarding', label: 'Onboarding', sortOrder: 5 },
  { id: 'usage', label: 'Usage', sortOrder: 6 },
  { id: 'support', label: 'Support', sortOrder: 7 },
  { id: 'loyalty', label: 'Loyalty', sortOrder: 8 }
];

export const JOURNEY_STAGE_LABEL_BY_ID = Object.fromEntries(
  JOURNEY_STAGES.map((s) => [s.id, s.label])
);

export const UNASSIGNED_STAGE_ID = '__unassigned__';

export function getJourneyStageLabel(id) {
  if (!id || id === UNASSIGNED_STAGE_ID) return 'Unassigned';
  return JOURNEY_STAGE_LABEL_BY_ID[id] || id;
}
