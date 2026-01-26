import React, { useState, useEffect } from 'react';
import { FaTimes, FaRocket, FaList, FaPlus, FaChevronDown, FaChevronRight, FaCheckCircle, FaFlask } from 'react-icons/fa';
import CampaignCard from './CampaignCard';
import ExperimentsTab from './ExperimentsTab';
import api from '../services/supabaseApi';
import './SolutionExecutionPanel.css';

function SolutionExecutionPanel({ solution, onClose, currentUser, users = [], onUpdate }) {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());

  useEffect(() => {
    loadCampaigns();
  }, [solution?.id]);

  const loadCampaigns = async () => {
    if (!solution?.id) return;
    try {
      setLoading(true);
      const data = await api.getCampaigns(solution.id);
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (campaignData) => {
    try {
      await api.createCampaign(solution.id, campaignData);
      setShowCreateCampaign(false);
      await loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMessage = error.message || 'Failed to create campaign';
      alert(errorMessage);
    }
  };

  const handleUpdateCampaign = async (campaignId, data) => {
    try {
      await api.updateCampaign(campaignId, data);
      await loadCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this sprint and all its tasks?')) return;
    try {
      await api.deleteCampaign(campaignId);
      await loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleTaskUpdate = async () => {
    await loadCampaigns();
    // Preserve expanded state - campaigns will re-render but expanded state is maintained
  };

  const toggleCampaignExpanded = (campaignId) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  // Calculate execution summary
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalTasks = campaigns.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
  const openTasks = campaigns.reduce((sum, c) => 
    sum + (c.tasks?.filter(t => t.status !== 'done').length || 0), 0
  );

  return (
    <div className="execution-panel-overlay" onClick={onClose}>
      <div className="execution-panel" onClick={(e) => e.stopPropagation()}>
        <div className="execution-panel-header">
          <div>
            <h2>{solution?.title || 'Execution'}</h2>
            <p className="execution-panel-subtitle">Sprints & Tasks</p>
          </div>
          <button className="execution-panel-close" onClick={onClose} title="Close">
            <FaTimes />
          </button>
        </div>

        <div className="execution-panel-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            <FaList /> Overview
          </button>
          <button 
            className={activeTab === 'campaigns' ? 'active' : ''}
            onClick={() => setActiveTab('campaigns')}
          >
            <FaRocket /> Sprints
          </button>
          <button 
            className={activeTab === 'experiments' ? 'active' : ''}
            onClick={() => setActiveTab('experiments')}
          >
            <FaFlask /> Experiments
          </button>
        </div>

        <div className="execution-panel-content">
          {activeTab === 'overview' && (
            <div className="execution-overview">
              <div className="execution-summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Total Sprints</div>
                  <div className="summary-value">{totalCampaigns}</div>
                  <div className="summary-detail">{activeCampaigns} active</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Total Tasks</div>
                  <div className="summary-value">{totalTasks}</div>
                  <div className="summary-detail">{openTasks} open</div>
                </div>
              </div>

              {campaigns.length > 0 && (
                <div className="execution-campaigns-preview">
                  <h3>Recent Sprints</h3>
                  {campaigns.slice(0, 3).map(campaign => (
                    <div key={campaign.id} className="campaign-preview-item">
                      <div className="campaign-preview-title">{campaign.title}</div>
                      <div className="campaign-preview-meta">
                        <span className={`status-badge status-${campaign.status}`}>
                          {campaign.status}
                        </span>
                        <span className="task-count">
                          {campaign.tasks?.length || 0} tasks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="execution-campaigns">
              <div className="execution-campaigns-header">
                <h3>Sprints</h3>
                {!showCreateCampaign && (
                  <button 
                    className="btn-primary"
                    onClick={() => setShowCreateCampaign(true)}
                  >
                    <FaPlus /> Add Sprint
                  </button>
                )}
              </div>

              {showCreateCampaign && (
                <div className="create-campaign-form">
                  <CampaignForm
                    onSave={handleCreateCampaign}
                    onCancel={() => setShowCreateCampaign(false)}
                  />
                </div>
              )}

              {loading ? (
                <div className="loading">Loading sprints...</div>
              ) : campaigns.length === 0 ? (
                <div className="empty-state">
                  <FaRocket className="empty-icon" />
                  <p>No sprints yet</p>
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowCreateCampaign(true)}
                  >
                    Create your first sprint
                  </button>
                </div>
              ) : (
                <div className="campaigns-list">
                  {campaigns.map(campaign => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onUpdate={handleUpdateCampaign}
                      onDelete={handleDeleteCampaign}
                      onTaskUpdate={handleTaskUpdate}
                      currentUser={currentUser}
                      users={users}
                      isExpanded={expandedCampaigns.has(campaign.id)}
                      onToggleExpanded={() => toggleCampaignExpanded(campaign.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'experiments' && (
            <ExperimentsTab solution={solution} currentUser={currentUser} />
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      startDate: startDate || null,
      endDate: endDate || null
    });
    setTitle('');
    setDescription('');
    setStatus('planned');
    setStartDate('');
    setEndDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="campaign-form">
      <input
        type="text"
        placeholder="Sprint title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="campaign-form-input"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="campaign-form-textarea"
      />
      <div className="campaign-form-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="done">Done</option>
          <option value="archived">Archived</option>
        </select>
        <input
          type="date"
          placeholder="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          placeholder="End date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="campaign-form-actions">
        <button type="submit" className="btn-primary">Create Sprint</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default SolutionExecutionPanel;
