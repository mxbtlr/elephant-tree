import React, { useState, useCallback, useEffect } from 'react';
import api from '../services/supabaseApi';

function KPIForm({ onSave, onCancel, initialValues = {} }) {
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [name, setName] = useState(initialValues.name || '');
  const [target, setTarget] = useState(initialValues.target || '');
  const [current, setCurrent] = useState(initialValues.current || '');
  const [unit, setUnit] = useState(initialValues.unit || '');

  const loadTemplates = useCallback(async (category = null) => {
    try {
      const data = await api.getKPITemplates(category);
      setTemplates(data || []);
      const uniqueCategories = [...new Set((data || []).map(t => t.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (selectedCategory) {
      loadTemplates(selectedCategory);
    } else {
      loadTemplates();
    }
  }, [selectedCategory, loadTemplates]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setName(template.name);
        setUnit(template.unit);
        setTarget(template.suggestedTarget || '');
        setCurrent('');
      }
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    setName(initialValues.name || '');
    setTarget(initialValues.target || '');
    setCurrent(initialValues.current || '');
    setUnit(initialValues.unit || '');
  }, [initialValues.name, initialValues.target, initialValues.current, initialValues.unit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, target, current, unit });
  };

  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  return (
    <form className="entity-form kpi-form" onSubmit={handleSubmit}>
      <div className="form-mode-toggle">
        <button
          type="button"
          className={!useTemplate ? 'active' : ''}
          onClick={() => {
            setUseTemplate(false);
            setName('');
            setUnit('');
            setTarget('');
            setCurrent('');
            setSelectedTemplate('');
          }}
        >
          Create Custom
        </button>
        <button
          type="button"
          className={useTemplate ? 'active' : ''}
          onClick={() => setUseTemplate(true)}
        >
          Use Template
        </button>
      </div>

      {useTemplate && (
        <>
          <div className="template-filters">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="template-select"
            required={useTemplate}
          >
            <option value="">Select a template...</option>
            {filteredTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category}) - {template.unit}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <div className="template-info">
              {templates.find(t => t.id === selectedTemplate)?.description && (
                <p className="template-description">
                  {templates.find(t => t.id === selectedTemplate).description}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <input
        type="text"
        placeholder="KPI Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={useTemplate && selectedTemplate}
        className="form-input"
      />
      <input
        type="text"
        placeholder="Target Value"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="form-input"
      />
      <input
        type="text"
        placeholder="Current Value"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="form-input"
      />
      <input
        type="text"
        placeholder="Unit (e.g., %, users, $)"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        disabled={useTemplate && selectedTemplate}
        className="form-input"
      />
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default KPIForm;



