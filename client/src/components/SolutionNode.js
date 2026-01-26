import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import './TreeNode.css';
import EntityForm from './EntityForm';
import TestNode from './TestNode';
import Comments from './Comments';
import NoteLinks from './NoteLinks';
import api from '../services/supabaseApi';

function SolutionNode({ solution, expandedNodes, onToggle, onUpdate, currentUser, users = [], parentStartDate, parentEndDate, onNavigateToNote }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddSolutionForm, setShowAddSolutionForm] = useState(false);
  const isExpanded = expandedNodes.has(solution.id);

  const getOwnerName = (ownerId) => {
    if (!ownerId) return null;
    const user = users.find(u => u.id === ownerId);
    return user ? user.name : ownerId;
  };

  const handleToggle = () => {
    onToggle(solution.id);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this solution and all its children?')) {
      try {
        await api.deleteSolution(solution.id);
        onUpdate();
      } catch (error) {
        console.error('Error deleting solution:', error);
        alert('Failed to delete solution');
      }
    }
  };

  const handleSave = async (data) => {
    try {
      await api.updateSolution(solution.id, data);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating solution:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update solution';
      alert(errorMessage);
    }
  };

  const handleAddTest = async (data) => {
    try {
      await api.createTest(solution.id, data);
      setShowAddForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create test');
    }
  };

  const handleAddSolution = async (data) => {
    try {
      await api.createNestedSolution(solution.id, data);
      setShowAddSolutionForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating nested solution:', error);
      alert('Failed to create solution');
    }
  };

  return (
    <div className="tree-node solution-node">
      <div className="node-header" onClick={handleToggle}>
        <div className="node-content">
          <span className="node-icon">
            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </span>
          <span className="node-type">Solution</span>
          {isEditing ? (
            <EntityForm
              title={solution.title}
              description={solution.description}
              owner={solution.owner}
              startDate={solution.startDate}
              endDate={solution.endDate}
              parentStartDate={parentStartDate}
              parentEndDate={parentEndDate}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              currentUser={currentUser}
            />
          ) : (
            <>
              <span className="node-title">{solution.title}</span>
              {solution.owner && (
                <span className="node-owner">Owner: {getOwnerName(solution.owner)}</span>
              )}
              {solution.startDate && solution.endDate && (
                <span className="node-dates">
                  {new Date(solution.startDate).toLocaleDateString()} - {new Date(solution.endDate).toLocaleDateString()}
                </span>
              )}
              {solution.description && (
                <span className="node-description">{solution.description}</span>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <div className="node-actions" onClick={(e) => e.stopPropagation()}>
            <NoteLinks
              entityId={solution.id}
              entityType="solution"
              onNavigateToNote={onNavigateToNote}
            />
            <Comments
              entityId={solution.id}
              entityType="solution"
              comments={solution.comments}
              currentUser={currentUser}
              onUpdate={onUpdate}
            />
            <button onClick={() => setIsEditing(true)} className="btn-icon" title="Edit">
              <FaEdit />
            </button>
            <button onClick={handleDelete} className="btn-icon btn-danger" title="Delete">
              <FaTrash />
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-icon btn-add" title="Add Test">
              <FaPlus />
            </button>
            <button onClick={() => setShowAddSolutionForm(!showAddSolutionForm)} className="btn-icon btn-add" title="Add Nested Solution">
              <FaPlus /> Sol
            </button>
          </div>
        )}
      </div>
      {showAddForm && (
        <div className="add-form-container">
          <EntityForm
            onSave={handleAddTest}
            onCancel={() => setShowAddForm(false)}
            placeholderTitle="New Test"
            currentUser={currentUser}
            parentStartDate={solution.startDate || parentStartDate}
            parentEndDate={solution.endDate || parentEndDate}
          />
        </div>
      )}
      {showAddSolutionForm && (
        <div className="add-form-container">
          <EntityForm
            onSave={handleAddSolution}
            onCancel={() => setShowAddSolutionForm(false)}
            placeholderTitle="New Solution"
            currentUser={currentUser}
            parentStartDate={solution.startDate || parentStartDate}
            parentEndDate={solution.endDate || parentEndDate}
          />
        </div>
      )}
      {isExpanded && (
        <div className="node-children">
          {solution.solutions && solution.solutions.length > 0 && (
            solution.solutions.map(nestedSol => (
              <SolutionNode
                key={nestedSol.id}
                solution={nestedSol}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onUpdate={onUpdate}
                currentUser={currentUser}
                users={users}
                parentStartDate={solution.startDate || parentStartDate}
                parentEndDate={solution.endDate || parentEndDate}
                onNavigateToNote={onNavigateToNote}
              />
            ))
          )}
          {solution.tests && solution.tests.length > 0 ? (
            solution.tests.map(test => (
              <TestNode
                key={test.id}
                test={test}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onUpdate={onUpdate}
                currentUser={currentUser}
                users={users}
                parentStartDate={solution.startDate || parentStartDate}
                parentEndDate={solution.endDate || parentEndDate}
                onNavigateToNote={onNavigateToNote}
              />
            ))
          ) : (
            !solution.solutions?.length && <div className="empty-children">No tests yet</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SolutionNode;

