const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getRecencyMultiplier = (dateValue) => {
  if (!dateValue) return 0.7;
  const now = Date.now();
  const diffDays = (now - new Date(dateValue).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 14) return 1.0;
  if (diffDays <= 45) return 0.85;
  return 0.7;
};

const getEvidenceMultiplier = (evidenceItems) => {
  if (!evidenceItems || evidenceItems.length === 0) return 0.6;
  const scores = evidenceItems.map((item) => {
    if (item.quality === 'high') return 1.2;
    if (item.quality === 'medium') return 1.0;
    return 0.8;
  });
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return avg;
};

const normalizeDecision = (value) => {
  if (value == null || value === '') return null;
  const v = String(value).toLowerCase().trim();
  if (v === 'pass' || v === 'iterate' || v === 'kill') return v;
  return null;
};

const getDecisionWeight = (decision) => {
  if (decision === 'pass') return 1.0;
  if (decision === 'iterate') return 0.3;
  if (decision === 'kill') return -1.0; // killed tests strongly reduce confidence
  return 0;
};

const getConfidenceLevel = (score, explain) => {
  // Any kill with no pass → low; 2+ kills → low regardless of score
  if (explain && explain.kill > 0 && explain.pass === 0) return 'low';
  if (explain && explain.kill >= 2) return 'low';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const computeConfidenceForTests = (tests, evidenceByTest = {}) => {
  // Count tests that have a result decision (pass/iterate/kill), not status
  const decidedTests = tests.filter((test) => {
    const decision = normalizeDecision(test.resultDecision || test.result_decision);
    if (!decision) return false;
    const hasOpenTodos = typeof test.todoTotal === 'number' && test.todoTotal > 0 && (test.todoDone || 0) < test.todoTotal;
    if (hasOpenTodos) return false; // ongoing doesn't count as decided
    return true;
  });

  let pass = 0;
  let iterate = 0;
  let kill = 0;
  let sumContribution = 0;

  decidedTests.forEach((test) => {
    const decision = normalizeDecision(test.resultDecision || test.result_decision);
    if (decision === 'pass') pass += 1;
    if (decision === 'iterate') iterate += 1;
    if (decision === 'kill') kill += 1;

    const baseWeight = getDecisionWeight(decision);
    const evidenceMultiplier = getEvidenceMultiplier(evidenceByTest[test.id]);
    const recencyMultiplier = getRecencyMultiplier(
      test.updatedAt || test.updated_at || test.createdAt || test.created_at
    );
    sumContribution += baseWeight * evidenceMultiplier * recencyMultiplier;
  });

  const N = decidedTests.length;
  const raw = N === 0 ? 0 : sumContribution / N;
  let score = clamp(50 + 50 * raw, 0, 100);
  score = clamp(score + clamp((N - 1) * 3, 0, 12), 0, 100);

  const explain = {
    score,
    doneTests: N,
    pass,
    iterate,
    kill
  };
  const level = getConfidenceLevel(score, explain);
  explain.level = level;

  return {
    score,
    level,
    explain
  };
};

export const aggregateConfidence = (childScores = []) => {
  if (childScores.length === 0) {
    return { score: 50, level: getConfidenceLevel(50, null), explain: null };
  }
  const avg = childScores.reduce((sum, item) => sum + item.score, 0) / childScores.length;
  const score = clamp(avg, 0, 100);
  return { score, level: getConfidenceLevel(score, null), explain: null };
};
