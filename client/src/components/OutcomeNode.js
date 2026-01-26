import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import './TreeNode.css';
import EntityForm from './EntityForm';
import OpportunityNode from './OpportunityNode';
import Comments from './Comments';
import NoteLinks from './NoteLinks';
import api from '../services/supabaseApi';

function OutcomeNode({ outcome, expandedNodes, onToggle, onUpdate, currentUser, teams = [], users = [], onNavigateToNote }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const isExpanded = expandedNodes.has(outcome.id);

  const getOwnerName = (ownerId) => {
    if (!ownerId) return null;
    const user = users.find(u => u.id === ownerId);
    return user ? user.name : ownerId;
  };

  const handleToggle = () => {
    onToggle(outcome.id);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this outcome and all its children?')) {
      try {
        await api.deleteOutcome(outcome.id);
        onUpdate();
      } catch (error) {
        console.error('Error deleting outcome:', error);
        alert(error.message || 'Failed to delete outcome');
      }
    }
  };

  const handleSave = async (data) => {
    try {
      await api.updateOutcome(outcome.id, data);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating outcome:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update outcome';
      alert(errorMessage);
    }
  };

  const handleAddOpportunity = async (data) => {
    try {
      await api.createOpportunity(outcome.id, data);
      setShowAddForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      alert('Failed to create opportunity');
    }
  };

  return (
    <div className="tree-node outcome-node">
      <div className="node-header" onClick={handleToggle}>
        <div className="node-content">
          <span className="node-icon">
            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </span>
          <span className="node-type">Outcome</span>
          {isEditing ? (
            <EntityForm
              title={outcome.title}
              description={outcome.description}
              owner={outcome.owner}
              teamId={outcome.teamId}
              startDate={outcome.startDate}
              endDate={outcome.endDate}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              currentUser={currentUser}
              teams={teams}
              showTeam={true}
            />
          ) : (
            <>
              <span className="node-title">{outcome.title}</span>
              {outcome.owner && (
                <span className="node-owner">Owner: {getOwnerName(outcome.owner)}</span>
              )}
              {outcome.startDate && outcome.endDate && (
                <span className="node-dates">
                  {new Date(outcome.startDate).toLocaleDateString()} - {new Date(outcome.endDate).toLocaleDateString()}
                </span>
              )}
              {outcome.description && (
                <span className="node-description">{outcome.description}</span>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <div className="node-actions" onClick={(e) => e.stopPropagation()}>
            <NoteLinks
              entityId={outcome.id}
              entityType="outcome"
              onNavigateToNote={onNavigateToNote}
            />
            <Comments
              entityId={outcome.id}
              entityType="outcome"
              comments={outcome.comments}
              currentUser={currentUser}
              onUpdate={onUpdate}
            />
            <button onClick={() => setIsEditing(true)} className="btn-icon" title="Edit">
              <FaEdit />
            </button>
            <button onClick={handleDelete} className="btn-icon btn-danger" title="Delete">
              <FaTrash />
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-icon btn-add" title="Add Opportunity">
              <FaPlus />
            </button>
          </div>
        )}
      </div>
      {showAddForm && (
        <div className="add-form-container">
          <EntityForm
            onSave={handleAddOpportunity}
            onCancel={() => setShowAddForm(false)}
            placeholderTitle="New Opportunity"
            currentUser={currentUser}
            parentStartDate={outcome.startDate}
            parentEndDate={outcome.endDate}
          />
        </div>
      )}
      {isExpanded && (
        <div className="node-children">
          {outcome.opportunities && outcome.opportunities.length > 0 ? (
            outcome.opportunities.map(opportunity => (
              <OpportunityNode
                key={opportunity.id}
                opportunity={opportunity}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onUpdate={onUpdate}
                currentUser={currentUser}
                users={users}
                parentStartDate={outcome.startDate}
                parentEndDate={outcome.endDate}
                onNavigateToNote={onNavigateToNote}
              />
            ))
          ) : (
            <div className="empty-children">No opportunities yet</div>
          )}
        </div>
      )}
    </div>
  );
}

export default OutcomeNode;

