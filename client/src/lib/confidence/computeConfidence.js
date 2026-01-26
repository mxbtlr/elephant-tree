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

const getDecisionWeight = (decision) => {
  if (decision === 'pass') return 1.0;
  if (decision === 'iterate') return 0.3;
  if (decision === 'kill') return -0.8;
  return 0;
};

const getConfidenceLevel = (score) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const computeConfidenceForTests = (tests, evidenceByTest = {}) => {
  const doneTests = tests.filter((test) => {
    const status = test.testStatus || test.status;
    return status === 'done' || status === 'complete';
  });

  let pass = 0;
  let iterate = 0;
  let kill = 0;
  let sumContribution = 0;

  doneTests.forEach((test) => {
    const decision = test.resultDecision || test.result_decision;
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

  const N = doneTests.length;
  const raw = sumContribution / Math.max(1, N);
  let score = clamp(50 + 50 * raw, 0, 100);
  score = clamp(score + clamp((N - 1) * 3, 0, 12), 0, 100);

  return {
    score,
    level: getConfidenceLevel(score),
    explain: {
      score,
      level: getConfidenceLevel(score),
      doneTests: N,
      pass,
      iterate,
      kill
    }
  };
};

export const aggregateConfidence = (childScores = []) => {
  if (childScores.length === 0) {
    return { score: 50, level: getConfidenceLevel(50), explain: null };
  }
  const avg = childScores.reduce((sum, item) => sum + item.score, 0) / childScores.length;
  const score = clamp(avg, 0, 100);
  return { score, level: getConfidenceLevel(score), explain: null };
};
