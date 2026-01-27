import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import TreeView from './components/TreeView';
import AddOutcomeButton from './components/AddOutcomeButton';
import WorkspaceMembersModal from './components/WorkspaceMembersModal';
import CreateTeamWorkspaceModal from './components/CreateTeamWorkspaceModal';
import CreateDecisionSpaceModal from './components/CreateDecisionSpaceModal';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import SidePanel from './components/SidePanel';
import WorkView from './components/WorkView';
import DashboardView from './components/DashboardView';
import CommandPalette from './components/CommandPalette';
import api from './services/supabaseApi';
import { supabase } from './services/supabase';
import { DEFAULT_TITLES, getNodeKey, parseNodeKey } from './lib/ostTypes';
import { buildOstForest } from './lib/ostTree';
import { useOstStore } from './store/useOstStore';

function App() {
  const [outcomes, setOutcomes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeDecisionSpaceId, setActiveDecisionSpaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [decisionSpaces, setDecisionSpaces] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateDecisionSpaceModal, setShowCreateDecisionSpaceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState('tree');
  const [lastStructurePage, setLastStructurePage] = useState('tree');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const commandInputRef = useRef(null);
  const lastWorkspaceSwitchRef = useRef(0);
  const {
    state: { viewMode, selectedKey, nodeOverrides },
    actions: { setViewMode, setNodeOverride, setSelectedKey, setRenamingKey, setFocusKey }
  } = useOstStore();
  const DEBUG_AUTH = false;
  const isLegacyWorkspaceId = (value) =>
    typeof value === 'string' && (value.startsWith('team:') || value.startsWith('personal:'));
  const resolveWorkspaceId = (value) => {
    if (!value || !isLegacyWorkspaceId(value)) return value;
    if (value.startsWith('personal:')) {
      const ownerId = value.replace('personal:', '');
      const personalWorkspace = workspaces.find(
        (workspace) => workspace.type === 'personal' && workspace.owner_id === ownerId
      );
      return personalWorkspace?.id || value;
    }
    return value;
  };
  // Simple cache to avoid repeated requests
  const dataCache = useRef({ outcomes: null, teams: null, cacheTime: 0 });
  const CACHE_DURATION = 30000; // 30 seconds

  const legacyTeamWorkspaces = useMemo(() => {
    if (!user) return [];
    const fromTeams = teams.map((team) => ({
      id: `team:${team.id}`,
      name: team.name,
      type: 'team',
      owner_id: team.created_by || user.id,
      legacyTeamId: team.id,
      memberCount: team.memberCount || team.members?.length || 1
    }));

    const teamIdsFromOutcomes = Array.from(
      new Set(outcomes.map((outcome) => outcome.teamId).filter(Boolean))
    );
    const fromOutcomes = teamIdsFromOutcomes
      .filter((teamId) => !fromTeams.some((team) => team.legacyTeamId === teamId))
      .map((teamId) => ({
        id: `team:${teamId}`,
        name: 'Team Workspace',
        type: 'team',
        owner_id: user.id,
        legacyTeamId: teamId,
        memberCount: 1
      }));

    return [...fromTeams, ...fromOutcomes];
  }, [teams, user, outcomes]);

  const effectiveWorkspaces = useMemo(() => {
    const base = workspaces.length > 0 ? [...workspaces] : [];
    const hasPersonal = base.some((ws) => ws.type === 'personal');
    if (!hasPersonal && user) {
      base.unshift({
        id: `personal:${user.id}`,
        name: 'Personal Workspace',
        type: 'personal',
        owner_id: user.id,
        legacyTeamId: null,
        memberCount: 1
      });
    }
    legacyTeamWorkspaces.forEach((teamWorkspace) => {
      const exists = base.some(
        (ws) => ws.id === teamWorkspace.id || ws.legacyTeamId === teamWorkspace.legacyTeamId
      );
      if (!exists) base.push(teamWorkspace);
    });
    return base;
  }, [legacyTeamWorkspaces, user, workspaces]);

  const activeWorkspace = useMemo(
    () => effectiveWorkspaces.find((workspace) => workspace.id === activeWorkspaceId) || null,
    [activeWorkspaceId, effectiveWorkspaces]
  );
  const resolvedWorkspaceId = resolveWorkspaceId(activeWorkspaceId);
  const workspaceIdForWrite = isLegacyWorkspaceId(resolvedWorkspaceId)
    ? null
    : resolvedWorkspaceId;
  const legacyTeamIdForWrite = isLegacyWorkspaceId(activeWorkspaceId)
    ? activeWorkspace?.legacyTeamId || null
    : null;
  const isWorkMode = currentPage === 'work';

  useEffect(() => {
    if (currentPage === 'tree' || currentPage === 'dashboard') {
      setLastStructurePage(currentPage);
    }
  }, [currentPage]);

  const outcomesForWorkspace = useMemo(() => {
    if (!activeWorkspaceId) return [];
    const workspace = effectiveWorkspaces.find((item) => item.id === activeWorkspaceId);
    if (!workspace) return [];
    return outcomes.filter((outcome) => {
      if (outcome.workspaceId) {
        return outcome.workspaceId === activeWorkspaceId;
      }
      if (workspace.type === 'personal') {
        return !outcome.teamId;
      }
      return outcome.teamId === workspace.legacyTeamId;
    });
  }, [activeWorkspaceId, outcomes, effectiveWorkspaces]);

  const outcomesForDecisionSpace = useMemo(() => {
    if (!activeDecisionSpaceId) return [];
    return outcomesForWorkspace.filter(
      (item) => item.decisionSpaceId === activeDecisionSpaceId
    );
  }, [activeDecisionSpaceId, outcomesForWorkspace]);

  const activeDecisionSpace = useMemo(
    () => decisionSpaces.find((space) => space.id === activeDecisionSpaceId) || null,
    [decisionSpaces, activeDecisionSpaceId]
  );

  const loadData = async (forceRefresh = false) => {
    try {
      const now = Date.now();
      // Use cache if available and not expired
      if (!forceRefresh && dataCache.current.outcomes && (now - dataCache.current.cacheTime) < CACHE_DURATION) {
        console.log('Using cached outcomes');
        setOutcomes(dataCache.current.outcomes);
        return dataCache.current.outcomes;
      }
      
      const data = await api.getOutcomes();
      setOutcomes(data || []);
      // Update cache
      dataCache.current.outcomes = data || [];
      dataCache.current.cacheTime = now;
      return data;
    } catch (error) {
      console.error('Error loading data:', error);
      // Keep existing outcomes on transient failures to avoid view resets.
      if (!dataCache.current.outcomes) {
        setOutcomes([]);
      }
      return dataCache.current.outcomes || [];
    }
  };

  const loadTeams = async (forceRefresh = false) => {
    try {
      const now = Date.now();
      // Use cache if available and not expired
      if (!forceRefresh && dataCache.current.teams && (now - dataCache.current.cacheTime) < CACHE_DURATION) {
        console.log('Using cached teams');
        setTeams(dataCache.current.teams);
        return dataCache.current.teams;
      }
      
      const teamsData = await api.getTeams();
      setTeams(teamsData || []);
      // Update cache
      dataCache.current.teams = teamsData || [];
      dataCache.current.cacheTime = now;
      return teamsData;
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
      throw error; // Re-throw so Promise.all can catch it
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (DEBUG_AUTH) console.log('[auth] init: start');
        const userData = await api.getCurrentUser();
        if (!mounted) return;
        if (userData) {
          setUser(userData);
          // Don't block initial render on data loads; avoid infinite "Loading..."
          void Promise.allSettled([loadData(), loadTeams()]);
        }
      } catch (err) {
        if (DEBUG_AUTH) console.warn('[auth] init: error', err);
      } finally {
        if (mounted) setAuthInitializing(false);
        if (DEBUG_AUTH) console.log('[auth] init: done');
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (DEBUG_AUTH) console.log('[auth] state change', event);

        if (session) {
          const basicUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email,
            profile: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.email,
              role: 'user'
            }
          };
          setUser(basicUser);
          // Avoid blocking auth state change on slow data fetches
          void Promise.allSettled([loadData(), loadTeams()]);
          void api.claimPendingMemberships().catch((error) => {
            console.warn('Failed to claim memberships', error);
          });
        } else {
          setUser(null);
          setOutcomes([]);
          setTeams([]);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const list = await api.getUsers();
        setUsers(list || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    if (user) {
      void loadUsers();
    }
  }, [user]);

  const handleLogin = async (userData) => {
    setUser(userData);
    loadData();
    loadTeams();
    try {
      await api.claimPendingMemberships();
    } catch (error) {
      console.warn('Failed to claim memberships', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setUser(null);
    setOutcomes([]);
    setTeams([]);
  };

  const getViewFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'tree' || view === 'list') return view;
    return null;
  };

  const getPageFromPath = (path) => {
    if (path.startsWith('/work')) return 'work';
    if (path.startsWith('/dashboard')) return 'dashboard';
    return 'tree';
  };

  const parseRoute = () => {
    const match = window.location.pathname.match(/workspaces\/([^/]+)\/spaces\/?([^/]*)/);
    if (!match) return null;
    return {
      workspaceId: decodeURIComponent(match[1]),
      spaceId: match[2] ? decodeURIComponent(match[2]) : null
    };
  };

  const getLastSpaceMap = () => {
    try {
      return JSON.parse(localStorage.getItem('treeflow:lastSpaceByWorkspace') || '{}');
    } catch (error) {
      return {};
    }
  };

  const setLastSpaceForWorkspace = (workspaceId, spaceId) => {
    if (!workspaceId || !spaceId) return;
    const map = getLastSpaceMap();
    map[workspaceId] = spaceId;
    localStorage.setItem('treeflow:lastSpaceByWorkspace', JSON.stringify(map));
  };

  const ensureActiveDecisionSpace = async (workspaceId) => {
    const resolvedWorkspaceId = resolveWorkspaceId(workspaceId);
    if (!resolvedWorkspaceId) return null;
    if (isLegacyWorkspaceId(resolvedWorkspaceId)) {
      setDecisionSpaces([]);
      setActiveDecisionSpaceId(null);
      window.history.replaceState(
        {},
        '',
        `/workspaces/${encodeURIComponent(resolvedWorkspaceId)}/spaces/`
      );
      return null;
    }
    const spaces = await api.listDecisionSpaces(resolvedWorkspaceId);
    setDecisionSpaces(spaces || []);
    if (!spaces || spaces.length === 0) {
      setActiveDecisionSpaceId(null);
      window.history.replaceState(
        {},
        '',
        `/workspaces/${encodeURIComponent(resolvedWorkspaceId)}/spaces/`
      );
      return null;
    }
    const lastMap = getLastSpaceMap();
    const preferred = lastMap[resolvedWorkspaceId];
    const nextId = spaces.find((space) => space.id === preferred)?.id || spaces[0].id;
    setActiveDecisionSpaceId(nextId);
    setLastSpaceForWorkspace(resolvedWorkspaceId, nextId);
    window.history.replaceState(
      {},
      '',
      `/workspaces/${encodeURIComponent(resolvedWorkspaceId)}/spaces/${encodeURIComponent(nextId)}`
    );
    return nextId;
  };

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await api.listWorkspaces();
        if (!data || data.length === 0) {
          const created = await api.createWorkspace({
            name: 'Personal Workspace',
            type: 'personal',
            ownerEmail: user?.email
          });
          setWorkspaces([created]);
        } else {
          setWorkspaces(data);
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      }
    };
    if (user) {
      void loadWorkspaces();
    }
  }, [user]);

  useEffect(() => {
    const storedWorkspace = localStorage.getItem('treeflow:workspace');
    const route = parseRoute();
    const rawWorkspace =
      route?.workspaceId || storedWorkspace || effectiveWorkspaces[0]?.id || null;
    const nextWorkspace = resolveWorkspaceId(rawWorkspace);
    if (!nextWorkspace) return;
    const isSameWorkspace = activeWorkspaceId === nextWorkspace;
    if (!isSameWorkspace) {
      setActiveWorkspaceId(nextWorkspace);
      localStorage.setItem('treeflow:workspace', nextWorkspace);
    }
    if (rawWorkspace && nextWorkspace !== rawWorkspace) {
      const nextPath = `/workspaces/${encodeURIComponent(nextWorkspace)}/spaces/${encodeURIComponent(
        route?.spaceId || ''
      )}`;
      window.history.replaceState({}, '', nextPath);
    }
    if (route?.spaceId) {
      setActiveDecisionSpaceId(route.spaceId);
      setLastSpaceForWorkspace(nextWorkspace, route.spaceId);
      return;
    }
    if (!activeDecisionSpaceId || !isSameWorkspace) {
      void ensureActiveDecisionSpace(nextWorkspace);
    }
  }, [effectiveWorkspaces, activeWorkspaceId, activeDecisionSpaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const route = parseRoute();
    if (route?.workspaceId !== activeWorkspaceId) return;
    if (!route?.spaceId) {
      void ensureActiveDecisionSpace(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute();
      if (route?.workspaceId) {
        const resolvedWorkspaceId = resolveWorkspaceId(route.workspaceId);
        setActiveWorkspaceId(resolvedWorkspaceId);
        localStorage.setItem('treeflow:workspace', resolvedWorkspaceId);
        if (route?.spaceId) {
          setActiveDecisionSpaceId(route.spaceId);
          setLastSpaceForWorkspace(resolvedWorkspaceId, route.spaceId);
        } else {
          void ensureActiveDecisionSpace(resolvedWorkspaceId);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    localStorage.setItem('treeflow:workspace', activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void ensureActiveDecisionSpace(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    const boardId = activeWorkspaceId || 'default';
    const stored = localStorage.getItem(`treeflow:view:${boardId}`);
    const urlView = getViewFromUrl();
    const nextView = urlView || stored || 'tree';
    setViewMode(nextView);
  }, [activeWorkspaceId, setViewMode]);

  useEffect(() => {
    const boardId = activeWorkspaceId || 'default';
    if (viewMode) {
      localStorage.setItem(`treeflow:view:${boardId}`, viewMode);
    }
  }, [viewMode, activeWorkspaceId]);

  useEffect(() => {
    const handleCommandShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleCommandShortcut);
    return () => window.removeEventListener('keydown', handleCommandShortcut);
  }, []);

  useEffect(() => {
    setCurrentPage(getPageFromPath(window.location.pathname));
    const handlePopState = () => setCurrentPage(getPageFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setIsCommandOpen(false);
      setSelectedKey(null);
      setRenamingKey(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setSelectedKey, setRenamingKey]);

  useEffect(() => {
    const handleResizeObserverError = (event) => {
      if (event?.message?.includes('ResizeObserver loop completed')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handleResizeObserverError, true);
    return () => window.removeEventListener('error', handleResizeObserverError, true);
  }, []);

  const handleBoardUpdate = async (action, payload) => {
    if (!action) {
      await Promise.all([loadData(true), loadTeams(true)]);
      return;
    }

    try {
      let shouldRefresh = true;
      let createdOutcome = null;
      const applyNodePatch = (nodeKey, changes) => {
        if (!nodeKey || !changes) return;
        const sanitized = Object.entries(changes).reduce((acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        }, {});
        setOutcomes((prev) => {
          const parsed = parseNodeKey(nodeKey);
          if (!parsed) return prev;
          const { type, id } = parsed;
          if (type === 'outcome') {
            return (prev || []).map((outcome) =>
              outcome.id === id ? { ...outcome, ...sanitized } : outcome
            );
          }
          return (prev || []).map((outcome) => ({
            ...outcome,
            opportunities: (outcome.opportunities || []).map((opp) => {
              if (type === 'opportunity' && opp.id === id) {
                return { ...opp, ...sanitized };
              }
              return {
                ...opp,
                solutions: (opp.solutions || []).map((sol) => {
                  if (type === 'solution' && sol.id === id) {
                    return { ...sol, ...sanitized };
                  }
                  return {
                    ...sol,
                    tests: (sol.tests || []).map((test) =>
                      type === 'test' && test.id === id ? { ...test, ...sanitized } : test
                    )
                  };
                })
              };
            })
          }));
        });
      };
      if (action === 'patch-node') {
        shouldRefresh = false;
        const { nodeKey, changes } = payload || {};
        applyNodePatch(nodeKey, changes);
        return;
      }
      if (action === 'delete-node') {
        shouldRefresh = false;
        const { nodeKey } = payload || {};
        if (!nodeKey) return;
        const parsed = parseNodeKey(nodeKey);
        if (!parsed) return;
        if (parsed.type === 'outcome') {
          await api.deleteOutcome(parsed.id);
          setOutcomes((prev) => (prev || []).filter((item) => item.id !== parsed.id));
        }
        if (parsed.type === 'opportunity') {
          await api.deleteOpportunity(parsed.id);
          setOutcomes((prev) =>
            (prev || []).map((outcome) => ({
              ...outcome,
              opportunities: (outcome.opportunities || []).filter((opp) => opp.id !== parsed.id)
            }))
          );
        }
        if (parsed.type === 'solution') {
          await api.deleteSolution(parsed.id);
          setOutcomes((prev) =>
            (prev || []).map((outcome) => ({
              ...outcome,
              opportunities: (outcome.opportunities || []).map((opp) => ({
                ...opp,
                solutions: (opp.solutions || []).filter((sol) => sol.id !== parsed.id)
              }))
            }))
          );
        }
        if (parsed.type === 'test') {
          await api.deleteTest(parsed.id);
          setOutcomes((prev) =>
            (prev || []).map((outcome) => ({
              ...outcome,
              opportunities: (outcome.opportunities || []).map((opp) => ({
                ...opp,
                solutions: (opp.solutions || []).map((sol) => ({
                  ...sol,
                  tests: (sol.tests || []).filter((test) => test.id !== parsed.id)
                }))
              }))
            }))
          );
        }
        setSelectedKey(null);
        setRenamingKey(null);
        return;
      }
      if (action === 'add-outcome') {
        if (workspaceIdForWrite && !activeDecisionSpaceId) {
          setShowCreateDecisionSpaceModal(true);
          return;
        }
        const decisionSpaceIdForWrite = workspaceIdForWrite ? activeDecisionSpaceId : null;
        const created = await api.createOutcome({
          title: DEFAULT_TITLES.outcome,
          workspaceId: workspaceIdForWrite,
          teamId: legacyTeamIdForWrite,
          decisionSpaceId: decisionSpaceIdForWrite
        });
        if (created) {
          createdOutcome = {
            ...created,
            workspaceId: created.workspaceId ?? workspaceIdForWrite ?? null,
            teamId: created.teamId ?? legacyTeamIdForWrite ?? null,
            decisionSpaceId: created.decisionSpaceId ?? decisionSpaceIdForWrite ?? null,
            opportunities: created.opportunities || []
          };
          setOutcomes((prev) => {
            const filtered = (prev || []).filter((item) => item.id !== createdOutcome.id);
            return [createdOutcome, ...filtered];
          });
        }
        if (created?.id) {
          const key = getNodeKey('outcome', created.id);
          setSelectedKey(key);
          setRenamingKey(key);
        }
      }

      if (action === 'add-child') {
        const parsed = parseNodeKey(payload.parentKey);
        if (!parsed) return;
        const { type, id } = parsed;
        if (payload.childType === 'opportunity' && type === 'outcome') {
          const created = await api.createOpportunity(id, {
            title: DEFAULT_TITLES.opportunity,
            workspaceId: workspaceIdForWrite
          });
          if (created?.id) setSelectedKey(getNodeKey('opportunity', created.id));
        }
        if (payload.childType === 'solution' && type === 'opportunity') {
          const created = await api.createSolution(id, {
            title: DEFAULT_TITLES.solution,
            workspaceId: workspaceIdForWrite
          });
          if (created?.id) setSelectedKey(getNodeKey('solution', created.id));
        }
        if (payload.childType === 'test' && type === 'solution') {
          const created = await api.createTest(id, {
            title: DEFAULT_TITLES.test,
            description: '',
            testTemplate: null,
            testType: 'custom',
            testStatus: 'planned',
            successCriteria: null,
            timebox: null,
            workspaceId: workspaceIdForWrite
          });
          if (created?.id) setSelectedKey(getNodeKey('test', created.id));
        }
      }

      if (action === 'rename') {
        shouldRefresh = false;
        const parsed = parseNodeKey(payload.nodeKey);
        if (!parsed) return;
        setNodeOverride(payload.nodeKey, { title: payload.title });
        applyNodePatch(payload.nodeKey, { title: payload.title });
        if (parsed.type === 'outcome') {
          await api.updateOutcome(parsed.id, { title: payload.title });
        }
        if (parsed.type === 'opportunity') {
          await api.updateOpportunity(parsed.id, { title: payload.title });
        }
        if (parsed.type === 'solution') {
          await api.updateSolution(parsed.id, { title: payload.title });
        }
        if (parsed.type === 'test') {
          await api.updateTest(parsed.id, { title: payload.title });
        }
      }

      if (shouldRefresh) {
        const refreshed = await loadData(true);
        await loadTeams(true);
        if (
          createdOutcome &&
          !(refreshed || []).some((item) => item.id === createdOutcome.id)
        ) {
          setOutcomes((prev) => {
            const filtered = (prev || []).filter((item) => item.id !== createdOutcome.id);
            return [createdOutcome, ...filtered];
          });
        }
      }
    } catch (error) {
      console.error('Failed to update board:', error);
      alert(error.message || 'Failed to update board');
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const navigateToPage = (page) => {
    setCurrentPage(page);
    if (page === 'work') {
      window.history.pushState({}, '', '/work');
      return;
    }
    if (page === 'dashboard') {
      window.history.pushState({}, '', '/dashboard');
      return;
    }
    if (resolvedWorkspaceId) {
      window.history.pushState(
        {},
        '',
        `/workspaces/${encodeURIComponent(resolvedWorkspaceId)}/spaces/${encodeURIComponent(activeDecisionSpaceId || '')}`
      );
    }
  };

  const openNode = (nodeKey) => {
    if (currentPage !== 'tree') {
      navigateToPage('tree');
    }
    setSelectedKey(nodeKey);
    setFocusKey(nodeKey);
    if (viewMode !== 'tree') {
      setViewMode('tree');
    }
  };

  const paletteNodes = useMemo(() => {
    const forest = buildOstForest(outcomesForDecisionSpace || [], nodeOverrides || {});
    return Object.values(forest.nodesByKey || {});
  }, [outcomesForDecisionSpace, nodeOverrides]);

  if (!user && !authInitializing) {
    return <Login onLogin={handleLogin} />;
  }

  if (authInitializing) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="app-title">TreeFlow</div>
          <div className="board-selector">
            <select
              value={activeWorkspaceId || ''}
              onChange={(e) => {
                const next = e.target.value;
                if (next === '__create_team__') {
                  setShowCreateTeamModal(true);
                  return;
                }
                lastWorkspaceSwitchRef.current = Date.now();
                setActiveWorkspaceId(next);
                setActiveDecisionSpaceId(null);
                localStorage.setItem('treeflow:workspace', next);
                if (next) {
                  if (currentPage === 'tree') {
                    window.history.pushState({}, '', `/workspaces/${encodeURIComponent(next)}/spaces/`);
                    void ensureActiveDecisionSpace(next);
                  } else {
                    window.history.pushState({}, '', `/${currentPage}`);
                  }
                }
              }}
              className="board-select"
            >
              {effectiveWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}{' '}
                  {workspace.type === 'personal'
                    ? '· Private'
                    : `· ${workspace.memberCount || 1} members`}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__create_team__">+ Create team workspace…</option>
            </select>
          </div>
        </div>
        <div className="top-bar-center">
          <div className="mode-switch" role="group" aria-label="Mode">
            <button
              className={`mode-switch-btn ${isWorkMode ? 'active' : ''}`}
              type="button"
              onClick={() => navigateToPage('work')}
            >
              Work
            </button>
            <button
              className={`mode-switch-btn ${!isWorkMode ? 'active' : ''}`}
              type="button"
              onClick={() => navigateToPage(lastStructurePage || 'tree')}
            >
              Structure
            </button>
          </div>
        </div>
        <div className="top-bar-right">
          {activeWorkspace?.type === 'team' && (
            <button className="top-button" type="button" onClick={() => setShowMembersModal(true)}>
              Members
            </button>
          )}
          {isWorkMode ? (
            <div className="work-scope-hint">All decision spaces</div>
          ) : (
            <>
              <div className="board-selector">
                <select
                  value={activeDecisionSpaceId || ''}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    if (nextId === '__create_space__') {
                      setShowCreateDecisionSpaceModal(true);
                      return;
                    }
                    setActiveDecisionSpaceId(nextId);
                    setLastSpaceForWorkspace(activeWorkspaceId, nextId);
                    if (activeWorkspaceId && nextId && currentPage === 'tree') {
                      window.history.pushState(
                        {},
                        '',
                        `/workspaces/${encodeURIComponent(activeWorkspaceId)}/spaces/${encodeURIComponent(nextId)}`
                      );
                    }
                  }}
                  className="board-select"
                >
                  {decisionSpaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="__create_space__">+ New Decision Space…</option>
                </select>
              </div>
              <div className="structure-nav" role="group" aria-label="Structure view">
                <button
                  className={`structure-nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
                  type="button"
                  onClick={() => navigateToPage('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`structure-nav-btn ${
                    currentPage === 'tree' && viewMode === 'tree' ? 'active' : ''
                  }`}
                  type="button"
                  onClick={() => {
                    navigateToPage('tree');
                    setViewMode('tree');
                  }}
                >
                  Tree
                </button>
                <button
                  className={`structure-nav-btn ${
                    currentPage === 'tree' && viewMode === 'list' ? 'active' : ''
                  }`}
                  type="button"
                  onClick={() => {
                    navigateToPage('tree');
                    setViewMode('list');
                  }}
                >
                  List
                </button>
              </div>
            </>
          )}
          <input
            className="command-input top-bar-command"
            placeholder="⌘K Search or command"
            aria-label="Command palette"
            ref={commandInputRef}
          />
          <AddOutcomeButton
            onCreate={() => handleBoardUpdate('add-outcome')}
            label="Outcome"
            disabled={!activeDecisionSpaceId}
          />
          <button className="top-button" type="button">Filters</button>
          <button className="top-button" type="button">Share</button>
          <button onClick={() => setShowProfile(true)} className="top-button">
            {user?.name || user?.email || user?.profile?.name || 'User'}
          </button>
          <button onClick={handleLogout} className="top-button ghost">Logout</button>
        </div>
      </header>
      {showProfile && (
        <UserProfile
          user={user}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}
      <main className="app-main">
        {currentPage === 'work' && (
          <WorkView workspaceId={resolvedWorkspaceId} onOpenNode={openNode} />
        )}
        {currentPage === 'dashboard' && (
          <DashboardView
            workspaceId={resolvedWorkspaceId}
            onOpenOpportunity={(key) => openNode(key)}
          />
        )}
        {currentPage === 'tree' && (
          <TreeView 
            outcomes={outcomesForDecisionSpace}
            outcomesCount={outcomesForDecisionSpace.length}
            workspaceName={activeWorkspace?.name}
            decisionSpaceName={activeDecisionSpace?.name}
            users={users}
            onUpdate={handleBoardUpdate}
            onAddOutcome={() => handleBoardUpdate('add-outcome')}
          />
        )}
      </main>
      {selectedKey && <div className="canvas-scrim" onClick={() => setSelectedKey(null)} />}
      <SidePanel outcomes={outcomesForDecisionSpace || []} users={users} onUpdate={handleBoardUpdate} />
      <CommandPalette
        isOpen={isCommandOpen}
        nodes={paletteNodes}
        onClose={() => setIsCommandOpen(false)}
        onSelect={(key) => {
          setIsCommandOpen(false);
          openNode(key);
        }}
      />
      {showMembersModal && activeWorkspace && (
          <WorkspaceMembersModal
            workspace={{ ...activeWorkspace, isOwner: activeWorkspace.owner_id === user?.id }}
            currentUserId={user?.id}
            onClose={() => setShowMembersModal(false)}
          />
      )}
      {showCreateTeamModal && (
        <CreateTeamWorkspaceModal
          onClose={() => setShowCreateTeamModal(false)}
          ownerEmail={user?.email}
          onCreated={(workspace) => {
            setShowCreateTeamModal(false);
            setWorkspaces((prev) => {
              const exists = prev.some((item) => item.id === workspace.id);
              return exists ? prev : [...prev, workspace];
            });
            setActiveWorkspaceId(workspace.id);
            setActiveDecisionSpaceId(null);
            window.history.pushState(
              {},
              '',
              `/workspaces/${encodeURIComponent(workspace.id)}/spaces/`
            );
          }}
        />
      )}
      {showCreateDecisionSpaceModal && activeWorkspaceId && (
        <CreateDecisionSpaceModal
          onClose={() => setShowCreateDecisionSpaceModal(false)}
          onCreated={(space) => {
            setShowCreateDecisionSpaceModal(false);
            setDecisionSpaces((prev) => [...prev, space]);
            setActiveDecisionSpaceId(space.id);
            window.history.pushState(
              {},
              '',
              `/workspaces/${encodeURIComponent(activeWorkspaceId)}/spaces/${encodeURIComponent(space.id)}`
            );
          }}
          workspaceId={resolveWorkspaceId(activeWorkspaceId)}
        />
      )}
    </div>
  );
}

export default App;

