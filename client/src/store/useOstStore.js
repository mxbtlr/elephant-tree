import React, { createContext, useContext, useMemo, useReducer } from 'react';

const OstStoreContext = createContext(null);

const initialState = {
  viewMode: 'tree',
  treeStructure: 'classic', // 'classic' | 'journey'
  selectedKey: null,
  collapsed: {},
  layoutUnlocked: false,
  focusKey: null,
  nodeOverrides: {},
  renamingKey: null,
  evidenceByTest: {},
  todosById: {},
  todoIdsByTest: {}
};

const buildTodoIdsByTest = (todosById) => {
  const grouped = {};
  Object.values(todosById).forEach((todo) => {
    const testId = todo.experiment_id;
    if (!testId) return;
    if (!grouped[testId]) grouped[testId] = [];
    grouped[testId].push(todo);
  });
  const ordered = {};
  Object.entries(grouped).forEach(([testId, items]) => {
    ordered[testId] = items
      .sort((a, b) => {
        const sortA = a.sort_order ?? 0;
        const sortB = b.sort_order ?? 0;
        if (sortA !== sortB) return sortA - sortB;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
      .map((todo) => todo.id);
  });
  return ordered;
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_TREE_STRUCTURE':
      return { ...state, treeStructure: action.payload };
    case 'SET_SELECTED':
      return { ...state, selectedKey: action.payload, focusKey: action.payload };
    case 'CLEAR_SELECTED':
      return { ...state, selectedKey: null };
    case 'TOGGLE_COLLAPSE': {
      const next = { ...state.collapsed };
      next[action.payload] = !next[action.payload];
      return { ...state, collapsed: next };
    }
    case 'SET_COLLAPSE_MAP':
      return { ...state, collapsed: action.payload };
    case 'SET_LAYOUT_UNLOCKED':
      return { ...state, layoutUnlocked: action.payload };
    case 'SET_FOCUS_KEY':
      return { ...state, focusKey: action.payload };
    case 'SET_NODE_OVERRIDE': {
      const { key, changes } = action.payload;
      return {
        ...state,
        nodeOverrides: {
          ...state.nodeOverrides,
          [key]: { ...(state.nodeOverrides[key] || {}), ...changes }
        }
      };
    }
    case 'SET_RENAMING_KEY':
      return { ...state, renamingKey: action.payload };
    case 'SET_EVIDENCE': {
      const { testId, items } = action.payload;
      return {
        ...state,
        evidenceByTest: {
          ...state.evidenceByTest,
          [testId]: items
        }
      };
    }
    case 'CLEAR_OVERRIDES':
      return { ...state, nodeOverrides: {} };
    case 'SET_TODOS': {
      const map = {};
      (action.payload || []).forEach((todo) => {
        map[todo.id] = todo;
      });
      return {
        ...state,
        todosById: map,
        todoIdsByTest: buildTodoIdsByTest(map)
      };
    }
    case 'UPSERT_TODO': {
      const nextTodo = action.payload;
      if (!nextTodo?.id) return state;
      const prevTodo = state.todosById[nextTodo.id];
      const prevTestId = prevTodo?.experiment_id || null;
      const nextTestId = nextTodo.experiment_id || prevTestId;
      const todosById = {
        ...state.todosById,
        [nextTodo.id]: { ...(prevTodo || {}), ...nextTodo }
      };
      const todoIdsByTest = { ...state.todoIdsByTest };
      const affected = new Set([prevTestId, nextTestId].filter(Boolean));
      affected.forEach((testId) => {
        const items = Object.values(todosById).filter((todo) => todo.experiment_id === testId);
        todoIdsByTest[testId] = items
          .sort((a, b) => {
            const sortA = a.sort_order ?? 0;
            const sortB = b.sort_order ?? 0;
            if (sortA !== sortB) return sortA - sortB;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          })
          .map((todo) => todo.id);
      });
      return { ...state, todosById, todoIdsByTest };
    }
    case 'REMOVE_TODO': {
      const todoId = action.payload;
      const prevTodo = state.todosById[todoId];
      if (!prevTodo) return state;
      const todosById = { ...state.todosById };
      delete todosById[todoId];
      const todoIdsByTest = { ...state.todoIdsByTest };
      if (prevTodo.experiment_id) {
        const items = Object.values(todosById).filter(
          (todo) => todo.experiment_id === prevTodo.experiment_id
        );
        todoIdsByTest[prevTodo.experiment_id] = items
          .sort((a, b) => {
            const sortA = a.sort_order ?? 0;
            const sortB = b.sort_order ?? 0;
            if (sortA !== sortB) return sortA - sortB;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          })
          .map((todo) => todo.id);
      }
      return { ...state, todosById, todoIdsByTest };
    }
    case 'SET_TODO_ORDER': {
      const { testId, orderedIds } = action.payload || {};
      if (!testId) return state;
      return {
        ...state,
        todoIdsByTest: {
          ...state.todoIdsByTest,
          [testId]: orderedIds || []
        }
      };
    }
    default:
      return state;
  }
};

export const OstStoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
      setTreeStructure: (structure) => dispatch({ type: 'SET_TREE_STRUCTURE', payload: structure }),
      setSelectedKey: (key) => dispatch({ type: 'SET_SELECTED', payload: key }),
      clearSelection: () => dispatch({ type: 'CLEAR_SELECTED' }),
      toggleCollapse: (key) => dispatch({ type: 'TOGGLE_COLLAPSE', payload: key }),
      setCollapseMap: (map) => dispatch({ type: 'SET_COLLAPSE_MAP', payload: map }),
      setLayoutUnlocked: (value) => dispatch({ type: 'SET_LAYOUT_UNLOCKED', payload: value }),
      setFocusKey: (key) => dispatch({ type: 'SET_FOCUS_KEY', payload: key }),
      setNodeOverride: (key, changes) =>
        dispatch({ type: 'SET_NODE_OVERRIDE', payload: { key, changes } }),
      setRenamingKey: (key) => dispatch({ type: 'SET_RENAMING_KEY', payload: key }),
      setEvidence: (testId, items) => dispatch({ type: 'SET_EVIDENCE', payload: { testId, items } }),
      clearOverrides: () => dispatch({ type: 'CLEAR_OVERRIDES' }),
      setTodos: (todos) => dispatch({ type: 'SET_TODOS', payload: todos }),
      upsertTodo: (todo) => dispatch({ type: 'UPSERT_TODO', payload: todo }),
      removeTodo: (todoId) => dispatch({ type: 'REMOVE_TODO', payload: todoId }),
      setTodoOrder: (testId, orderedIds) =>
        dispatch({ type: 'SET_TODO_ORDER', payload: { testId, orderedIds } })
    }),
    []
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <OstStoreContext.Provider value={value}>{children}</OstStoreContext.Provider>;
};

export const useOstStore = () => {
  const context = useContext(OstStoreContext);
  if (!context) {
    throw new Error('useOstStore must be used within OstStoreProvider');
  }
  return context;
};
