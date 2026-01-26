import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../services/supabaseApi';
import './KPITemplateManager.css';

function KPITemplateManager({ onClose }) {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    category: '',
    suggestedTarget: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.getKPITemplates();
      setTemplates(data);
      const uniqueCategories = [...new Set(data.map(t => t.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading templates:', error);
      alert('Failed to load templates');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateKPITemplate(editingId, formData);
      } else {
        await api.createKPITemplate(formData);
      }
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await api.deleteKPITemplate(id);
        loadTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template');
      }
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      unit: template.unit || '',
      category: template.category || '',
      suggestedTarget: template.suggestedTarget || ''
    });
    setEditingId(template.id);
    setIsCreating(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: '',
      category: '',
      suggestedTarget: ''
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const filteredTemplates = selectedCategory
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  return (
    <div className="kpi-template-manager">
      <div className="template-manager-header">
        <h2>KPI Template Manager</h2>
        <button onClick={onClose} className="btn-close-manager" title="Close">
          <FaTimes />
        </button>
      </div>

      <div className="template-manager-content">
        <div className="template-manager-controls">
          <button onClick={() => setIsCreating(true)} className="btn-create-template">
            <FaPlus /> Create New Template
          </button>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter-manager"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {isCreating && (
          <div className="template-form-container">
            <h3>{editingId ? 'Edit Template' : 'Create New Template'}</h3>
            <form onSubmit={handleSubmit} className="template-form">
              <input
                type="text"
                placeholder="Template Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
              <input
                type="text"
                placeholder="Unit (e.g., %, calls, $)"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
              <input
                type="text"
                placeholder="Category (e.g., Sales, Marketing)"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <input
                type="text"
                placeholder="Suggested Target (optional)"
                value={formData.suggestedTarget}
                onChange={(e) => setFormData({ ...formData, suggestedTarget: e.target.value })}
              />
              <div className="template-form-actions">
                <button type="submit" className="btn-save">Save</button>
                <button type="button" onClick={resetForm} className="btn-cancel">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="templates-list">
          <h3>Templates ({filteredTemplates.length})</h3>
          {filteredTemplates.length === 0 ? (
            <div className="no-templates">No templates found. Create your first template!</div>
          ) : (
            <div className="templates-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-card-header">
                    <h4>{template.name}</h4>
                    <div className="template-card-actions">
                      <button
                        onClick={() => handleEdit(template)}
                        className="btn-icon-small"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="btn-icon-small btn-danger"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  {template.category && (
                    <span className="template-category">{template.category}</span>
                  )}
                  {template.description && (
                    <p className="template-card-description">{template.description}</p>
                  )}
                  <div className="template-card-details">
                    <span className="template-unit">Unit: {template.unit || 'N/A'}</span>
                    {template.suggestedTarget && (
                      <span className="template-target">Target: {template.suggestedTarget}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KPITemplateManager;






