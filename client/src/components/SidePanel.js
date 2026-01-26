import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/supabaseApi';
import { STATUS_OPTIONS, nodeTypeLabels } from '../lib/ostTypes';
import { ostTokens } from '../lib/ui/tokens';
import { TEST_TEMPLATES, getTemplateByKey } from '../lib/tests/templates';
import { findNodeByKey } from '../lib/ostTree';
import { useOstStore } from '../store/useOstStore';
import './SidePanel.css';

const EMPTY_DRAFT = {
  title: '',
  description: '',
  status: '',
  owner: '',
  evidence: '',
  result: ''
};

const getOwnerOptions = (users) =>
  (users || []).map((user) => ({
    value: user.id,
    label: user.name || user.email
  }));

function SidePanel({ outcomes, users, onUpdate }) {
  const {
    state: { selectedKey, nodeOverrides },
    actions: { setNodeOverride, setEvidence }
  } = useOstStore();
  const nodeLookup = useMemo(() => findNodeByKey(outcomes, selectedKey), [outcomes, selectedKey]);
  const override = selectedKey ? nodeOverrides[selectedKey] : null;
  const effectiveNode = useMemo(
    () => (nodeLookup?.node ? { ...nodeLookup.node, ...(override || {}) } : null),
    [nodeLookup?.node, override]
  );
  const ownerOptions = useMemo(() => getOwnerOptions(users), [users]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [testDraft, setTestDraft] = useState({
    testTemplate: null,
    testStatus: 'planned',
    successCriteria: { pass: '', iterate: '', kill: '' },
    resultDecision: null,
    resultSummary: '',
    timebox: { start: '', end: '' }
  });
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const saveTimeoutRef = useRef(null);

  const isSameDraft = (next) =>
    draft.title === next.title &&
    draft.description === next.description &&
    draft.status === next.status &&
    draft.owner === next.owner &&
    draft.evidence === next.evidence &&
    draft.result === next.result;

  const isSameTestDraft = (next) =>
    testDraft.testTemplate === next.testTemplate &&
    testDraft.testStatus === next.testStatus &&
    testDraft.resultDecision === next.resultDecision &&
    testDraft.resultSummary === next.resultSummary &&
    testDraft.timebox?.start === next.timebox?.start &&
    testDraft.timebox?.end === next.timebox?.end &&
    testDraft.successCriteria?.pass === next.successCriteria?.pass &&
    testDraft.successCriteria?.iterate === next.successCriteria?.iterate &&
    testDraft.successCriteria?.kill === next.successCriteria?.kill;

  useEffect(() => {
    if (!effectiveNode) {
      if (!isSameDraft(EMPTY_DRAFT)) {
        setDraft(EMPTY_DRAFT);
      }
      return;
    }
    const nextDraft = {
      title: effectiveNode.title || '',
      description: effectiveNode.description || '',
      status: effectiveNode.status || '',
      owner: effectiveNode.owner || '',
      evidence: effectiveNode.evidence || '',
      result: effectiveNode.result || ''
    };
    if (!isSameDraft(nextDraft)) {
      setDraft(nextDraft);
    }
    const nextTestDraft = {
      testTemplate: effectiveNode.testTemplate || null,
      testStatus: effectiveNode.testStatus || effectiveNode.status || 'planned',
      successCriteria: effectiveNode.successCriteria || { pass: '', iterate: '', kill: '' },
      resultDecision: effectiveNode.resultDecision || null,
      resultSummary: effectiveNode.resultSummary || '',
      timebox: effectiveNode.timebox || { start: '', end: '' }
    };
    if (!isSameTestDraft(nextTestDraft)) {
      setTestDraft(nextTestDraft);
    }
  }, [effectiveNode]);

  useEffect(() => {
    const loadEvidence = async () => {
      if (!nodeLookup?.node || nodeLookup.type !== 'test') return;
      setIsLoadingEvidence(true);
      try {
        const items = await api.listEvidence(nodeLookup.node.id);
        setEvidenceItems(items || []);
        setEvidence(nodeLookup.node.id, items || []);
      } catch (error) {
        console.error('Failed to load evidence:', error);
      } finally {
        setIsLoadingEvidence(false);
      }
    };
    void loadEvidence();
  }, [nodeLookup?.node?.id, nodeLookup?.type, setEvidence]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const debouncedSave = (nextDraft) => {
    if (!nodeLookup?.node) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const { type } = nodeLookup;
    saveTimeoutRef.current = setTimeout(() => {
      void handleSave(nextDraft);
    }, 500);
  };

  const handleFieldChange = (field, value) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { [field]: value });
    }
    debouncedSave(next);
  };

  const handleTestFieldChange = (field, value) => {
    const next = { ...testDraft, [field]: value };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { [field]: value });
    }
    const payload = { ...draft, ...next };
    debouncedSave(payload);
  };

  const handleSuccessCriteriaChange = (field, value) => {
    const nextCriteria = { ...testDraft.successCriteria, [field]: value };
    const next = { ...testDraft, successCriteria: nextCriteria };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { successCriteria: nextCriteria });
    }
    const payload = { ...draft, ...next };
    debouncedSave(payload);
  };

  const handleResultDecisionChange = (value) => {
    const next = {
      ...testDraft,
      resultDecision: value,
      testStatus: value && testDraft.testStatus !== 'done' ? 'done' : testDraft.testStatus
    };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, {
        resultDecision: value,
        testStatus: next.testStatus
      });
    }
    const payload = { ...draft, ...next };
    debouncedSave(payload);
  };

  const handleAddEvidence = async (type) => {
    if (!nodeLookup?.node) return;
    const content = window.prompt('Add evidence');
    if (!content) return;
    const payload = {
      type,
      content,
      quality: 'medium',
      source: 'customer',
      workspaceId: nodeLookup.node.workspaceId
    };
    try {
      const created = await api.createEvidence(nodeLookup.node.id, payload);
      const next = [created, ...evidenceItems];
      setEvidenceItems(next);
      setEvidence(nodeLookup.node.id, next);
    } catch (error) {
      console.error('Failed to add evidence:', error);
    }
  };

  const handleUpdateEvidence = async (itemId, updates) => {
    try {
      const updated = await api.updateEvidence(itemId, updates);
      const next = evidenceItems.map((item) => (item.id === itemId ? updated : item));
      setEvidenceItems(next);
      if (nodeLookup?.node) setEvidence(nodeLookup.node.id, next);
    } catch (error) {
      console.error('Failed to update evidence:', error);
    }
  };

  const handleDeleteEvidence = async (itemId) => {
    try {
      await api.deleteEvidence(itemId);
      const next = evidenceItems.filter((item) => item.id !== itemId);
      setEvidenceItems(next);
      if (nodeLookup?.node) setEvidence(nodeLookup.node.id, next);
    } catch (error) {
      console.error('Failed to delete evidence:', error);
    }
  };

  const handleSave = async (payload = { ...draft, ...testDraft }) => {
    if (!nodeLookup?.node) return;
    try {
      if (nodeLookup.type === 'outcome') {
        await api.updateOutcome(nodeLookup.node.id, payload);
      } else if (nodeLookup.type === 'opportunity') {
        await api.updateOpportunity(nodeLookup.node.id, payload);
      } else if (nodeLookup.type === 'solution') {
        await api.updateSolution(nodeLookup.node.id, payload);
      } else if (nodeLookup.type === 'test') {
        await api.updateTest(nodeLookup.node.id, payload);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  if (!nodeLookup?.node) {
    return (
      <aside className="side-panel empty">
        <div className="side-panel-header">Details</div>
        <div className="side-panel-empty">Select a node to edit details.</div>
      </aside>
    );
  }

  return (
    <aside className="side-panel">
      <div className="side-panel-header">
        <div className="side-panel-title">
          {nodeTypeLabels[nodeLookup.type] || 'Node'}
        </div>
      </div>

      <div className="side-panel-field">
        <label htmlFor="side-title">Title</label>
        <input
          id="side-title"
          value={draft.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="Title"
        />
      </div>

      <div className="side-panel-field">
        <label htmlFor="side-description">Description</label>
        <textarea
          id="side-description"
          value={draft.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Add a short description"
          rows={4}
        />
      </div>

      <div className="side-panel-field">
        <label htmlFor="side-status" className="side-panel-label-row">
          Status
          {draft.status && (
            <span
              className="status-chip"
              style={{ background: ostTokens.status[draft.status] || '#94a3b8' }}
            />
          )}
        </label>
        <select
          id="side-status"
          value={draft.status || ''}
          onChange={(e) => handleFieldChange('status', e.target.value)}
        >
          <option value="">No status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="side-panel-field">
        <label htmlFor="side-owner">Owner</label>
        <select
          id="side-owner"
          value={draft.owner || ''}
          onChange={(e) => handleFieldChange('owner', e.target.value)}
        >
          <option value="">Unassigned</option>
          {ownerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {nodeLookup.type === 'test' && (
        <>
          <div className="side-panel-section">
            <div className="side-panel-section-title">Template</div>
            <div className="side-panel-inline">
              <span className="side-panel-chip">
                {getTemplateByKey(testDraft.testTemplate)?.label || 'Blank Test'}
              </span>
              <select
                value={testDraft.testTemplate || ''}
                onChange={(e) => handleTestFieldChange('testTemplate', e.target.value || null)}
              >
                <option value="">Blank</option>
                {TEST_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="side-panel-field">
            <label htmlFor="side-test-status">Test Status</label>
            <select
              id="side-test-status"
              value={testDraft.testStatus || 'planned'}
              onChange={(e) => handleTestFieldChange('testStatus', e.target.value)}
            >
              <option value="planned">Planned</option>
              <option value="running">Running</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="side-panel-section">
            <div className="side-panel-section-title">Success Criteria</div>
            <div className="side-panel-field">
              <label htmlFor="criteria-pass">Pass</label>
              <textarea
                id="criteria-pass"
                value={testDraft.successCriteria?.pass || ''}
                onChange={(e) => handleSuccessCriteriaChange('pass', e.target.value)}
                rows={2}
              />
            </div>
            <div className="side-panel-field">
              <label htmlFor="criteria-iterate">Iterate</label>
              <textarea
                id="criteria-iterate"
                value={testDraft.successCriteria?.iterate || ''}
                onChange={(e) => handleSuccessCriteriaChange('iterate', e.target.value)}
                rows={2}
              />
            </div>
            <div className="side-panel-field">
              <label htmlFor="criteria-kill">Kill</label>
              <textarea
                id="criteria-kill"
                value={testDraft.successCriteria?.kill || ''}
                onChange={(e) => handleSuccessCriteriaChange('kill', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="side-panel-field">
            <label htmlFor="result-decision">Result Decision</label>
            <select
              id="result-decision"
              value={testDraft.resultDecision || ''}
              onChange={(e) => handleResultDecisionChange(e.target.value || null)}
            >
              <option value="">Not decided</option>
              <option value="pass">Pass</option>
              <option value="iterate">Iterate</option>
              <option value="kill">Kill</option>
            </select>
          </div>

          <div className="side-panel-field">
            <label htmlFor="result-summary">Result Summary</label>
            <textarea
              id="result-summary"
              value={testDraft.resultSummary}
              onChange={(e) => handleTestFieldChange('resultSummary', e.target.value)}
              rows={2}
            />
          </div>

          <div className="side-panel-section">
            <div className="side-panel-section-title">Evidence</div>
            <div className="side-panel-inline">
              {['quote', 'kpi', 'link', 'note'].map((type) => (
                <button
                  key={type}
                  type="button"
                  className="side-panel-chip"
                  onClick={() => handleAddEvidence(type)}
                >
                  + {type}
                </button>
              ))}
            </div>
            {isLoadingEvidence ? (
              <div className="side-panel-empty">Loading evidence…</div>
            ) : (
              evidenceItems.map((item) => (
                <div key={item.id} className="evidence-row">
                  <select
                    value={item.type}
                    onChange={(e) => handleUpdateEvidence(item.id, { ...item, type: e.target.value })}
                  >
                    <option value="quote">Quote</option>
                    <option value="kpi">KPI</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="link">Link</option>
                    <option value="note">Note</option>
                    <option value="call_summary">Call Summary</option>
                  </select>
                  <input
                    value={item.content}
                    onChange={(e) => handleUpdateEvidence(item.id, { ...item, content: e.target.value })}
                  />
                  <select
                    value={item.quality}
                    onChange={(e) => handleUpdateEvidence(item.id, { ...item, quality: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    value={item.source}
                    onChange={(e) => handleUpdateEvidence(item.id, { ...item, source: e.target.value })}
                  >
                    <option value="customer">Customer</option>
                    <option value="analytics">Analytics</option>
                    <option value="internal">Internal</option>
                    <option value="sales">Sales</option>
                  </select>
                  <button type="button" onClick={() => handleDeleteEvidence(item.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <button className="side-panel-save" type="button" onClick={() => void handleSave()}>
        Save info
      </button>
    </aside>
  );
}

export default SidePanel;
