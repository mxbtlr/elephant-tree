import React, { useState, useEffect, useRef } from 'react';
import './ConfidenceScorePopover.css';

function ConfidenceScorePopover({ nodeKey, nodeType, currentScore, onSave, onClose, anchorRef }) {
  const [value, setValue] = useState(currentScore != null ? Number(currentScore) : 50);
  const [inputStr, setInputStr] = useState(currentScore != null ? String(currentScore) : '50');
  const popoverRef = useRef(null);

  useEffect(() => {
    const n = currentScore != null ? Number(currentScore) : 50;
    setValue(n);
    setInputStr(String(n));
  }, [currentScore, nodeKey]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && (!anchorRef?.current || !anchorRef.current.contains(e.target))) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorRef]);

  const handleInputChange = (e) => {
    const s = e.target.value.replace(/\D/g, '').slice(0, 3);
    setInputStr(s);
    const n = s === '' ? 0 : Math.min(100, Math.max(0, parseInt(s, 10)));
    setValue(isNaN(n) ? 0 : n);
  };

  const handleSliderChange = (e) => {
    const n = parseInt(e.target.value, 10);
    setValue(n);
    setInputStr(String(n));
  };

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  return (
    <div className="confidence-score-popover" ref={popoverRef}>
      <div className="confidence-score-popover-title">Confidence (0–100)</div>
      <div className="confidence-score-popover-slider-row">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={handleSliderChange}
          className="confidence-score-popover-slider"
        />
      </div>
      <div className="confidence-score-popover-input-row">
        <input
          type="text"
          inputMode="numeric"
          value={inputStr}
          onChange={handleInputChange}
          onBlur={() => setInputStr(String(Math.min(100, Math.max(0, value))))}
          className="confidence-score-popover-input"
        />
        <span className="confidence-score-popover-suffix">%</span>
      </div>
      <div className="confidence-score-popover-actions">
        <button type="button" className="confidence-score-popover-clear" onClick={handleClear}>
          Clear
        </button>
        <button type="button" className="confidence-score-popover-save" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}

export default ConfidenceScorePopover;
