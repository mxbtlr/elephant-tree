import React, { forwardRef } from 'react';
import { FaPlus } from 'react-icons/fa';
import './AddOutcomeButton.css';

const AddOutcomeButton = forwardRef(function AddOutcomeButton(
  { onCreate, label = '+ Outcome', disabled = false },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onCreate?.();
      }}
      className="add-outcome-btn"
      disabled={disabled}
      title={disabled ? 'Create or select a Decision Space first' : undefined}
      data-onboarding="add-outcome"
    >
      <FaPlus /> {label}
    </button>
  );
});

export default AddOutcomeButton;

