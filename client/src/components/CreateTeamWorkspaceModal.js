import React, { useState } from 'react';
import api from '../services/supabaseApi';
import './CreateTeamWorkspaceModal.css';

function CreateTeamWorkspaceModal({ onClose, onCreated, ownerEmail }) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (name.trim().length < 2) return;
    setIsSaving(true);
    try {
      const workspace = await api.createWorkspace({
        name: name.trim(),
        type: 'team',
        ownerEmail
      });
      onCreated?.(workspace);
    } catch (error) {
      alert(error.message || 'Failed to create team workspace');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="workspace-modal-backdrop" onClick={onClose}>
      <div className="create-team-modal" onClick={(event) => event.stopPropagation()}>
        <div className="create-team-header">Create team workspace</div>
        <input
          placeholder="Product Team"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="create-team-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleCreate} disabled={isSaving || name.trim().length < 2}>
            {isSaving ? 'Creating…' : 'Create team'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTeamWorkspaceModal;
