import React, { useState, useEffect } from 'react';
import { FaFlask, FaPlus, FaPhone, FaChartBar, FaList, FaTimes, FaChartLine } from 'react-icons/fa';
import api from '../services/supabaseApi';
import KPIForm from './KPIForm';
import './ExperimentsTab.css';

function ExperimentsTab({ solution, currentUser }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  useEffect(() => {
    loadExperiments();
  }, [solution?.id]);

  const loadExperiments = async () => {
    if (!solution?.id) return;
    try {
      setLoading(true);
      const data = await api.listExperiments(solution.id);
      setExperiments(data || []);
    } catch (error) {
      console.error('Error loading experiments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExperiment = async (experimentData) => {
    try {
      await api.createExperiment(solution.id, experimentData);
      setShowCreateModal(false);
      await loadExperiments();
      // Auto-open the newly created experiment
      const updatedExperiments = await api.listExperiments(solution.id);
      if (updatedExperiments && updatedExperiments.length > 0) {
        setSelectedExperiment(updatedExperiments[0]);
      }
    } catch (error) {
      console.error('Error creating experiment:', error);
      alert('Failed to create experiment');
    }
  };

  if (selectedExperiment) {
    return (
      <ExperimentDetail
        experiment={selectedExperiment}
        onClose={() => {
          setSelectedExperiment(null);
          loadExperiments();
        }}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="experiments-tab">
      <div className="experiments-header">
        <h3>Experiments</h3>
        {!showCreateModal && (
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> New Experiment
          </button>
        )}
      </div>

      {showCreateModal && (
        <CreateExperimentModal
          onSave={handleCreateExperiment}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {loading ? (
        <div className="loading">Loading experiments...</div>
      ) : experiments.length === 0 ? (
        <div className="empty-state">
          <FaFlask className="empty-icon" />
          <p>No experiments yet</p>
          <button
            className="btn-secondary"
            onClick={() => setShowCreateModal(true)}
          >
            Create your first experiment
          </button>
        </div>
      ) : (
        <div className="experiments-list">
          {experiments.map(experiment => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              onClick={() => setSelectedExperiment(experiment)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentCard({ experiment, onClick }) {
  const evidenceCount = experiment.evidence?.length || 0;
  const targetN = experiment.target_n || 0;
  const progress = targetN > 0 ? Math.round((evidenceCount / targetN) * 100) : 0;

  // Calculate KPI summary from signals
  const kpiSummary = experiment.signals
    ?.filter(s => s.type === 'enum')
    .map(signal => {
      const values = experiment.evidence?.flatMap(ev =>
        ev.signalValues?.filter(sv => sv.signal_id === signal.id).map(sv => sv.value_text) || []
      ) || [];
      const counts = {};
      values.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
      });
      return { signal, counts };
    })
    .filter(item => Object.keys(item.counts).length > 0)
    .slice(0, 1) || [];

  return (
    <div className="experiment-card" onClick={onClick}>
      <div className="experiment-card-header">
        <div className="experiment-title">{experiment.title}</div>
        <span className={`experiment-type-badge type-${experiment.type}`}>
          {experiment.type === 'calling_campaign' ? 'Calling Campaign' : experiment.type}
        </span>
      </div>
      <div className="experiment-card-meta">
        <span className={`status-badge status-${experiment.status}`}>
          {experiment.status}
        </span>
        <span className="experiment-progress">
          {evidenceCount} / {targetN} calls ({progress}%)
        </span>
      </div>
      {kpiSummary.length > 0 && (
        <div className="experiment-kpi-summary">
          {kpiSummary[0].signal.label}:{' '}
          {Object.entries(kpiSummary[0].counts).map(([value, count], idx) => (
            <span key={value}>
              {idx > 0 && ' • '}
              {value}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateExperimentModal({ onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('calling_campaign');
  const [targetN, setTargetN] = useState(50);
  const [hypothesis, setHypothesis] = useState('');
  const [status, setStatus] = useState('planned');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type,
      targetN: parseInt(targetN) || 50,
      hypothesis: hypothesis.trim() || null,
      status
    });
  };

  return (
    <div className="experiment-modal-overlay" onClick={onCancel}>
      <div className="experiment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="experiment-modal-header">
          <h3>Create Experiment</h3>
          <button className="btn-close" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="experiment-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call 50 CEOs about pricing"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="calling_campaign">Calling Campaign</option>
            </select>
          </div>
          <div className="form-group">
            <label>Target N</label>
            <input
              type="number"
              value={targetN}
              onChange={(e) => setTargetN(e.target.value)}
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Hypothesis (optional)</label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="What hypothesis are you testing?"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="planned">Planned</option>
              <option value="running">Running</option>
              <option value="evaluated">Evaluated</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="experiment-form-actions">
            <button type="submit" className="btn-primary">Create Experiment</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExperimentDetail({ experiment, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('log-call');
  const [experimentData, setExperimentData] = useState(experiment);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiSourceEvidence, setKpiSourceEvidence] = useState(null);

  useEffect(() => {
    loadExperiment();
  }, [experiment.id]);

  const loadExperiment = async () => {
    try {
      const data = await api.getExperiment(experiment.id);
      setExperimentData(data);
    } catch (error) {
      console.error('Error loading experiment:', error);
    }
  };

  const handleLogCall = async () => {
    setShowLogCallModal(true);
  };

  const handleCallLogged = async () => {
    setShowLogCallModal(false);
    await loadExperiment();
  };

  const handleCreateKpiFromCall = (evidenceItem) => {
    setKpiSourceEvidence(evidenceItem);
    setShowKpiModal(true);
  };

  const handleKpiCreated = async () => {
    setShowKpiModal(false);
    setKpiSourceEvidence(null);
    await loadExperiment();
  };

  const evidenceCount = experimentData.evidence?.length || 0;
  const targetN = experimentData.target_n || 0;
  const progress = targetN > 0 ? Math.round((evidenceCount / targetN) * 100) : 0;

  return (
    <div className="experiment-detail">
      <div className="experiment-detail-header">
        <div>
          <h2>{experimentData.title}</h2>
          <div className="experiment-detail-meta">
            <span className={`status-badge status-${experimentData.status}`}>
              {experimentData.status}
            </span>
            <span className="experiment-progress-text">
              {evidenceCount} / {targetN} calls logged ({progress}%)
            </span>
          </div>
        </div>
        <button className="btn-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="experiment-detail-tabs">
        <button
          className={activeTab === 'log-call' ? 'active' : ''}
          onClick={() => setActiveTab('log-call')}
        >
          <FaPhone /> Log Call
        </button>
        <button
          className={activeTab === 'evidence' ? 'active' : ''}
          onClick={() => setActiveTab('evidence')}
        >
          <FaList /> Evidence
        </button>
        <button
          className={activeTab === 'results' ? 'active' : ''}
          onClick={() => setActiveTab('results')}
        >
          <FaChartBar /> Results
        </button>
      </div>

      <div className="experiment-detail-content">
        {activeTab === 'log-call' && (
          <div className="log-call-tab">
            <button className="btn-primary btn-large" onClick={handleLogCall}>
              <FaPhone /> Log Call
            </button>
            {experimentData.hypothesis && (
              <div className="hypothesis-section">
                <h4>Hypothesis</h4>
                <p>{experimentData.hypothesis}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <EvidenceList
            evidence={experimentData.evidence || []}
            signals={experimentData.signals || []}
            onCreateKpi={handleCreateKpiFromCall}
          />
        )}

        {activeTab === 'results' && (
          <ResultsSummary experiment={experimentData} />
        )}
      </div>

      {showLogCallModal && (
        <LogCallModal
          experiment={experimentData}
          onSave={handleCallLogged}
          onCancel={() => setShowLogCallModal(false)}
          currentUser={currentUser}
        />
      )}

      {showKpiModal && (
        <KpiModal
          experiment={experimentData}
          evidenceItem={kpiSourceEvidence}
          onSave={handleKpiCreated}
          onCancel={() => {
            setShowKpiModal(false);
            setKpiSourceEvidence(null);
          }}
        />
      )}
    </div>
  );
}

function EvidenceList({ evidence, signals, onCreateKpi }) {
  if (evidence.length === 0) {
    return (
      <div className="empty-state">
        <FaList className="empty-icon" />
        <p>No calls logged yet</p>
      </div>
    );
  }

  return (
    <div className="evidence-list">
      {evidence.map(ev => (
        <div key={ev.id} className="evidence-item">
          <div className="evidence-header">
            <div className="evidence-contact">
              {ev.contact_label || `Call #${ev.id.slice(0, 8)}`}
            </div>
            <div className="evidence-meta">
              {ev.duration_min && <span>{ev.duration_min} min</span>}
              <span>{new Date(ev.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="evidence-actions">
            <button
              className="btn-kpi"
              onClick={() => onCreateKpi(ev)}
              title="Create KPI from this call"
            >
              <FaChartLine /> Create KPI
            </button>
          </div>
          {ev.notes && (
            <div className="evidence-notes">{ev.notes}</div>
          )}
          {ev.signalValues && ev.signalValues.length > 0 && (
            <div className="evidence-signals">
              {ev.signalValues.map(sv => {
                const signal = signals.find(s => s.id === sv.signal_id);
                return signal ? (
                  <span key={sv.id} className="signal-value">
                    {signal.label}: {sv.value_text}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function KpiModal({ experiment, evidenceItem, onSave, onCancel }) {
  const defaultName = evidenceItem?.contact_label
    ? `Call feedback - ${evidenceItem.contact_label}`
    : 'Call feedback KPI';

  const handleSave = async (data) => {
    await api.createKPI(experiment.id, data);
    onSave();
  };

  return (
    <div className="kpi-modal-overlay" onClick={onCancel}>
      <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kpi-modal-header">
          <h3>Create KPI</h3>
          <button className="btn-close" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <div className="kpi-modal-subtitle">
          {evidenceItem?.contact_label ? `From ${evidenceItem.contact_label}` : 'From call log'}
        </div>
        <KPIForm
          onSave={handleSave}
          onCancel={onCancel}
          initialValues={{ name: defaultName }}
        />
      </div>
    </div>
  );
}

function ResultsSummary({ experiment }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [experiment.id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await api.getAggregatedResults(experiment.id);
      setResults(data || {});
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading results...</div>;
  }

  const signalKeys = Object.keys(results);
  if (signalKeys.length === 0) {
    return (
      <div className="empty-state">
        <FaChartBar className="empty-icon" />
        <p>No results yet. Log some calls to see aggregated data.</p>
      </div>
    );
  }

  return (
    <div className="results-summary">
      {signalKeys.map(signalKey => {
        const result = results[signalKey];
        return (
          <div key={signalKey} className="result-signal">
            <h4>{result.label}</h4>
            <div className="result-counts">
              {Object.entries(result.counts).map(([value, count]) => (
                <div key={value} className="result-item">
                  <div className="result-label">{value}</div>
                  <div className="result-bar-container">
                    <div
                      className="result-bar"
                      style={{ width: `${result.percentages[value] || 0}%` }}
                    />
                  </div>
                  <div className="result-values">
                    <span className="result-count">{count}</span>
                    <span className="result-percent">({result.percentages[value] || 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogCallModal({ experiment, onSave, onCancel, currentUser }) {
  const [contactLabel, setContactLabel] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [notes, setNotes] = useState('');
  const [signalValues, setSignalValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const signals = experiment.signals || [];

  const handleSignalChange = (signalId, value) => {
    setSignalValues(prev => ({
      ...prev,
      [signalId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Map signal IDs to signal keys for the API
      const signalKeysMap = {};
      signals.forEach(s => {
        signalKeysMap[s.id] = s.key;
      });

      const signalValuesPayload = {};
      Object.entries(signalValues).forEach(([signalId, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          signalValuesPayload[signalKeysMap[signalId]] = value;
        }
      });

      await api.logCall(experiment.id, {
        contactLabel: contactLabel.trim() || null,
        durationMin: durationMin ? parseInt(durationMin) : null,
        notes: notes.trim() || null
      }, signalValuesPayload);

      onSave();
    } catch (error) {
      console.error('Error logging call:', error);
      alert('Failed to log call');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="log-call-modal-overlay" onClick={onCancel}>
      <div className="log-call-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-call-modal-header">
          <h3>Log Call</h3>
          <button className="btn-close" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="log-call-form">
          <div className="form-group">
            <label>Contact Label (optional)</label>
            <input
              type="text"
              value={contactLabel}
              onChange={(e) => setContactLabel(e.target.value)}
              placeholder="e.g., CEO #17"
            />
          </div>
          <div className="form-group">
            <label>Duration (minutes, optional)</label>
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Call notes..."
            />
          </div>

          {signals.map(signal => (
            <div key={signal.id} className="form-group">
              <label>
                {signal.label}
                {signal.required && <span className="required">*</span>}
              </label>
              {signal.type === 'enum' && signal.options && (
                <select
                  value={signalValues[signal.id] || ''}
                  onChange={(e) => handleSignalChange(signal.id, e.target.value)}
                  required={signal.required}
                >
                  <option value="">Select...</option>
                  {signal.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
              {signal.type === 'boolean' && (
                <select
                  value={signalValues[signal.id] || ''}
                  onChange={(e) => handleSignalChange(signal.id, e.target.value === 'true')}
                  required={signal.required}
                >
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}
              {signal.type === 'number' && (
                <input
                  type="number"
                  value={signalValues[signal.id] || ''}
                  onChange={(e) => handleSignalChange(signal.id, parseFloat(e.target.value))}
                  required={signal.required}
                />
              )}
              {signal.type === 'text' && (
                <input
                  type="text"
                  value={signalValues[signal.id] || ''}
                  onChange={(e) => handleSignalChange(signal.id, e.target.value)}
                  required={signal.required}
                />
              )}
            </div>
          ))}

          <div className="log-call-form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Logging...' : 'Log Call'}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExperimentsTab;
