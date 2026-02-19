import React, { forwardRef } from 'react';
import { FaPlus } from 'react-icons/fa';
import './AddOutcomeButton.css';

const AddOutcomeButton = forwardRef(function AddOutcomeButton(
  { onCreate, label = '+ Outcome', disabled = false, creating = false },
  ref
) {
  const isDisabled = disabled || creating;
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled) onCreate?.();
      }}
      className="add-outcome-btn"
      disabled={isDisabled}
      title={disabled ? 'Create or select a Decision Space first' : creating ? 'Creating…' : undefined}
      data-onboarding="add-outcome"
    >
      {creating ? (
        <>
          <span className="add-outcome-btn-spinner" aria-hidden="true" />
          Creating…
        </>
      ) : (
        <>
          <FaPlus /> {label}
        </>
      )}
    </button>
  );
});

export default AddOutcomeButton;

