import React, { useEffect, useState } from 'react';
import api from '../services/supabaseApi';
import './WorkspaceMembersModal.css';

function WorkspaceMembersModal({ workspace, currentUserId, onClose }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    if (!workspace) return;
    setIsLoading(true);
    try {
      const [membersData] = await Promise.all([
        api.listWorkspaceMembers(workspace.id)
      ]);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [workspace]);

  const handleInvite = async () => {
    if (!email || !workspace) return;
    try {
      await api.addMemberByEmail(workspace.id, email);
      setEmail('');
      await loadData();
    } catch (error) {
      alert(error.message || 'Failed to invite member');
    }
  };

  if (!workspace) return null;

  return (
    <div className="workspace-modal-backdrop" onClick={onClose}>
      <div className="workspace-modal" onClick={(event) => event.stopPropagation()}>
        <div className="workspace-modal-header">
          <div>Members · {workspace.name}</div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {workspace.isOwner && (
          <div className="workspace-invite-row">
            <input
              placeholder="Invite by email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="button" onClick={handleInvite}>
              Add member
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="workspace-empty">Loading members…</div>
        ) : (
          <>
            <div className="workspace-section-title">Active members</div>
            {[...members]
              .sort((a, b) => {
                if (a.role === 'owner' && b.role !== 'owner') return -1;
                if (b.role === 'owner' && a.role !== 'owner') return 1;
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (b.status === 'active' && a.status !== 'active') return 1;
                return (a.email || '').localeCompare(b.email || '');
              })
              .map((member) => (
              <div key={member.id} className="workspace-member-row">
                <div>
                  {member.profile?.name || member.profile?.email || member.email}
                  {member.status === 'pending' && (
                    <span className="workspace-pending">Pending — user will join after registering</span>
                  )}
                </div>
                <div className="workspace-member-actions">
                  <span className="workspace-role">{member.role}</span>
                  {workspace.isOwner && member.user_id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => api.removeWorkspaceMember(member.id).then(loadData)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default WorkspaceMembersModal;
