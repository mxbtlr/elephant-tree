import React, { createContext, useContext, useMemo, useReducer } from 'react';

const OstStoreContext = createContext(null);

const initialState = {
  viewMode: 'tree',
  selectedKey: null,
  collapsed: {},
  layoutUnlocked: false,
  focusKey: null,
  nodeOverrides: {},
  renamingKey: null,
  evidenceByTest: {}
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
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
    default:
      return state;
  }
};

export const OstStoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
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
      clearOverrides: () => dispatch({ type: 'CLEAR_OVERRIDES' })
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
