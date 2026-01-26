import React, { useState } from 'react';
import api from '../services/supabaseApi';
import './CreateDecisionSpaceModal.css';

function CreateDecisionSpaceModal({ onClose, onCreated, workspaceId }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (name.trim().length < 2) return;
    setIsSaving(true);
    try {
      const space = await api.createDecisionSpace(workspaceId, {
        name: name.trim(),
        description: description.trim()
      });
      onCreated?.(space);
    } catch (error) {
      alert(error.message || 'Failed to create decision space');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workspace-modal-backdrop" onClick={onClose}>
      <div className="create-space-modal" onClick={(event) => event.stopPropagation()}>
        <div className="create-space-header">New Decision Space</div>
        <input
          placeholder="Growth"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <textarea
          placeholder="Short description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
        <div className="create-space-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleCreate} disabled={isSaving || name.trim().length < 2}>
            {isSaving ? 'Creating…' : 'Create Decision Space'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateDecisionSpaceModal;
