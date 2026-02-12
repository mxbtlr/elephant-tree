import { computeConfidenceForTests } from './computeConfidence';

const safeArray = (value) => (Array.isArray(value) ? value : []);

function getSolutionTests(sol, nodeOverrides) {
  return safeArray(sol.tests).map((test) => {
    const override = nodeOverrides[`test:${test.id}`];
    return override ? { ...test, ...override } : test;
  });
}

function walkSolutions(sols, confidenceMap, opportunityTests, outcomeTests, evidenceByTest, nodeOverrides) {
  safeArray(sols).forEach((sol) => {
    const tests = getSolutionTests(sol, nodeOverrides);
    opportunityTests.push(...tests);
    outcomeTests.push(...tests);
    const result = computeConfidenceForTests(tests, evidenceByTest);
    confidenceMap[`solution:${sol.id}`] = result;
    walkSolutions(sol.subSolutions, confidenceMap, opportunityTests, outcomeTests, evidenceByTest, nodeOverrides);
  });
}

function walkOpportunities(opps, confidenceMap, outcomeTests, evidenceByTest, nodeOverrides) {
  safeArray(opps).forEach((opp) => {
    const opportunityTests = [];
    walkSolutions(opp.solutions, confidenceMap, opportunityTests, outcomeTests, evidenceByTest, nodeOverrides);
    const oppResult = computeConfidenceForTests(opportunityTests, evidenceByTest);
    confidenceMap[`opportunity:${opp.id}`] = oppResult;
    walkOpportunities(opp.subOpportunities, confidenceMap, outcomeTests, evidenceByTest, nodeOverrides);
  });
}

export const computeConfidenceMap = (outcomes, evidenceByTest = {}, nodeOverrides = {}) => {
  const confidenceMap = {};

  outcomes.forEach((outcome) => {
    const outcomeTests = [];
    walkOpportunities(outcome.opportunities, confidenceMap, outcomeTests, evidenceByTest, nodeOverrides);
    const outcomeResult = computeConfidenceForTests(outcomeTests, evidenceByTest);
    confidenceMap[`outcome:${outcome.id}`] = outcomeResult;
  });

  return confidenceMap;
};
