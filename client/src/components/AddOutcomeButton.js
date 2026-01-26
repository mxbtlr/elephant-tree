import React from 'react';
import { FaPlus } from 'react-icons/fa';
import './AddOutcomeButton.css';

function AddOutcomeButton({ onCreate, label = '+ Outcome', disabled = false }) {
  return (
    <button onClick={onCreate} className="add-outcome-btn" disabled={disabled} title={disabled ? 'Create or select a Decision Space first' : undefined}>
      <FaPlus /> {label}
    </button>
  );
}

export default AddOutcomeButton;

