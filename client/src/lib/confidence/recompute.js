import { computeConfidenceForTests } from './computeConfidence';

const safeArray = (value) => (Array.isArray(value) ? value : []);

export const computeConfidenceMap = (outcomes, evidenceByTest = {}, nodeOverrides = {}) => {
  const confidenceMap = {};

  outcomes.forEach((outcome) => {
    const outcomeTests = [];
    safeArray(outcome.opportunities).forEach((opp) => {
      const opportunityTests = [];
      safeArray(opp.solutions).forEach((sol) => {
        const tests = safeArray(sol.tests).map((test) => {
          const override = nodeOverrides[`test:${test.id}`];
          return override ? { ...test, ...override } : test;
        });
        opportunityTests.push(...tests);
        outcomeTests.push(...tests);
        const result = computeConfidenceForTests(tests, evidenceByTest);
        confidenceMap[`solution:${sol.id}`] = result;
      });
      const oppResult = computeConfidenceForTests(opportunityTests, evidenceByTest);
      confidenceMap[`opportunity:${opp.id}`] = oppResult;
    });
    const outcomeResult = computeConfidenceForTests(outcomeTests, evidenceByTest);
    confidenceMap[`outcome:${outcome.id}`] = outcomeResult;
  });

  return confidenceMap;
};
