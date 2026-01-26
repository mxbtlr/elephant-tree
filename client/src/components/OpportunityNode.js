import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import './TreeNode.css';
import EntityForm from './EntityForm';
import SolutionNode from './SolutionNode';
import Comments from './Comments';
import NoteLinks from './NoteLinks';
import api from '../services/supabaseApi';

function OpportunityNode({ opportunity, expandedNodes, onToggle, onUpdate, currentUser, users = [], parentStartDate, parentEndDate, onNavigateToNote }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddOpportunityForm, setShowAddOpportunityForm] = useState(false);
  const isExpanded = expandedNodes.has(opportunity.id);

  const getOwnerName = (ownerId) => {
    if (!ownerId) return null;
    const user = users.find(u => u.id === ownerId);
    return user ? user.name : ownerId;
  };

  const handleToggle = () => {
    onToggle(opportunity.id);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this opportunity and all its children?')) {
      try {
        await api.deleteOpportunity(opportunity.id);
        onUpdate();
      } catch (error) {
        console.error('Error deleting opportunity:', error);
        alert('Failed to delete opportunity');
      }
    }
  };

  const handleSave = async (data) => {
    try {
      await api.updateOpportunity(opportunity.id, data);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating opportunity:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update opportunity';
      alert(errorMessage);
    }
  };

  const handleAddSolution = async (data) => {
    try {
      await api.createSolution(opportunity.id, data);
      setShowAddForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating solution:', error);
      alert('Failed to create solution');
    }
  };

  const handleAddOpportunity = async (data) => {
    try {
      await api.createNestedOpportunity(opportunity.id, data);
      setShowAddOpportunityForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating nested opportunity:', error);
      alert('Failed to create opportunity');
    }
  };

  return (
    <div className="tree-node opportunity-node">
      <div className="node-header" onClick={handleToggle}>
        <div className="node-content">
          <span className="node-icon">
            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </span>
          <span className="node-type">Opportunity</span>
          {isEditing ? (
            <EntityForm
              title={opportunity.title}
              description={opportunity.description}
              owner={opportunity.owner}
              startDate={opportunity.startDate}
              endDate={opportunity.endDate}
              parentStartDate={parentStartDate}
              parentEndDate={parentEndDate}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              currentUser={currentUser}
            />
          ) : (
            <>
              <span className="node-title">{opportunity.title}</span>
              {opportunity.owner && (
                <span className="node-owner">Owner: {getOwnerName(opportunity.owner)}</span>
              )}
              {opportunity.startDate && opportunity.endDate && (
                <span className="node-dates">
                  {new Date(opportunity.startDate).toLocaleDateString()} - {new Date(opportunity.endDate).toLocaleDateString()}
                </span>
              )}
              {opportunity.description && (
                <span className="node-description">{opportunity.description}</span>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <div className="node-actions" onClick={(e) => e.stopPropagation()}>
            <NoteLinks
              entityId={opportunity.id}
              entityType="opportunity"
              onNavigateToNote={onNavigateToNote}
            />
            <Comments
              entityId={opportunity.id}
              entityType="opportunity"
              comments={opportunity.comments}
              currentUser={currentUser}
              onUpdate={onUpdate}
            />
            <button onClick={() => setIsEditing(true)} className="btn-icon" title="Edit">
              <FaEdit />
            </button>
            <button onClick={handleDelete} className="btn-icon btn-danger" title="Delete">
              <FaTrash />
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-icon btn-add" title="Add Solution">
              <FaPlus />
            </button>
            <button onClick={() => setShowAddOpportunityForm(!showAddOpportunityForm)} className="btn-icon btn-add" title="Add Nested Opportunity">
              <FaPlus /> Opp
            </button>
          </div>
        )}
      </div>
      {showAddForm && (
        <div className="add-form-container">
          <EntityForm
            onSave={handleAddSolution}
            onCancel={() => setShowAddForm(false)}
            placeholderTitle="New Solution"
            currentUser={currentUser}
            parentStartDate={opportunity.startDate || parentStartDate}
            parentEndDate={opportunity.endDate || parentEndDate}
          />
        </div>
      )}
      {showAddOpportunityForm && (
        <div className="add-form-container">
          <EntityForm
            onSave={handleAddOpportunity}
            onCancel={() => setShowAddOpportunityForm(false)}
            placeholderTitle="New Opportunity"
            currentUser={currentUser}
            parentStartDate={opportunity.startDate || parentStartDate}
            parentEndDate={opportunity.endDate || parentEndDate}
          />
        </div>
      )}
      {isExpanded && (
        <div className="node-children">
          {opportunity.opportunities && opportunity.opportunities.length > 0 && (
            opportunity.opportunities.map(nestedOpp => (
              <OpportunityNode
                key={nestedOpp.id}
                opportunity={nestedOpp}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onUpdate={onUpdate}
                currentUser={currentUser}
                users={users}
                parentStartDate={opportunity.startDate || parentStartDate}
                parentEndDate={opportunity.endDate || parentEndDate}
                onNavigateToNote={onNavigateToNote}
              />
            ))
          )}
          {opportunity.solutions && opportunity.solutions.length > 0 ? (
            opportunity.solutions.map(solution => (
              <SolutionNode
                key={solution.id}
                solution={solution}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onUpdate={onUpdate}
                currentUser={currentUser}
                users={users}
                parentStartDate={opportunity.startDate || parentStartDate}
                parentEndDate={opportunity.endDate || parentEndDate}
                onNavigateToNote={onNavigateToNote}
              />
            ))
          ) : (
            !opportunity.opportunities?.length && <div className="empty-children">No solutions yet</div>
          )}
        </div>
      )}
    </div>
  );
}

export default OpportunityNode;

