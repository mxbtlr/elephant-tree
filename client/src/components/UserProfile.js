import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaLock, FaTimes, FaSlidersH } from 'react-icons/fa';
import api from '../services/supabaseApi';
import Avatar from './Avatar';
import './UserProfile.css';

function UserProfile({ user, onUpdate, onClose, workspace, workspaceRole }) {
  const [activeTab, setActiveTab] = useState('identity');
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    profile: {
      bio: user.profile?.bio || '',
      avatar: user.profile?.avatar || '',
      badge: user.profile?.badge || '',
      preferences: {
        theme: user.profile?.preferences?.theme || 'light',
        notifications: user.profile?.preferences?.notifications !== false
      }
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const avatarInputRef = useRef(null);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await api.updateProfile(profileData);
      setSuccess('Saved ✓');
      onUpdate(updated);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess('Saved ✓');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-profile-hero">
          <button
            type="button"
            className="user-profile-avatar"
            onClick={() => avatarInputRef.current?.focus()}
          >
            <Avatar user={{ ...user, profile: profileData.profile }} size={72} isOwner />
            <span className="avatar-edit-hint">Edit</span>
          </button>
          <div className="user-profile-hero-info">
            <div className="user-profile-name">{profileData.name || 'Your name'}</div>
            <div className="user-profile-role">
              {workspaceRole || 'Member'} · {workspace?.name || 'Workspace'}
            </div>
            <div className="user-profile-email">{user.email}</div>
          </div>
          <button onClick={onClose} className="btn-close">
            <FaTimes />
          </button>
        </div>

        <div className="user-profile-tabs">
          <button
            className={activeTab === 'identity' ? 'active' : ''}
            onClick={() => setActiveTab('identity')}
          >
            <FaUser /> Identity
          </button>
          <button
            className={`tab-muted ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FaLock /> Security
          </button>
          <button
            className={activeTab === 'preferences' ? 'active' : ''}
            onClick={() => setActiveTab('preferences')}
          >
            <FaSlidersH /> Preferences
          </button>
        </div>

        <div className="user-profile-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {activeTab === 'identity' && (
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Avatar URL</label>
                <input
                  ref={avatarInputRef}
                  type="url"
                  value={profileData.profile.avatar}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    profile: { ...profileData.profile, avatar: e.target.value }
                  })}
                  className="form-input"
                  placeholder="https://..."
                />
                <small>Paste an image URL for now. Uploading comes later.</small>
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={profileData.profile.bio}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    profile: { ...profileData.profile, bio: e.target.value }
                  })}
                  className="form-input"
                  rows="4"
                  placeholder="What do you work on here? A short line about you helps teammates."
                />
              </div>

              <div className="form-group">
                <label>Badge (optional)</label>
                <input
                  type="text"
                  value={profileData.profile.badge}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    profile: {
                      ...profileData.profile,
                      badge: e.target.value
                    }
                  })}
                  className="form-input"
                  placeholder="e.g. Research, Growth, PM"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                {success && <span className="save-indicator">Saved ✓</span>}
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange}>
              <div className="security-note">
                Keep your account secure. Password changes apply globally.
              </div>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="form-input"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="form-input"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                {success && <span className="save-indicator">Saved ✓</span>}
              </div>
            </form>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label>Theme</label>
                <select
                  value={profileData.profile.preferences.theme}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    profile: {
                      ...profileData.profile,
                      preferences: {
                        ...profileData.profile.preferences,
                        theme: e.target.value
                      }
                    }
                  })}
                  className="form-input"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
                <small>More preferences are coming soon.</small>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
                {success && <span className="save-indicator">Saved ✓</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;






