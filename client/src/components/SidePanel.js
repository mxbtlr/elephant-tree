import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/supabaseApi';
import { STATUS_OPTIONS, nodeTypeLabels } from '../lib/ostTypes';
import { ostTokens } from '../lib/ui/tokens';
import { TEST_TEMPLATES, getTemplateByKey } from '../lib/tests/templates';
import { findNodeByKey } from '../lib/ostTree';
import { DEFAULT_TITLES, getNodeKey } from '../lib/ostTypes';
import { useOstStore } from '../store/useOstStore';
import Avatar from './Avatar';
import TodoListPanel from './Todos/TodoListPanel';
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

function SidePanel({ outcomes, users, onUpdate, isDrawer = false }) {
  const {
    state: { selectedKey, nodeOverrides, todosById, todoIdsByTest },
    actions: { setNodeOverride, setEvidence, setSelectedKey, upsertTodo, removeTodo }
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
    testType: 'custom',
    testStatus: 'planned',
    successCriteria: { pass: '', iterate: '', kill: '' },
    resultDecision: null,
    hypothesisId: null,
    resultSummary: '',
    timebox: { start: '', end: '' }
  });
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [todoDraft, setTodoDraft] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState('');
  const [isThinkOpen, setIsThinkOpen] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reflection, setReflection] = useState('');
  const [decisionDraft, setDecisionDraft] = useState('pass');
  const [activePhase, setActivePhase] = useState('context');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const userById = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);
  const [hypotheses, setHypotheses] = useState([]);
  const [isLoadingHypotheses, setIsLoadingHypotheses] = useState(false);
  const [hypothesisDraft, setHypothesisDraft] = useState('');
  const [editingHypothesisId, setEditingHypothesisId] = useState(null);
  const [editingHypothesisStatement, setEditingHypothesisStatement] = useState('');
  const [proposeHypothesisId, setProposeHypothesisId] = useState(null);
  const [solutionTitle, setSolutionTitle] = useState('');
  const [solutionDescription, setSolutionDescription] = useState('');
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 520;
    const stored = window.sessionStorage.getItem('treeflow:sidebarWidth');
    return stored ? Number(stored) : 520;
  });
  const saveTimeoutRef = useRef(null);
  const lastPayloadRef = useRef(null);
  const [saveState, setSaveState] = useState('saved');
  const buildPayload = (nextDraft = draft, nextTestDraft = testDraft) => {
    if (nodeLookup?.type === 'test') {
      return { ...nextDraft, ...nextTestDraft };
    }
    return { ...nextDraft };
  };

  const isSameDraft = (next) =>
    draft.title === next.title &&
    draft.description === next.description &&
    draft.status === next.status &&
    draft.owner === next.owner &&
    draft.evidence === next.evidence &&
    draft.result === next.result;

  const isSameTestDraft = (next) =>
    testDraft.testTemplate === next.testTemplate &&
    testDraft.testType === next.testType &&
    testDraft.testStatus === next.testStatus &&
    testDraft.resultDecision === next.resultDecision &&
    testDraft.hypothesisId === next.hypothesisId &&
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
      testType: effectiveNode.testType || effectiveNode.type || 'custom',
      testStatus: effectiveNode.testStatus || effectiveNode.status || 'planned',
      successCriteria: effectiveNode.successCriteria || { pass: '', iterate: '', kill: '' },
      resultDecision: effectiveNode.resultDecision || null,
      hypothesisId: effectiveNode.hypothesisId || null,
      resultSummary: effectiveNode.resultSummary || '',
      timebox: effectiveNode.timebox || { start: '', end: '' }
    };
    if (!isSameTestDraft(nextTestDraft)) {
      setTestDraft(nextTestDraft);
    }
    setSaveState('saved');
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

  const selectedTestId = nodeLookup?.type === 'test' ? nodeLookup?.node?.id : null;
  const todos = useMemo(() => {
    if (!selectedTestId) return [];
    const ids = todoIdsByTest?.[selectedTestId] || [];
    if (ids.length > 0) {
      return ids.map((id) => todosById?.[id]).filter(Boolean);
    }
    return Object.values(todosById || {})
      .filter((todo) => todo.experiment_id === selectedTestId)
      .sort((a, b) => {
        const sortA = a.sort_order ?? 0;
        const sortB = b.sort_order ?? 0;
        if (sortA !== sortB) return sortA - sortB;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [selectedTestId, todoIdsByTest, todosById]);

  useEffect(() => {
    const loadHypotheses = async () => {
      if (!nodeLookup?.node || nodeLookup.type !== 'opportunity') {
        setHypotheses([]);
        return;
      }
      setIsLoadingHypotheses(true);
      try {
        const list = await api.listHypotheses(nodeLookup.node.id);
        setHypotheses(list || []);
      } catch (error) {
        console.error('Failed to load hypotheses:', error);
      } finally {
        setIsLoadingHypotheses(false);
      }
    };
    void loadHypotheses();
  }, [nodeLookup?.node?.id, nodeLookup?.type]);

  useEffect(() => {
    if (nodeLookup?.type !== 'test') return;
    const loadLinkedHypothesis = async () => {
      try {
        if (!nodeLookup.opportunity?.id) return;
        const list = await api.listHypotheses(nodeLookup.opportunity.id);
        setHypotheses(list || []);
      } catch (error) {
        console.error('Failed to load linked hypothesis:', error);
      }
    };
    void loadLinkedHypothesis();
  }, [nodeLookup?.type, nodeLookup?.opportunity?.id]);

  useEffect(() => {
    if (!selectedKey || nodeLookup?.type !== 'test') return;
    const total = todos.length;
    const done = todos.filter((item) => item.is_done).length;
    setNodeOverride(selectedKey, { todoDone: done, todoTotal: total });
  }, [todos, nodeLookup?.type, selectedKey, setNodeOverride]);

  useEffect(() => {
    if (nodeLookup?.type !== 'test') return;
    setReflection('');
    setDecisionDraft(testDraft.resultDecision || 'pass');
  }, [nodeLookup?.node?.id, nodeLookup?.type, testDraft.resultDecision]);

  useEffect(() => {
    if (nodeLookup?.type !== 'test') return;
    setActivePhase('context');
    setIsDescriptionExpanded(false);
  }, [nodeLookup?.node?.id, nodeLookup?.type]);

  useEffect(() => {
    const handleResize = (event) => {
      const next = Math.max(420, Math.min(720, window.innerWidth - event.clientX));
      setPanelWidth(next);
      window.sessionStorage.setItem('treeflow:sidebarWidth', String(next));
    };
    const stopResize = () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
    const startResize = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResize);
    };
    const handle = document.getElementById('side-panel-resizer');
    if (!handle) return undefined;
    handle.addEventListener('mousedown', startResize);
    return () => {
      handle.removeEventListener('mousedown', startResize);
      stopResize();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (lastPayloadRef.current) {
        void handleSave(lastPayloadRef.current, { refresh: false });
      }
    };
  }, []);

  const queueSave = (nextPayload, options = {}) => {
    if (!nodeLookup?.node) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    lastPayloadRef.current = nextPayload;
    setSaveState('saving');

    if (options.immediate) {
      void handleSave(nextPayload, { refresh: false });
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      void handleSave(nextPayload, { refresh: false });
    }, 200);
  };

  const flushSave = () => {
    queueSave(buildPayload(), { immediate: true });
  };

  const getTemplateDefaultsForType = (type) => {
    const typeMap = {
      interview: 'customer_interview',
      cold_outreach: 'cold_outreach',
      pricing: 'pricing_test',
      prototype_usability: 'prototype_usability'
    };
    const key = typeMap[type];
    return key ? getTemplateByKey(key) : null;
  };

  const handleTestTypeChange = (value) => {
    const template = getTemplateDefaultsForType(value);
    const hasCriteria =
      Boolean(testDraft.successCriteria?.pass) ||
      Boolean(testDraft.successCriteria?.iterate) ||
      Boolean(testDraft.successCriteria?.kill);
    const next = {
      ...testDraft,
      testType: value,
      testTemplate: value === 'custom' ? null : template?.key || null,
      successCriteria: !hasCriteria && template?.successCriteria
        ? template.successCriteria
        : testDraft.successCriteria
    };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, {
        testType: value,
        testTemplate: next.testTemplate,
        successCriteria: next.successCriteria
      });
    }
    queueSave(buildPayload(draft, next), { immediate: true });
  };

  const handleTestHypothesisChange = (value) => {
    const next = {
      ...testDraft,
      hypothesisId: value || null
    };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { hypothesisId: next.hypothesisId });
    }
    queueSave(buildPayload(draft, next), { immediate: true });
  };

  const handleFieldChange = (field, value, options = {}) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { [field]: value });
    }
    queueSave(buildPayload(next, testDraft), options);
  };

  const handleTestFieldChange = (field, value, options = {}) => {
    const next = { ...testDraft, [field]: value };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { [field]: value });
    }
    queueSave(buildPayload(draft, next), options);
  };

  const handleSuccessCriteriaChange = (field, value) => {
    const nextCriteria = { ...testDraft.successCriteria, [field]: value };
    const next = { ...testDraft, successCriteria: nextCriteria };
    setTestDraft(next);
    if (selectedKey) {
      setNodeOverride(selectedKey, { successCriteria: nextCriteria });
    }
    queueSave(buildPayload(draft, next));
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
    const payload = buildPayload(draft, next);
    setSaveState('saving');
    void handleSave(payload, { refresh: false });
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

  const handleCreateTodo = async () => {
    if (!nodeLookup?.node || nodeLookup.type !== 'test') return;
    const trimmed = todoDraft.trim();
    if (!trimmed) return;
    const maxSort = todos.reduce((max, item) => Math.max(max, item.sort_order || 0), 0);
    const context = {
      experiment_title: nodeLookup.node.title,
      solution_title: nodeLookup.parent?.title,
      opportunity_title: nodeLookup.opportunity?.title,
      outcome_title: nodeLookup.root?.title
    };
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      experiment_id: nodeLookup.node.id,
      title: trimmed.slice(0, 120),
      is_done: false,
      due_date: null,
      sort_order: maxSort + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...context
    };
    try {
      upsertTodo(optimistic);
      const created = await api.createExperimentTodo(nodeLookup.node.id, trimmed.slice(0, 120), {
        sortOrder: maxSort + 1
      });
      setTodoDraft('');
      removeTodo(tempId);
      if (created) {
        upsertTodo({ ...created, ...context });
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
      removeTodo(tempId);
    }
  };

  const handleToggleTodo = async (todo) => {
    const previous = todosById?.[todo.id] || todo;
    const optimistic = {
      ...previous,
      is_done: !todo.is_done,
      updated_at: new Date().toISOString()
    };
    try {
      upsertTodo(optimistic);
      const saved = await api.toggleExperimentTodo(todo.id, !todo.is_done);
      if (saved) {
        upsertTodo(saved);
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      upsertTodo(previous);
    }
  };

  const handleUpdateTodoTitle = async (todoId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const previous = todosById?.[todoId];
    const optimistic = {
      ...(previous || {}),
      id: todoId,
      title: trimmed.slice(0, 120),
      updated_at: new Date().toISOString()
    };
    try {
      upsertTodo(optimistic);
      const saved = await api.updateExperimentTodo(todoId, { title: trimmed.slice(0, 120) });
      setEditingTodoId(null);
      setEditingTodoTitle('');
      if (saved) {
        upsertTodo(saved);
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
      if (previous) {
        upsertTodo(previous);
      }
    }
  };

  const handleUpdateTodoDueDate = async (todoId, dueDate) => {
    const previous = todosById?.[todoId];
    const optimistic = {
      ...(previous || {}),
      id: todoId,
      due_date: dueDate || null,
      updated_at: new Date().toISOString()
    };
    try {
      upsertTodo(optimistic);
      const saved = await api.updateExperimentTodo(todoId, { dueDate: dueDate || null });
      if (saved) {
        upsertTodo(saved);
      }
    } catch (error) {
      console.error('Failed to update todo due date:', error);
      if (previous) {
        upsertTodo(previous);
      }
    }
  };

  const handleDeleteTodo = async (todoId) => {
    const previous = todosById?.[todoId];
    try {
      removeTodo(todoId);
      await api.deleteExperimentTodo(todoId);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      if (previous) {
        upsertTodo(previous);
      }
    }
  };

  const handleMoveTodo = async (todoId, direction) => {
    const index = todos.findIndex((item) => item.id === todoId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= todos.length) return;
    const current = todos[index];
    const target = todos[targetIndex];
    try {
      upsertTodo({ ...current, sort_order: target.sort_order, updated_at: new Date().toISOString() });
      upsertTodo({ ...target, sort_order: current.sort_order, updated_at: new Date().toISOString() });
      await api.updateExperimentTodo(current.id, { sortOrder: target.sort_order });
      await api.updateExperimentTodo(target.id, { sortOrder: current.sort_order });
    } catch (error) {
      console.error('Failed to reorder todos:', error);
      upsertTodo(current);
      upsertTodo(target);
    }
  };

  const renderTodoPanel = () => (
    <TodoListPanel
      todos={todos}
      draftValue={todoDraft}
      onDraftChange={setTodoDraft}
      onAdd={() => void handleCreateTodo()}
      onToggle={(todo) => void handleToggleTodo(todo)}
      onUpdateDueDate={(todoId, dueDate) => void handleUpdateTodoDueDate(todoId, dueDate)}
      onMoveUp={(todoId) => void handleMoveTodo(todoId, 'up')}
      onMoveDown={(todoId) => void handleMoveTodo(todoId, 'down')}
      onDelete={(todoId) => void handleDeleteTodo(todoId)}
      editingTodoId={editingTodoId}
      editingTodoTitle={editingTodoTitle}
      onStartEdit={(todo) => {
        setEditingTodoId(todo.id);
        setEditingTodoTitle(todo.title);
      }}
      onEditChange={setEditingTodoTitle}
      onCommitEdit={(todoId, title) => void handleUpdateTodoTitle(todoId, title)}
      onCancelEdit={() => {
        setEditingTodoId(null);
        setEditingTodoTitle('');
      }}
      userById={userById}
    />
  );

  const refreshHypotheses = async () => {
    if (!nodeLookup?.node || nodeLookup.type !== 'opportunity') return;
    try {
      const list = await api.listHypotheses(nodeLookup.node.id);
      setHypotheses(list || []);
    } catch (error) {
      console.error('Failed to refresh hypotheses:', error);
    }
  };

  const handleCreateHypothesis = async () => {
    if (!nodeLookup?.node || nodeLookup.type !== 'opportunity') return;
    const trimmed = hypothesisDraft.trim();
    if (!trimmed) return;
    try {
      await api.createHypothesis(nodeLookup.node.id, trimmed.slice(0, 240));
      setHypothesisDraft('');
      await refreshHypotheses();
    } catch (error) {
      console.error('Failed to create hypothesis:', error);
    }
  };

  const handleUpdateHypothesis = async (hypothesisId, updates) => {
    try {
      await api.updateHypothesis(hypothesisId, updates);
      await refreshHypotheses();
    } catch (error) {
      console.error('Failed to update hypothesis:', error);
    }
  };

  const handleDeleteHypothesis = async (hypothesisId) => {
    try {
      await api.deleteHypothesis(hypothesisId);
      await refreshHypotheses();
    } catch (error) {
      console.error('Failed to delete hypothesis:', error);
    }
  };

  const handleTestHypothesis = async (hypothesis) => {
    if (!nodeLookup?.node || nodeLookup.type !== 'opportunity') return;
    setProposeHypothesisId(hypothesis.id);
    setSolutionTitle(hypothesis.statement || DEFAULT_TITLES.solution);
    setSolutionDescription('');
  };

  const handleCreateSolutionExperiment = async (hypothesis) => {
    if (!nodeLookup?.node || nodeLookup.type !== 'opportunity') return;
    const trimmedTitle = solutionTitle.trim();
    if (!trimmedTitle) return;
    try {
      const workspaceId =
        nodeLookup.node.workspaceId ||
        nodeLookup.parent?.workspaceId ||
        nodeLookup.root?.workspaceId ||
        null;
      const createdSolution = await api.createSolution(nodeLookup.node.id, {
        title: trimmedTitle,
        description: solutionDescription.trim() || null,
        workspaceId
      });
      const experiment = await api.createExperiment(createdSolution.id, {
        type: 'custom',
        title: hypothesis.statement,
        hypothesis: hypothesis.statement,
        hypothesisId: hypothesis.id,
        status: 'planned'
      });
      setProposeHypothesisId(null);
      setSolutionTitle('');
      setSolutionDescription('');
      onUpdate?.();
      if (experiment?.id) {
        setSelectedKey(getNodeKey('test', experiment.id));
      }
    } catch (error) {
      console.error('Failed to create solution + experiment:', error);
      alert(error.message || 'Failed to create solution and experiment');
    }
  };

  const handleCompleteExperiment = async () => {
    if (!nodeLookup?.node || nodeLookup.type !== 'test') return;
    const payload = buildPayload(draft, {
      ...testDraft,
      resultDecision: decisionDraft,
      testStatus: 'done',
      resultSummary: reflection.trim() || testDraft.resultSummary || ''
    });
    setSaveState('saving');
    await handleSave(payload, { refresh: false });
    setShowCompleteModal(false);
  };

  const isDecisionEnabled = todos.some((item) => item.is_done) || evidenceItems.length > 0;

  useEffect(() => {
    if (!isDecisionEnabled || nodeLookup?.type !== 'test') return;
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        setShowCompleteModal(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isDecisionEnabled, nodeLookup?.type]);

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

  const handleSave = async (payload = buildPayload(), options = {}) => {
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
      if (selectedKey) {
        onUpdate?.('patch-node', { nodeKey: selectedKey, changes: payload });
      }
      if (options.refresh) {
        onUpdate?.();
      }
      setSaveState('saved');
    } catch (error) {
      console.error('Failed to update node:', error);
      setSaveState('error');
    }
  };

  const handleDeleteOutcome = async () => {
    if (nodeLookup?.type !== 'outcome' || !nodeLookup.node?.id) return;
    const confirmed = window.confirm('Delete this outcome and all its children?');
    if (!confirmed) return;
    try {
      await api.deleteOutcome(nodeLookup.node.id);
      if (selectedKey) {
        setSelectedKey(null);
      }
      onUpdate?.('delete-node', { nodeKey: selectedKey });
    } catch (error) {
      console.error('Failed to delete outcome:', error);
      alert(error.message || 'Failed to delete outcome');
    }
  };

  const isOpen = Boolean(nodeLookup?.node);
  const ownerUser = nodeLookup?.node?.owner ? userById[nodeLookup.node.owner] : null;

  return (
    <aside
      className={`side-panel ${isDrawer ? 'side-panel-drawer' : ''} ${isOpen ? 'is-open' : ''}`}
      style={{ width: panelWidth }}
    >
      <div id="side-panel-resizer" className="side-panel-resizer" />
      {!isOpen && (
        <div className="side-panel-empty">Select a node to edit details.</div>
      )}
      {!isOpen ? null : (
        <>
      <div className="side-panel-header">
        <div className="side-panel-title">
          {nodeTypeLabels[nodeLookup.type] || 'Node'}
        </div>
        {ownerUser && (
          <div className="side-panel-owner">
            <Avatar user={ownerUser} size={24} isOwner />
          </div>
        )}
      </div>

      {nodeLookup.type === 'test' ? (
        <div className="side-panel-test">
          <div className="side-panel-meta">
            <div className="side-panel-field">
              <label htmlFor="side-title">Title</label>
              <input
                id="side-title"
                value={draft.title}
                onChange={(e) => handleFieldChange('title', e.target.value, { immediate: true })}
                onBlur={flushSave}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    flushSave();
                  }
                }}
                placeholder="Title"
              />
            </div>

            <div className="side-panel-field side-panel-description">
              <div className="side-panel-field-header">
                <label htmlFor="side-description">Description</label>
                <button
                  type="button"
                  className="side-panel-link"
                  onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                >
                  {isDescriptionExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <textarea
                id="side-description"
                value={draft.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                onBlur={flushSave}
                placeholder="Add a short description"
                rows={isDescriptionExpanded ? 4 : 2}
                className={isDescriptionExpanded ? '' : 'is-collapsed'}
              />
            </div>

            <div className="side-panel-row two-col">
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
                  onChange={(e) => handleFieldChange('status', e.target.value, { immediate: true })}
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
                  onChange={(e) => handleFieldChange('owner', e.target.value, { immediate: true })}
                >
                  <option value="">Unassigned</option>
                  {ownerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="phase-grid">
            <div className="stepper-line" aria-hidden="true" />
            <div className={`stepper-dot ${activePhase === 'context' ? 'active' : ''}`} />
            <div
              className="experiment-section phase-card phase-card-context"
              onFocusCapture={() => setActivePhase('context')}
              onClick={() => setActivePhase('context')}
            >
              <div className="experiment-section-header">
                <div>
                  <div className="experiment-section-title">Context</div>
                  <div className="experiment-section-subtitle">
                    Define the hypothesis and success criteria.
                  </div>
                </div>
                <button
                  type="button"
                  className="experiment-section-toggle"
                  onClick={() => setIsThinkOpen((prev) => !prev)}
                >
                  <span>{isThinkOpen ? 'Collapse' : 'Expand'}</span>
                </button>
              </div>
              {isThinkOpen && (
                <div className="experiment-section-content">
                  <div className="side-panel-section">
                    <div className="side-panel-section-title">Testing hypothesis</div>
                    <div className="read-only-box">
                      {(hypotheses || []).find((item) => item.id === nodeLookup.node.hypothesisId)
                        ?.statement || 'No hypothesis linked.'}
                    </div>
                    {nodeLookup.opportunity?.id && (
                      <button
                        type="button"
                        className="hypothesis-link"
                        onClick={() => setSelectedKey(getNodeKey('opportunity', nodeLookup.opportunity.id))}
                      >
                        View parent opportunity
                      </button>
                    )}
                  </div>
                  <div className="side-panel-section">
                    <div className="side-panel-section-title">Test type</div>
                    <select
                      value={testDraft.testType || 'custom'}
                      onChange={(event) => handleTestTypeChange(event.target.value)}
                    >
                      <option value="interview">Interview</option>
                      <option value="cold_outreach">Cold Outreach</option>
                      <option value="pricing">Pricing</option>
                      <option value="prototype_usability">Prototype Usability</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="side-panel-section">
                    <div className="side-panel-section-title">Hypothesis</div>
                    <select
                      value={testDraft.hypothesisId || ''}
                      onChange={(event) => handleTestHypothesisChange(event.target.value)}
                    >
                      <option value="">None</option>
                      {(hypotheses || []).map((hypothesis) => (
                        <option key={hypothesis.id} value={hypothesis.id}>
                          {hypothesis.statement}
                        </option>
                      ))}
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
                </div>
              )}
            </div>

            <div className={`stepper-dot ${activePhase === 'do' ? 'active' : ''}`} />
            <div
              className="experiment-section experiment-section-primary phase-card phase-card-do"
              onFocusCapture={() => setActivePhase('do')}
              onClick={() => setActivePhase('do')}
            >
              {renderTodoPanel()}
            </div>

            <div className={`stepper-dot ${activePhase === 'decide' ? 'active' : ''}`} />
            <div
              className={`experiment-section experiment-section-decision phase-card phase-card-decide ${
                isDecisionEnabled ? 'enabled' : 'disabled'
              }`}
              onFocusCapture={() => setActivePhase('decide')}
              onClick={() => setActivePhase('decide')}
            >
              <div className="experiment-section-header">
                <div>
                  <div className="experiment-section-title">Decide</div>
                  {!isDecisionEnabled && (
                    <div className="phase-helper">
                      Complete todos or add evidence to decide.
                    </div>
                  )}
                </div>
                <div className="phase-actions">
                  {isDecisionEnabled && <span className="phase-chip">Ready</span>}
                  <button
                    type="button"
                    className="experiment-complete-btn"
                    disabled={!isDecisionEnabled}
                    onClick={() => setShowCompleteModal(true)}
                  >
                    Complete Experiment
                  </button>
                </div>
              </div>
              <div className="experiment-section-content">
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
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="side-panel-field">
            <label htmlFor="side-title">Title</label>
            <input
              id="side-title"
              value={draft.title}
              onChange={(e) => handleFieldChange('title', e.target.value, { immediate: true })}
              onBlur={flushSave}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  flushSave();
                }
              }}
              placeholder="Title"
            />
          </div>

          <div className="side-panel-field">
            <label htmlFor="side-description">Description</label>
            <textarea
              id="side-description"
              value={draft.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              onBlur={flushSave}
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
              onChange={(e) => handleFieldChange('status', e.target.value, { immediate: true })}
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
              onChange={(e) => handleFieldChange('owner', e.target.value, { immediate: true })}
            >
              <option value="">Unassigned</option>
              {ownerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {nodeLookup.type === 'opportunity' && (
        <div className="side-panel-section">
          <div className="side-panel-section-title">Hypotheses</div>
          <div className="todo-input-row">
            <input
              value={hypothesisDraft}
              placeholder="Add a hypothesis..."
              maxLength={240}
              onChange={(event) => setHypothesisDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreateHypothesis();
                }
              }}
            />
            <button type="button" onClick={() => void handleCreateHypothesis()}>
              Add
            </button>
          </div>
          {isLoadingHypotheses ? (
            <div className="side-panel-empty">Loading hypotheses…</div>
          ) : (
            <div className="hypothesis-list">
              {hypotheses.map((hypothesis) => (
                <div key={hypothesis.id} className="hypothesis-row">
                  {editingHypothesisId === hypothesis.id ? (
                    <input
                      className="hypothesis-input"
                      value={editingHypothesisStatement}
                      onChange={(event) => setEditingHypothesisStatement(event.target.value)}
                      onBlur={() => {
                        void handleUpdateHypothesis(hypothesis.id, {
                          statement: editingHypothesisStatement.trim()
                        });
                        setEditingHypothesisId(null);
                        setEditingHypothesisStatement('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleUpdateHypothesis(hypothesis.id, {
                            statement: editingHypothesisStatement.trim()
                          });
                          setEditingHypothesisId(null);
                          setEditingHypothesisStatement('');
                        }
                        if (event.key === 'Escape') {
                          setEditingHypothesisId(null);
                          setEditingHypothesisStatement('');
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="hypothesis-statement"
                      onClick={() => {
                        setEditingHypothesisId(hypothesis.id);
                        setEditingHypothesisStatement(hypothesis.statement);
                      }}
                    >
                      {hypothesis.statement}
                    </button>
                  )}
                  <select
                    value={hypothesis.status || 'untested'}
                    onChange={(event) =>
                      void handleUpdateHypothesis(hypothesis.id, { status: event.target.value })
                    }
                  >
                    <option value="untested">Untested</option>
                    <option value="supported">Supported</option>
                    <option value="disproven">Disproven</option>
                  </select>
                  <div className="hypothesis-actions">
                    <button type="button" onClick={() => void handleTestHypothesis(hypothesis)}>
                      Propose a solution to test this hypothesis
                    </button>
                    <button type="button" onClick={() => void handleDeleteHypothesis(hypothesis.id)}>
                      ✕
                    </button>
                  </div>
                  {proposeHypothesisId === hypothesis.id && (
                    <div className="hypothesis-propose">
                      <label htmlFor={`solution-title-${hypothesis.id}`}>
                        What solution or intervention do you want to try?
                      </label>
                      <input
                        id={`solution-title-${hypothesis.id}`}
                        value={solutionTitle}
                        onChange={(event) => setSolutionTitle(event.target.value)}
                        placeholder="Solution title"
                      />
                      <textarea
                        value={solutionDescription}
                        onChange={(event) => setSolutionDescription(event.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                      />
                      <div className="hypothesis-propose-actions">
                        <button type="button" onClick={() => setProposeHypothesisId(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => void handleCreateSolutionExperiment(hypothesis)}
                        >
                          Create solution & experiment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {hypotheses.length === 0 && (
                <div className="side-panel-empty">No hypotheses yet.</div>
              )}
            </div>
          )}
        </div>
      )}

      {false && (
        <>
          <div className="experiment-section">
            <button
              type="button"
              className="experiment-section-toggle"
              onClick={() => setIsThinkOpen((prev) => !prev)}
            >
              <span>Think</span>
              <span>{isThinkOpen ? '–' : '+'}</span>
            </button>
            {isThinkOpen && (
              <div className="experiment-section-content">
                <div className="side-panel-section">
                  <div className="side-panel-section-title">Testing hypothesis</div>
                  <div className="read-only-box">
                    {(hypotheses || []).find((item) => item.id === nodeLookup.node.hypothesisId)
                      ?.statement || 'No hypothesis linked.'}
                  </div>
                  {nodeLookup.opportunity?.id && (
                    <button
                      type="button"
                      className="hypothesis-link"
                      onClick={() => setSelectedKey(getNodeKey('opportunity', nodeLookup.opportunity.id))}
                    >
                      View parent opportunity
                    </button>
                  )}
                </div>
                <div className="side-panel-section">
                  <div className="side-panel-section-title">Test type</div>
                  <select
                    value={testDraft.testType || 'custom'}
                    onChange={(event) => handleTestTypeChange(event.target.value)}
                  >
                    <option value="interview">Interview</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="pricing">Pricing</option>
                    <option value="prototype_usability">Prototype Usability</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="side-panel-section">
                  <div className="side-panel-section-title">Hypothesis</div>
                  <select
                    value={testDraft.hypothesisId || ''}
                    onChange={(event) => handleTestHypothesisChange(event.target.value)}
                  >
                    <option value="">None</option>
                    {(hypotheses || []).map((hypothesis) => (
                      <option key={hypothesis.id} value={hypothesis.id}>
                        {hypothesis.statement}
                      </option>
                    ))}
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
              </div>
            )}
          </div>

          <div className="experiment-section experiment-section-primary">
            {renderTodoPanel()}
          </div>

          <div
            className={`experiment-section experiment-section-decision ${
              isDecisionEnabled ? 'enabled' : 'disabled'
            }`}
          >
            <div className="experiment-section-header">
              <div className="experiment-section-title">Decide</div>
              <button
                type="button"
                className="experiment-complete-btn"
                disabled={!isDecisionEnabled}
                onClick={() => setShowCompleteModal(true)}
              >
                Complete Experiment
              </button>
            </div>
            <div className="experiment-section-content">
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
            </div>
          </div>

          {showCompleteModal && (
            <div className="experiment-modal-backdrop" onClick={() => setShowCompleteModal(false)}>
              <div className="experiment-modal" onClick={(event) => event.stopPropagation()}>
                <div className="experiment-modal-header">Complete experiment</div>
                <div className="side-panel-field">
                  <label htmlFor="experiment-reflection">What did we learn?</label>
                  <textarea
                    id="experiment-reflection"
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="side-panel-field">
                  <label htmlFor="experiment-decision">Decision</label>
                  <select
                    id="experiment-decision"
                    value={decisionDraft}
                    onChange={(event) => setDecisionDraft(event.target.value)}
                  >
                    <option value="pass">Pass</option>
                    <option value="iterate">Iterate</option>
                    <option value="kill">Kill</option>
                  </select>
                </div>
                <div className="experiment-modal-actions">
                  <button type="button" onClick={() => setShowCompleteModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="primary" onClick={() => void handleCompleteExperiment()}>
                    Confirm decision
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {nodeLookup.type === 'test' && showCompleteModal && (
        <div className="experiment-modal-backdrop" onClick={() => setShowCompleteModal(false)}>
          <div className="experiment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="experiment-modal-header">Complete experiment</div>
            <div className="side-panel-field">
              <label htmlFor="experiment-reflection">What did we learn?</label>
              <textarea
                id="experiment-reflection"
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                rows={3}
              />
            </div>
            <div className="side-panel-field">
              <label htmlFor="experiment-decision">Decision</label>
              <select
                id="experiment-decision"
                value={decisionDraft}
                onChange={(event) => setDecisionDraft(event.target.value)}
              >
                <option value="pass">Pass</option>
                <option value="iterate">Iterate</option>
                <option value="kill">Kill</option>
              </select>
            </div>
            <div className="experiment-modal-actions">
              <button type="button" onClick={() => setShowCompleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => void handleCompleteExperiment()}>
                Confirm decision
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="side-panel-actions">
        <div className={`side-panel-save-state side-panel-save-state-${saveState}`}>
          {saveState === 'saving' && 'Saving...'}
          {saveState === 'saved' && 'All changes saved'}
          {saveState === 'error' && 'Save failed'}
        </div>
        {nodeLookup.type === 'outcome' && (
          <button className="side-panel-delete" type="button" onClick={handleDeleteOutcome}>
            Delete outcome
          </button>
        )}
      </div>
      </>
      )}
    </aside>
  );
}

export default SidePanel;
