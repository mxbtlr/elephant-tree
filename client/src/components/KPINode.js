import React, { useState } from 'react';
import { FaTrash, FaEdit } from 'react-icons/fa';
import './TreeNode.css';
import api from '../services/supabaseApi';

function KPINode({ kpi, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(kpi.name);
  const [target, setTarget] = useState(kpi.target);
  const [current, setCurrent] = useState(kpi.current);
  const [unit, setUnit] = useState(kpi.unit);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this KPI?')) {
      try {
        await api.deleteKPI(kpi.id);
        onUpdate();
      } catch (error) {
        console.error('Error deleting KPI:', error);
        alert('Failed to delete KPI');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateKPI(kpi.id, { name, target, current, unit });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating KPI:', error);
      alert('Failed to update KPI');
    }
  };

  const progress = target && current ? 
    Math.min(100, Math.max(0, (parseFloat(current) / parseFloat(target)) * 100)) : 0;

  if (isEditing) {
    return (
      <div className="tree-node kpi-node">
        <form className="entity-form" onSubmit={handleSave}>
          <input
            type="text"
            placeholder="KPI Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Target Value"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <input
            type="text"
            placeholder="Current Value"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <input
            type="text"
            placeholder="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="btn-save">Save</button>
            <button type="button" onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="tree-node kpi-node">
      <div className="node-header">
        <div className="node-content">
          <span className="node-type kpi-type">KPI</span>
          <div className="kpi-details">
            <span className="node-title">{kpi.name}</span>
            <div className="kpi-values">
              <span className="kpi-value">
                Current: <strong>{kpi.current || 'N/A'}</strong>
                {kpi.unit && ` ${kpi.unit}`}
              </span>
              <span className="kpi-value">
                Target: <strong>{kpi.target || 'N/A'}</strong>
                {kpi.unit && ` ${kpi.unit}`}
              </span>
            </div>
            {target && current && (
              <div className="kpi-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{progress.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className="node-actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setIsEditing(true)} className="btn-icon" title="Edit">
            <FaEdit />
          </button>
          <button onClick={handleDelete} className="btn-icon btn-danger" title="Delete">
            <FaTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

export default KPINode;

