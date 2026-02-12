import React from 'react';
import './Avatar.css';

const getInitials = (user) => {
  const name = user?.name || user?.profile?.name || user?.email || '';
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getAvatarUrl = (user) =>
  user?.avatar_url || user?.avatarUrl || user?.profile?.avatar || user?.avatar || null;

function Avatar({ user, size = 24, isOwner = false, showPresence = false, isActive = false }) {
  const initials = getInitials(user);
  const avatarUrl = getAvatarUrl(user);
  const label = user?.name || user?.email || 'User';
  return (
    <div
      className={`avatar ${isOwner ? 'is-owner' : ''}`}
      style={{ width: size, height: size }}
      title={label}
      aria-label={label}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={label} />
      ) : (
        <span className="avatar-initials" style={{ fontSize: Math.max(9, size * 0.42) }}>
          {initials}
        </span>
      )}
      {showPresence && (
        <span className={`avatar-presence ${isActive ? 'active' : ''}`} />
      )}
    </div>
  );
}

function AvatarGroup({
  users = [],
  max = 3,
  size = 20,
  showPresence = false,
  activeIds = new Set(),
  ownerId = null
}) {
  const visible = users.filter(Boolean).slice(0, max);
  const extra = users.length - visible.length;
  return (
    <div className="avatar-group">
      {visible.map((user) => (
        <Avatar
          key={user.id || user.email}
          user={user}
          size={size}
          isOwner={ownerId && user.id === ownerId}
          showPresence={showPresence}
          isActive={activeIds.has(user.id)}
        />
      ))}
      {extra > 0 && (
        <div className="avatar avatar-extra" style={{ width: size, height: size }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

export default Avatar;
export { AvatarGroup };
