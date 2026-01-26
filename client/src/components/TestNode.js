import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronRight, FaTrash, FaEdit, FaPlus, FaDatabase } from 'react-icons/fa';
import './TreeNode.css';
import EntityForm from './EntityForm';
import KPINode from './KPINode';
import KPIForm from './KPIForm';
import Comments from './Comments';
import NoteLinks from './NoteLinks';
import api from '../services/supabaseApi';

function TestNode({ test, expandedNodes, onToggle, onUpdate, currentUser, users = [], parentStartDate, parentEndDate, onNavigateToNote }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [linkedDataPoints, setLinkedDataPoints] = useState([]);
  const isExpanded = expandedNodes.has(test.id);

  useEffect(() => {
    loadLinkedDataPoints();
  }, [test.id]);

  const loadLinkedDataPoints = async () => {
    try {
      const points = await api.getTestDataPoints(test.id);
      setLinkedDataPoints(points || []);
    } catch (error) {
      console.error('Error loading data points:', error);
    }
  };

  const getOwnerName = (ownerId) => {
    if (!ownerId) return null;
    const user = users.find(u => u.id === ownerId);
    return user ? user.name : ownerId;
  };

  const handleToggle = () => {
    onToggle(test.id);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this test and all its KPIs?')) {
      try {
        await api.deleteTest(test.id);
        onUpdate();
      } catch (error) {
        console.error('Error deleting test:', error);
        alert('Failed to delete test');
      }
    }
  };

  const handleSave = async (data) => {
    try {
      await api.updateTest(test.id, data);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating test:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update test';
      alert(errorMessage);
    }
  };

  const handleAddKPI = async (data) => {
    try {
      await api.createKPI(test.id, data);
      setShowAddForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating KPI:', error);
      alert('Failed to create KPI');
    }
  };

  return (
    <div className="tree-node test-node">
      <div className="node-header" onClick={handleToggle}>
        <div className="node-content">
          <span className="node-icon">
            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </span>
          <span className="node-type">Test</span>
          {isEditing ? (
            <EntityForm
              title={test.title}
              description={test.description}
              owner={test.owner}
              startDate={test.startDate}
              endDate={test.endDate}
              parentStartDate={parentStartDate}
              parentEndDate={parentEndDate}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              currentUser={currentUser}
            />
          ) : (
            <>
              <span className="node-title">{test.title}</span>
              {test.owner && (
                <span className="node-owner">Owner: {getOwnerName(test.owner)}</span>
              )}
              {test.startDate && test.endDate && (
                <span className="node-dates">
                  {new Date(test.startDate).toLocaleDateString()} - {new Date(test.endDate).toLocaleDateString()}
                </span>
              )}
              {test.description && (
                <span className="node-description">{test.description}</span>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <div className="node-actions" onClick={(e) => e.stopPropagation()}>
            <NoteLinks
              entityId={test.id}
              entityType="test"
              onNavigateToNote={onNavigateToNote}
            />
            <Comments
              entityId={test.id}
              entityType="test"
              comments={test.comments}
              currentUser={currentUser}
              onUpdate={onUpdate}
            />
            <button onClick={() => setIsEditing(true)} className="btn-icon" title="Edit">
              <FaEdit />
            </button>
            <button onClick={handleDelete} className="btn-icon btn-danger" title="Delete">
              <FaTrash />
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-icon btn-add" title="Add KPI">
              <FaPlus />
            </button>
          </div>
        )}
      </div>
      {showAddForm && (
        <div className="add-form-container">
          <KPIForm
            onSave={handleAddKPI}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
      {isExpanded && (
        <div className="node-children">
          {linkedDataPoints.length > 0 && (
            <div className="data-points-section">
              <div className="section-header">
                <FaDatabase />
                <strong>Linked Data Points ({linkedDataPoints.length})</strong>
              </div>
              <div className="data-points-mini">
                {linkedDataPoints.map(point => (
                  <div key={point.id} className="data-point-mini">
                    <span className="point-name">{point.name}</span>
                    {point.value !== null && (
                      <span className="point-value-mini">
                        {point.value} {point.unit}
                      </span>
                    )}
                    <span className="point-source-mini">{point.sourceName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {test.kpis && test.kpis.length > 0 ? (
            test.kpis.map(kpi => (
              <KPINode
                key={kpi.id}
                kpi={kpi}
                onUpdate={onUpdate}
              />
            ))
          ) : (
            <div className="empty-children">No KPIs yet</div>
          )}
        </div>
      )}
    </div>
  );
}

export default TestNode;

