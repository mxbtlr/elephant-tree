import React from 'react';
import Avatar from './Avatar';
import './TeamDrawer.css';

function TeamDrawer({
  isOpen,
  onClose,
  workspace,
  members = [],
  currentUserId,
  activeMap = {},
  activeIds = new Set()
}) {
  if (!workspace) return null;
  const sorted = [...members].sort((a, b) => {
    if (a.role === 'owner' && b.role !== 'owner') return -1;
    if (b.role === 'owner' && a.role !== 'owner') return 1;
    return (a.profile?.name || a.profile?.email || a.email || '').localeCompare(
      b.profile?.name || b.profile?.email || b.email || ''
    );
  });
  const label = workspace.name || 'Workspace';
  const description = workspace.description || 'Team workspace';

  return (
    <aside className={`team-drawer ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="team-drawer-header">
        <div>
          <div className="team-drawer-title">{label}</div>
          <div className="team-drawer-subtitle">{description}</div>
        </div>
        <button type="button" className="team-drawer-close" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="team-drawer-section">
        <div className="team-drawer-section-title">Members</div>
        <div className="team-drawer-list">
          {sorted.map((member) => {
            const user = member.profile || { id: member.user_id, email: member.email };
            const role = member.role === 'owner' ? 'Owner' : 'Editor';
            const activeLabel = activeMap[member.user_id] || '—';
            const isActive = member.user_id && activeIds.has(member.user_id);
            return (
              <div key={member.id} className="team-drawer-row">
                <Avatar
                  user={user}
                  size={28}
                  isOwner={member.role === 'owner'}
                  showPresence
                  isActive={Boolean(isActive)}
                />
                <div className="team-drawer-info">
                  <div className="team-drawer-name">
                    {user.name || user.email || member.email || 'Member'}
                    {member.user_id === currentUserId && <span className="team-drawer-you">You</span>}
                  </div>
                  <div className="team-drawer-meta">
                    <span>{role}</span>
                    <span>·</span>
                    <span>Working on: {activeLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <div className="team-drawer-empty">No members yet.</div>}
        </div>
      </div>
    </aside>
  );
}

export default TeamDrawer;
