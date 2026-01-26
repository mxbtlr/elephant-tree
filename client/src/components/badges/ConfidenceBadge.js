import React from 'react';
import './ConfidenceBadge.css';

const colorMap = {
  low: 'confidence-low',
  medium: 'confidence-medium',
  high: 'confidence-high'
};

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const levelClass = colorMap[confidence.level] || 'confidence-low';
  const explain = confidence.explain;
  const tooltip = explain
    ? `Score: ${confidence.score.toFixed(0)}%
Done tests: ${explain.doneTests}
Pass: ${explain.pass} • Iterate: ${explain.iterate} • Kill: ${explain.kill}`
    : `${confidence.score.toFixed(0)}% confidence`;

  return (
    <div className={`confidence-badge ${levelClass}`} title={tooltip}>
      {confidence.level.toUpperCase()}
    </div>
  );
}

export default ConfidenceBadge;
