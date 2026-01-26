import React, { useState, useEffect } from 'react';
import { FaUsers, FaPlus, FaTrash, FaUserPlus, FaUserMinus, FaCrown, FaEye, FaUser, FaTimes } from 'react-icons/fa';
import api from '../services/supabaseApi';
import './Teams.css';

function Teams({ currentUser, onTeamUpdate }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: '', description: '' });
  const [addMemberData, setAddMemberData] = useState({ userEmail: '', role: 'member' });

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await api.getTeams();
      setTeams(data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load teams');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId) => {
    try {
      const members = await api.getTeamMembers(teamId);
      setTeamMembers(members || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team members');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!createFormData.name.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const newTeam = await api.createTeam({
        name: createFormData.name.trim(),
        description: createFormData.description.trim()
      });
      setSuccess('Team created successfully!');
      setCreateFormData({ name: '', description: '' });
      setShowCreateForm(false);
      await loadTeams();
      setSelectedTeam(newTeam);
      if (onTeamUpdate) onTeamUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addMemberData.userEmail.trim()) {
      setError('User email is required');
      return;
    }

    try {
      await api.addTeamMember(selectedTeam.id, addMemberData.userEmail.trim(), addMemberData.role);
      setSuccess('Member added successfully!');
      setAddMemberData({ userEmail: '', role: 'member' });
      setShowAddMemberForm(false);
      
      // Reload data, but handle errors gracefully
      try {
        await loadTeamMembers(selectedTeam.id);
      } catch (err) {
        console.error('Error reloading team members:', err);
        // Don't show error to user, just log it
      }
      try {
        await loadTeams();
      } catch (err) {
        console.error('Error reloading teams:', err);
        // Don't show error to user, just log it
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      // Only show error if it's not a 401 (which would trigger logout)
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to add member');
      }
      // If it's a 401, the interceptor will handle logout
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await api.updateTeamMember(selectedTeam.id, memberId, newRole);
      setSuccess('Member role updated!');
      // Reload data, but handle errors gracefully
      try {
        await loadTeamMembers(selectedTeam.id);
      } catch (err) {
        console.error('Error reloading team members:', err);
      }
      try {
        await loadTeams();
      } catch (err) {
        console.error('Error reloading teams:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to update member role');
      }
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await api.removeTeamMember(selectedTeam.id, memberId);
      setSuccess('Member removed successfully!');
      // Reload data, but handle errors gracefully
      try {
        await loadTeamMembers(selectedTeam.id);
      } catch (err) {
        console.error('Error reloading team members:', err);
      }
      try {
        await loadTeams();
      } catch (err) {
        console.error('Error reloading teams:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to remove member');
      }
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteTeam(teamId);
      setSuccess('Team deleted successfully!');
      setSelectedTeam(null);
      await loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to leave this team?')) {
      return;
    }

    try {
      await api.leaveTeam(teamId);
      setSuccess('Left team successfully!');
      setSelectedTeam(null);
      await loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave team');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'lead':
        return <FaCrown className="role-icon lead" />;
      case 'member':
        return <FaUser className="role-icon member" />;
      case 'viewer':
        return <FaEye className="role-icon viewer" />;
      default:
        return null;
    }
  };

  const canManageTeam = (team) => {
    return team.userRole === 'lead' || currentUser?.role === 'admin';
  };

  if (loading) {
    return <div className="teams-loading">Loading teams...</div>;
  }

  return (
    <div className="teams-container">
      <div className="teams-header">
        <h2>Teams</h2>
        <button 
          className="btn-create-team" 
          onClick={() => setShowCreateForm(true)}
        >
          <FaPlus /> Create Team
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Team</h3>
              <button className="btn-close" onClick={() => setShowCreateForm(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  className="form-input"
                  placeholder="Enter team name"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  className="form-input"
                  placeholder="Optional team description"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="teams-layout">
        <div className="teams-list">
          {teams.length === 0 ? (
            <div className="empty-state">
              <FaUsers size={48} />
              <p>No teams yet</p>
              <p className="empty-state-subtitle">Create a team to start collaborating</p>
            </div>
          ) : (
            teams.map(team => (
              <div
                key={team.id}
                className={`team-card ${selectedTeam?.id === team.id ? 'selected' : ''}`}
                onClick={() => setSelectedTeam(team)}
              >
                <div className="team-card-header">
                  <h3>{team.name}</h3>
                  {getRoleIcon(team.userRole)}
                </div>
                {team.description && (
                  <p className="team-description">{team.description}</p>
                )}
                <div className="team-card-footer">
                  <span className="team-member-count">
                    <FaUsers /> {team.memberCount || 0} members
                  </span>
                  <span className="team-role-badge">{team.userRole}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedTeam && (
          <div className="team-details">
            <div className="team-details-header">
              <div>
                <h3>{selectedTeam.name}</h3>
                {selectedTeam.description && (
                  <p className="team-description">{selectedTeam.description}</p>
                )}
              </div>
              <div className="team-actions">
                {canManageTeam(selectedTeam) && (
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteTeam(selectedTeam.id)}
                    title="Delete Team"
                  >
                    <FaTrash /> Delete
                  </button>
                )}
                {!canManageTeam(selectedTeam) && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleLeaveTeam(selectedTeam.id)}
                    title="Leave Team"
                  >
                    <FaUserMinus /> Leave
                  </button>
                )}
              </div>
            </div>

            <div className="team-members-section">
              <div className="section-header">
                <h4>Members</h4>
                {canManageTeam(selectedTeam) && (
                  <button
                    className="btn-add-member"
                    onClick={() => setShowAddMemberForm(true)}
                  >
                    <FaUserPlus /> Add Member
                  </button>
                )}
              </div>

              {showAddMemberForm && (
                <div className="add-member-form">
                  <form onSubmit={handleAddMember}>
                    <div className="form-group">
                      <label>User Email *</label>
                      <input
                        type="email"
                        value={addMemberData.userEmail}
                        onChange={(e) => setAddMemberData({ ...addMemberData, userEmail: e.target.value })}
                        className="form-input"
                        placeholder="user@example.com"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={addMemberData.role}
                        onChange={(e) => setAddMemberData({ ...addMemberData, role: e.target.value })}
                        className="form-input"
                      >
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                        {canManageTeam(selectedTeam) && (
                          <option value="lead">Lead</option>
                        )}
                      </select>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowAddMemberForm(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Add Member
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="members-list">
                {teamMembers.length === 0 ? (
                  <p className="empty-members">No members yet</p>
                ) : (
                  teamMembers.map(member => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        {getRoleIcon(member.role)}
                        <div>
                          <div className="member-name">{member.userName}</div>
                          <div className="member-email">{member.userEmail}</div>
                        </div>
                      </div>
                      <div className="member-actions">
                        {canManageTeam(selectedTeam) && member.userId !== currentUser?.id && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                              className="role-select"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="member">Member</option>
                              <option value="lead">Lead</option>
                            </select>
                            <button
                              className="btn-icon-danger"
                              onClick={() => handleRemoveMember(member.id)}
                              title="Remove Member"
                            >
                              <FaUserMinus />
                            </button>
                          </>
                        )}
                        {member.userId === currentUser?.id && (
                          <span className="current-user-badge">You</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Teams;

