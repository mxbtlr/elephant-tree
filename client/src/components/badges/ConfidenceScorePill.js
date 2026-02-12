import React from 'react';
import './ConfidenceScorePill.css';

/**
 * Small pill for stored confidence score (0-100). Show nothing when null.
 */
function ConfidenceScorePill({ score, className = '' }) {
  if (score == null || score === '') return null;
  const n = Math.min(100, Math.max(0, Number(score)));
  const level = n >= 70 ? 'high' : n >= 40 ? 'medium' : 'low';
  return (
    <span
      className={`confidence-score-pill confidence-score-pill-${level} ${className}`}
      title="Confidence score (0–100)"
    >
      {n}%
    </span>
  );
}

export default ConfidenceScorePill;
