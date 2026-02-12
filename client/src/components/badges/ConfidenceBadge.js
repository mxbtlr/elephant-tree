import React from 'react';
import './ConfidenceBadge.css';

const colorMap = {
  low: 'confidence-low',
  medium: 'confidence-medium',
  high: 'confidence-high'
};

function buildConfidenceTooltip(confidence) {
  const explain = confidence?.explain;
  if (!explain) return `${(confidence?.score ?? 0).toFixed(0)}% confidence`;

  const parts = [];
  if (explain.doneTests === 0) {
    parts.push('No decided tests yet.');
  } else {
    const breakdown = [];
    if (explain.pass > 0) breakdown.push(`${explain.pass} passed`);
    if (explain.iterate > 0) breakdown.push(`${explain.iterate} iterate`);
    if (explain.kill > 0) breakdown.push(`${explain.kill} killed`);
    parts.push(`Based on: ${breakdown.join(', ')}.`);
    if (explain.kill > 0) {
      parts.push('Killed tests reduce confidence.');
    }
  }
  parts.push(`Score: ${explain.score.toFixed(0)}% → ${explain.level}.`);
  return parts.join(' ');
}

function ConfidenceBadge({ confidence, showExplanation = false }) {
  if (!confidence) return null;
  const levelClass = colorMap[confidence.level] || 'confidence-low';
  const tooltip = buildConfidenceTooltip(confidence);
  const explain = confidence.explain;

  return (
    <div className={`confidence-badge ${levelClass}`} title={tooltip}>
      <span className="confidence-badge-level">{confidence.level.toUpperCase()}</span>
      {showExplanation && explain && explain.doneTests > 0 && (
        <span className="confidence-badge-detail">
          {explain.pass}P / {explain.iterate}I / {explain.kill}K
        </span>
      )}
    </div>
  );
}

export default ConfidenceBadge;
export { buildConfidenceTooltip };
