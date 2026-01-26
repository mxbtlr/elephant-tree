import React, { useState, useEffect } from 'react';
import api from '../services/supabaseApi';

function EntityForm({ 
  title = '', 
  description = '', 
  owner = null,
  visibility = 'team',
  teamId = null,
  startDate = null,
  endDate = null,
  parentStartDate = null,
  parentEndDate = null,
  onSave, 
  onCancel, 
  placeholderTitle = 'New Item', 
  currentUser, 
  teams = [],
  showOwner = false,
  showDates = false,
  showVisibility = false,
  showTeam = false
}) {
  const [formTitle, setFormTitle] = useState(title);
  const [formDescription, setFormDescription] = useState(description);
  const [formOwner, setFormOwner] = useState(owner || (currentUser ? currentUser.id : ''));
  const [formVisibility, setFormVisibility] = useState(visibility);
  const [formTeamId, setFormTeamId] = useState(teamId || '');
  const [formStartDate, setFormStartDate] = useState(startDate ? startDate.split('T')[0] : '');
  const [formEndDate, setFormEndDate] = useState(endDate ? endDate.split('T')[0] : '');
  const [dateError, setDateError] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (showOwner) {
      loadUsers();
    }
  }, [showOwner]);

  const loadUsers = async () => {
    try {
      const usersList = await api.getUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const validateDates = () => {
    setDateError('');
    
    if (!formStartDate && !formEndDate) {
      return true; // Dates are optional
    }
    
    if (formStartDate && formEndDate) {
      const start = new Date(formStartDate);
      const end = new Date(formEndDate);
      
      if (start > end) {
        setDateError('Start date must be before end date');
        return false;
      }
      
      // Validate against parent dates if provided
      if (parentStartDate && parentEndDate) {
        const parentStart = new Date(parentStartDate);
        const parentEnd = new Date(parentEndDate);
        
        if (start < parentStart) {
          setDateError('Start date must be within parent period');
          return false;
        }
        if (end > parentEnd) {
          setDateError('End date must be within parent period');
          return false;
        }
      }
    } else if (formStartDate || formEndDate) {
      setDateError('Both start and end dates are required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateDates()) {
      return;
    }
    
    const submitData = {
      title: formTitle,
      description: formDescription,
      owner: showOwner ? formOwner || null : undefined,
      visibility: showVisibility ? formVisibility : undefined,
      teamId: showTeam && formTeamId ? formTeamId : undefined,
      startDate: showDates ? formStartDate || null : undefined,
      endDate: showDates ? formEndDate || null : undefined
    };
    
    onSave(submitData);
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        placeholder={placeholderTitle}
        value={formTitle}
        onChange={(e) => setFormTitle(e.target.value)}
        required
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={formDescription}
        onChange={(e) => setFormDescription(e.target.value)}
      />
      {showOwner && (
        <select
          value={formOwner}
          onChange={(e) => setFormOwner(e.target.value)}
          className="owner-select"
        >
          <option value="">No owner</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
          {currentUser && !users.find(u => u.id === currentUser.id) && (
            <option value={currentUser.id}>{currentUser.name}</option>
          )}
        </select>
      )}
      {showTeam && teams && teams.length > 0 && (
        <div className="team-field">
          <label>Share with Team</label>
          <select
            value={formTeamId}
            onChange={(e) => setFormTeamId(e.target.value)}
            className="team-select"
          >
            <option value="">No team (Personal)</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} {team.userRole === 'lead' ? '(Lead)' : team.userRole === 'member' ? '(Member)' : '(Viewer)'}
              </option>
            ))}
          </select>
          <small>
            {formTeamId 
              ? `This outcome will be shared with the selected team. Team members can ${teams.find(t => t.id === formTeamId)?.userRole === 'viewer' ? 'view' : 'view and edit'} it.`
              : 'This outcome will be personal and only visible to you (unless visibility is set to public).'}
          </small>
        </div>
      )}
      {showVisibility && (
        <div className="visibility-field">
          <label>Visibility</label>
          <select
            value={formVisibility}
            onChange={(e) => setFormVisibility(e.target.value)}
            className="visibility-select"
          >
            <option value="private">Private (Only me)</option>
            <option value="team">Team (Team members)</option>
            <option value="public">Public (Everyone)</option>
          </select>
          <small>
            {formVisibility === 'private' && 'Only you can see this'}
            {formVisibility === 'team' && (formTeamId ? 'Team members can see this' : 'All authenticated users can see this')}
            {formVisibility === 'public' && 'Everyone can see this'}
          </small>
        </div>
      )}
      {showDates && (
        <div className="date-fields">
          <div className="date-field-group">
            <label>Start Date</label>
            <input
              type="date"
              value={formStartDate}
              onChange={(e) => {
                setFormStartDate(e.target.value);
                setDateError('');
              }}
              min={parentStartDate ? parentStartDate.split('T')[0] : undefined}
              max={parentEndDate ? parentEndDate.split('T')[0] : undefined}
              className={dateError ? 'error' : ''}
            />
          </div>
          <div className="date-field-group">
            <label>End Date</label>
            <input
              type="date"
              value={formEndDate}
              onChange={(e) => {
                setFormEndDate(e.target.value);
                setDateError('');
              }}
              min={formStartDate || (parentStartDate ? parentStartDate.split('T')[0] : undefined)}
              max={parentEndDate ? parentEndDate.split('T')[0] : undefined}
              className={dateError ? 'error' : ''}
            />
          </div>
          {dateError && (
            <div className="date-error">{dateError}</div>
          )}
          {parentStartDate && parentEndDate && (
            <div className="parent-date-info">
              Parent period: {new Date(parentStartDate).toLocaleDateString()} - {new Date(parentEndDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="btn-save">Save</button>
        <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
      </div>
    </form>
  );
}

export default EntityForm;

