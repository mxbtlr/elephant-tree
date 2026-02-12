import React from 'react';
import TreeCanvas from './TreeCanvas';
import './TreeMode.css';

const groupOutcomes = (outcomes) => {
  const grouped = { noTeam: [], byTeam: {} };
  outcomes.forEach((outcome) => {
    if (outcome.teamId) {
      if (!grouped.byTeam[outcome.teamId]) {
        grouped.byTeam[outcome.teamId] = [];
      }
      grouped.byTeam[outcome.teamId].push(outcome);
    } else {
      grouped.noTeam.push(outcome);
    }
  });
  return grouped;
};

function TreeModeView({ outcomes, treeStructure = 'classic', onUpdate, users, confidenceMap, onAddOutcome }) {
  return (
    <div className="tree-mode-view">
      <TreeCanvas
        outcomes={outcomes}
        treeStructure={treeStructure}
        onUpdate={onUpdate}
        users={users}
        confidenceMap={confidenceMap}
        onAddOutcome={onAddOutcome}
      />
    </div>
  );
}

export default TreeModeView;
