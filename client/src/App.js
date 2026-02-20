import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import TreeView from './components/TreeView';
import AddOutcomeButton from './components/AddOutcomeButton';
import OnboardingFlow, { getOnboardingCompleted, setOnboardingCompleted, shouldShowOnboarding } from './components/OnboardingFlow';
import FeedbackWidget from './components/FeedbackWidget';
import CookieBanner from './components/CookieBanner';
import BetaWelcomePopup from './components/BetaWelcomePopup';
import SetPasswordForm from './components/SetPasswordForm';
import WorkspaceMembersModal from './components/WorkspaceMembersModal';
import CreateTeamWorkspaceModal from './components/CreateTeamWorkspaceModal';
import CreateDecisionSpaceModal from './components/CreateDecisionSpaceModal';
import TeamDrawer from './components/TeamDrawer';
import TodoSidebar from './components/Todos/TodoSidebar';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import SidePanel from './components/SidePanel';
import CommandPalette from './components/CommandPalette';
import { AvatarGroup } from './components/Avatar';
import { FaCheckCircle } from 'react-icons/fa';
import api from './services/supabaseApi';
import { supabase } from './services/supabase';
import { DEFAULT_TITLES, getNodeKey, parseNodeKey } from './lib/ostTypes';
import { UNASSIGNED_STAGE_ID } from './lib/journeyStages';
import { buildOstForest, findNodeByKey } from './lib/ostTree';
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
  const [workspaceLoadKey, setWorkspaceLoadKey] = useState(0);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateDecisionSpaceModal, setShowCreateDecisionSpaceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState('tree');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showTeamDrawer, setShowTeamDrawer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [isSettingUpWorkspace, setIsSettingUpWorkspace] = useState(false);
  const [isCreatingOutcome, setIsCreatingOutcome] = useState(false);
  const [isRecovery, setIsRecovery] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      if (window.location.hash.includes('type=recovery')) return true;
      return new URLSearchParams(window.location.search).get('type') === 'recovery';
    } catch {
      return false;
    }
  });
  const addOutcomeButtonRef = useRef(null);
  const [isTodoOpen, setIsTodoOpen] = useState(() => {
    try {
      return localStorage.getItem('treeflow:todoOpen') === 'true';
    } catch (error) {
      return false;
    }
  });
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [lastActiveByUser, setLastActiveByUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('treeflow:lastActiveByUser') || '{}');
    } catch (error) {
      return {};
    }
  });
  const [lastNodeByUser, setLastNodeByUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('treeflow:lastNodeByUser') || '{}');
    } catch (error) {
      return {};
    }
  });
  const commandInputRef = useRef(null);
  const lastWorkspaceSwitchRef = useRef(0);
  const activityThrottleRef = useRef(0);
  const isCreatingWorkspaceRef = useRef(false);
  const hasRetriedWorkspaceLoadRef = useRef(false);
  const skipNextWorkspaceSyncRef = useRef(false);
  const activeWorkspaceIdRef = useRef(null);
  const activeDecisionSpaceIdRef = useRef(null);
  const {
    state: { viewMode, treeStructure, selectedKey, renamingKey, nodeOverrides, todosById },
    actions: {
      setViewMode,
      setTreeStructure,
      setNodeOverride,
      setSelectedKey,
      setRenamingKey,
      setFocusKey,
      setTodos,
      upsertTodo
    }
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
  const isCanvasView = currentPage === 'tree' && viewMode === 'tree';
  const isScrollPage = false;
  const activeUserIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      Object.entries(lastActiveByUser)
        .filter(([, ts]) => now - Number(ts) < 5 * 60 * 1000)
        .map(([id]) => id)
    );
  }, [lastActiveByUser]);
  const workspaceRoleLabel = useMemo(() => {
    if (!user?.id) return 'Member';
    if (activeWorkspace?.owner_id === user.id) return 'Owner';
    const member = workspaceMembers.find((item) => item.user_id === user.id);
    if (member?.role === 'owner') return 'Owner';
    if (member?.role === 'viewer') return 'Viewer';
    return 'Editor';
  }, [activeWorkspace?.owner_id, user?.id, workspaceMembers]);
  const workspaceTodos = useMemo(() => Object.values(todosById || {}), [todosById]);
  const openTodoCount = useMemo(
    () => workspaceTodos.filter((todo) => !todo.is_done).length,
    [workspaceTodos]
  );

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

  useEffect(() => {
    if (!user || currentPage !== 'tree') return;
    if (shouldShowOnboarding(outcomesForDecisionSpace)) setShowOnboarding(true);
  }, [user, currentPage, outcomesForDecisionSpace]);

  const nodeTitleMap = useMemo(() => {
    const forest = buildOstForest(outcomesForDecisionSpace || [], nodeOverrides || {}, { treeStructure });
    const map = {};
    Object.values(forest.nodesByKey || {}).forEach((node) => {
      map[node.key] = node.title;
    });
    return map;
  }, [outcomesForDecisionSpace, nodeOverrides, treeStructure]);
  const testMetaById = useMemo(() => {
    const forest = buildOstForest(outcomesForWorkspace || [], nodeOverrides || {}, { treeStructure });
    const map = {};
    const userById = {};
    users.forEach((item) => {
      userById[item.id] = item;
    });
    Object.values(forest.nodesByKey || {}).forEach((node) => {
      if (node.type !== 'test') return;
      const solution = forest.nodesByKey[node.parentKey];
      const opportunity = solution ? forest.nodesByKey[solution.parentKey] : null;
      const outcome = opportunity ? forest.nodesByKey[opportunity.parentKey] : null;
      const breadcrumb = [solution?.title, opportunity?.title, outcome?.title].filter(Boolean).join(' → ');
      map[node.id] = {
        id: node.id,
        title: node.title,
        description: node.description,
        testType: node.testType || node.type,
        breadcrumb,
        ownerId: node.owner || null,
        ownerUser: node.owner ? userById[node.owner] : null
      };
    });
    return map;
  }, [outcomesForWorkspace, nodeOverrides, users, treeStructure]);

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

  const handleToggleWorkspaceTodo = async (todo) => {
    const previous = todosById?.[todo.id];
    const optimistic = {
      ...(previous || todo),
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
      console.warn('Failed to toggle todo', error);
      if (previous) {
        upsertTodo(previous);
      }
    }
  };

  const handleAssignTestOwner = async (testId, ownerId) => {
    try {
      await api.updateTest(testId, { owner: ownerId || null });
      await loadData(true);
      await loadWorkspaceTodos();
    } catch (error) {
      console.warn('Failed to assign owner', error);
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
    if (path.startsWith('/work')) {
      window.history.replaceState({}, '', '/tree');
      return 'tree';
    }
    if (path.startsWith('/dashboard')) {
      window.history.replaceState({}, '', '/tree');
      return 'tree';
    }
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

  activeWorkspaceIdRef.current = activeWorkspaceId;
  activeDecisionSpaceIdRef.current = activeDecisionSpaceId;

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
    let spaces = await api.listDecisionSpaces(resolvedWorkspaceId);
    if (!spaces || spaces.length === 0) {
      try {
        await api.createDecisionSpace(resolvedWorkspaceId, { name: 'Default' });
        spaces = await api.listDecisionSpaces(resolvedWorkspaceId);
      } catch (err) {
        console.warn('Could not create default decision space:', err);
      }
    }
    // Don't overwrite with empty if we already have a selection for this workspace (e.g. set from RPC); avoids flicker when a slow fetch completes after setup
    if (!spaces || spaces.length === 0) {
      if (
        activeWorkspaceIdRef.current === resolvedWorkspaceId &&
        activeDecisionSpaceIdRef.current
      ) {
        return activeDecisionSpaceIdRef.current;
      }
      setDecisionSpaces([]);
      setActiveDecisionSpaceId(null);
      window.history.replaceState(
        {},
        '',
        `/workspaces/${encodeURIComponent(resolvedWorkspaceId)}/spaces/`
      );
      return null;
    }
    setDecisionSpaces(spaces);
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

  // Single workspace load + create-default flow: list workspaces; if empty, call RPC once (guarded), then list again; one retry if still empty.
  useEffect(() => {
    if (!user) return;
    if (isCreatingWorkspaceRef.current) return;

    const loadWorkspaces = async () => {
      try {
        let data = await api.listWorkspaces();
        if (data?.length > 0) {
          setWorkspaces(data);
          return;
        }

        setIsSettingUpWorkspace(true);
        isCreatingWorkspaceRef.current = true;
        let rpcResult = null;
        try {
          rpcResult = await api.createMyDefaultWorkspace();
        } catch (createErr) {
          console.warn('createMyDefaultWorkspace failed:', createErr);
          if (!hasRetriedWorkspaceLoadRef.current) {
            hasRetriedWorkspaceLoadRef.current = true;
            setTimeout(() => setWorkspaceLoadKey((k) => k + 1), 2500);
          }
          return;
        } finally {
          isCreatingWorkspaceRef.current = false;
        }

        data = await api.listWorkspaces();
        if (!data?.length) return;

        setWorkspaces(data);
        const firstId = data[0].id;
        setActiveWorkspaceId(firstId);
        localStorage.setItem('treeflow:workspace', firstId);

        if (rpcResult?.workspace_id && rpcResult?.decision_space_id) {
          setDecisionSpaces([{
            id: rpcResult.decision_space_id,
            workspace_id: rpcResult.workspace_id,
            name: 'Default',
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          setActiveDecisionSpaceId(rpcResult.decision_space_id);
          setLastSpaceForWorkspace(firstId, rpcResult.decision_space_id);
          window.history.replaceState(
            {},
            '',
            `/workspaces/${encodeURIComponent(firstId)}/spaces/${encodeURIComponent(rpcResult.decision_space_id)}`
          );
          skipNextWorkspaceSyncRef.current = true;
          setTimeout(() => { skipNextWorkspaceSyncRef.current = false; }, 0);
        } else {
          const spaces = await api.listDecisionSpaces(firstId);
          if (spaces?.length) {
            const defaultSpaceId = spaces[0].id;
            setDecisionSpaces(spaces);
            setActiveDecisionSpaceId(defaultSpaceId);
            setLastSpaceForWorkspace(firstId, defaultSpaceId);
            window.history.replaceState(
              {},
              '',
              `/workspaces/${encodeURIComponent(firstId)}/spaces/${encodeURIComponent(defaultSpaceId)}`
            );
            skipNextWorkspaceSyncRef.current = true;
            setTimeout(() => { skipNextWorkspaceSyncRef.current = false; }, 0);
          }
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
        if (!hasRetriedWorkspaceLoadRef.current) {
          hasRetriedWorkspaceLoadRef.current = true;
          setTimeout(() => setWorkspaceLoadKey((k) => k + 1), 2500);
        }
      } finally {
        setIsSettingUpWorkspace(false);
        isCreatingWorkspaceRef.current = false;
      }
    };

    void loadWorkspaces();
  }, [user, workspaceLoadKey]);

  useEffect(() => {
    if (authInitializing || !user) return;
    if (skipNextWorkspaceSyncRef.current) return;
    const route = parseRoute();
    const firstReal = effectiveWorkspaces[0] && !isLegacyWorkspaceId(effectiveWorkspaces[0].id)
      ? effectiveWorkspaces[0].id
      : null;
    const storedWorkspace = localStorage.getItem('treeflow:workspace');
    const rawWorkspace =
      route?.workspaceId || firstReal || storedWorkspace || effectiveWorkspaces[0]?.id || null;
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
  }, [authInitializing, user, effectiveWorkspaces, activeWorkspaceId, activeDecisionSpaceId]);

  useEffect(() => {
    if (authInitializing || !user || !activeWorkspaceId || isLegacyWorkspaceId(activeWorkspaceId)) return;
    const route = parseRoute();
    if (route?.workspaceId !== activeWorkspaceId) return;
    if (!route?.spaceId && !activeDecisionSpaceId) {
      void ensureActiveDecisionSpace(activeWorkspaceId);
    }
  }, [authInitializing, user, activeWorkspaceId, activeDecisionSpaceId]);

  const loadWorkspaceTodos = async () => {
    if (!resolvedWorkspaceId) {
      setTodos([]);
      return;
    }
    try {
      const list = await api.listWorkspaceTodos(resolvedWorkspaceId);
      setTodos(list || []);
    } catch (error) {
      console.warn('Failed to load todos', error);
    }
  };

  useEffect(() => {
    if (user) {
      void loadWorkspaceTodos();
    }
  }, [resolvedWorkspaceId, user]);

  useEffect(() => {
    localStorage.setItem('treeflow:todoOpen', String(isTodoOpen));
  }, [isTodoOpen]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!resolvedWorkspaceId || isLegacyWorkspaceId(resolvedWorkspaceId)) {
        setWorkspaceMembers([]);
        return;
      }
      try {
        const members = await api.listWorkspaceMembers(resolvedWorkspaceId);
        setWorkspaceMembers(members || []);
      } catch (error) {
        console.warn('Failed to load workspace members', error);
      }
    };
    if (user) {
      void loadMembers();
    }
  }, [resolvedWorkspaceId, user]);

  useEffect(() => {
    if (!user?.id) return;
    const updateActivity = () => {
      const now = Date.now();
      if (now - activityThrottleRef.current < 30000) return;
      activityThrottleRef.current = now;
      setLastActiveByUser((prev) => {
        const next = { ...prev, [user.id]: now };
        localStorage.setItem('treeflow:lastActiveByUser', JSON.stringify(next));
        return next;
      });
    };
    const handleActivity = () => updateActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    updateActivity();
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !selectedKey) return;
    const label = nodeTitleMap[selectedKey] || selectedKey;
    setLastNodeByUser((prev) => {
      const next = { ...prev, [user.id]: label };
      localStorage.setItem('treeflow:lastNodeByUser', JSON.stringify(next));
      return next;
    });
  }, [selectedKey, nodeTitleMap, user?.id]);

  const highlightTodoIds = useMemo(() => {
    if (currentPage !== 'tree') return new Set();
    const forest = buildOstForest(outcomesForDecisionSpace || [], nodeOverrides || {}, { treeStructure });
    const testIds = new Set();
    Object.values(forest.nodesByKey || {}).forEach((node) => {
      if (node.type === 'test' && node.id) {
        testIds.add(node.id);
      }
    });
    return testIds;
  }, [currentPage, outcomesForDecisionSpace, nodeOverrides, treeStructure]);

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
    if (skipNextWorkspaceSyncRef.current) return;
    // Don't refetch when we already have a valid selection for this workspace (avoids overwriting after setup)
    const hasSpacesForWorkspace = decisionSpaces.length > 0 && decisionSpaces.some(
      (s) => s.workspace_id === activeWorkspaceId
    );
    if (activeDecisionSpaceId && hasSpacesForWorkspace) return;
    void ensureActiveDecisionSpace(activeWorkspaceId);
  }, [activeWorkspaceId, activeDecisionSpaceId, decisionSpaces]);

  useEffect(() => {
    const boardId = activeWorkspaceId || 'default';
    const storedView = localStorage.getItem(`treeflow:view:${boardId}`);
    const storedStructure = localStorage.getItem(`treeflow:structure:${boardId}`);
    const urlView = getViewFromUrl();
    setViewMode(urlView || storedView || 'tree');
    if (storedStructure === 'journey' || storedStructure === 'classic') {
      setTreeStructure(storedStructure);
    }
  }, [activeWorkspaceId, setViewMode, setTreeStructure]);

  useEffect(() => {
    const boardId = activeWorkspaceId || 'default';
    if (viewMode) {
      localStorage.setItem(`treeflow:view:${boardId}`, viewMode);
    }
  }, [viewMode, activeWorkspaceId]);

  useEffect(() => {
    const boardId = activeWorkspaceId || 'default';
    if (treeStructure) {
      localStorage.setItem(`treeflow:structure:${boardId}`, treeStructure);
    }
  }, [treeStructure, activeWorkspaceId]);

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
        return true;
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
        const parsed = parseNodeKey(nodeKey);
        if (!parsed) return;
        const { type, id } = parsed;
        const sanitized = Object.entries(changes).reduce((acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        }, {});
        const patchSolutions = (solutions) =>
          (solutions || []).map((sol) => {
            if (type === 'solution' && sol.id === id) {
              return { ...sol, ...sanitized };
            }
            return {
              ...sol,
              tests: (sol.tests || []).map((test) =>
                type === 'test' && test.id === id ? { ...test, ...sanitized } : test
              ),
              subSolutions: patchSolutions(sol.subSolutions)
            };
          });
        const patchOpportunities = (opportunities) =>
          (opportunities || []).map((opp) => {
            if (type === 'opportunity' && opp.id === id) {
              return { ...opp, ...sanitized };
            }
            return {
              ...opp,
              solutions: patchSolutions(opp.solutions),
              subOpportunities: patchOpportunities(opp.subOpportunities)
            };
          });
        setOutcomes((prev) => {
          if (type === 'outcome') {
            return (prev || []).map((outcome) =>
              outcome.id === id ? { ...outcome, ...sanitized } : outcome
            );
          }
          return (prev || []).map((outcome) => ({
            ...outcome,
            opportunities: patchOpportunities(outcome.opportunities || [])
          }));
        });
      };
      if (action === 'patch-node') {
        shouldRefresh = false;
        const { nodeKey, changes } = payload || {};
        applyNodePatch(nodeKey, changes);
        if (nodeKey && nodeKey === renamingKey) {
          setRenamingKey(null);
        }
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
        setIsCreatingOutcome(true);
        try {
          const decisionSpaceIdForWrite = workspaceIdForWrite ? activeDecisionSpaceId : null;
          const initialTitle = payload?.initialTitle ?? DEFAULT_TITLES.outcome;
          const created = await api.createOutcome({
            title: initialTitle,
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
            const prev = dataCache.current.outcomes || [];
            const next = [createdOutcome, ...prev.filter((item) => item.id !== createdOutcome.id)];
            dataCache.current.outcomes = next;
            dataCache.current.cacheTime = Date.now();
            setOutcomes(next);
          }
          if (created?.id) {
            const key = getNodeKey('outcome', created.id);
            setSelectedKey(key);
          }
          shouldRefresh = false;
        } finally {
          setIsCreatingOutcome(false);
        }
      }

      if (action === 'add-child') {
        const parsed = parseNodeKey(payload.parentKey);
        if (!parsed) return;
        const { type, id } = parsed;
        const opportunityTitle = payload?.initialTitle ?? DEFAULT_TITLES.opportunity;
        const solutionTitle = payload?.initialTitle ?? DEFAULT_TITLES.solution;
        const testTitle = payload?.initialTitle ?? DEFAULT_TITLES.test;
        if (payload.childType === 'opportunity' && type === 'outcome') {
          const rawStage = payload.journeyStage ?? null;
          const journeyStageForDb = (rawStage && rawStage !== UNASSIGNED_STAGE_ID) ? rawStage : null;
          const created = await api.createOpportunity(id, {
            title: opportunityTitle,
            workspaceId: workspaceIdForWrite,
            journeyStage: journeyStageForDb
          });
          if (created?.id) setSelectedKey(getNodeKey('opportunity', created.id));
        }
        if (payload.childType === 'opportunity' && type === 'journey') {
          const parts = (id || '').split(':');
          const outcomeId = parts[0];
          const stageId = parts[1] || null;
          if (!outcomeId) return;
          const journeyStageForDb = (stageId && stageId !== UNASSIGNED_STAGE_ID) ? stageId : null;
          const created = await api.createOpportunity(outcomeId, {
            title: opportunityTitle,
            workspaceId: workspaceIdForWrite,
            journeyStage: journeyStageForDb
          });
          if (created?.id) setSelectedKey(getNodeKey('opportunity', created.id));
        }
        if (payload.childType === 'opportunity' && type === 'opportunity') {
          const lookup = findNodeByKey(outcomesForDecisionSpace || [], payload.parentKey);
          const outcomeId = lookup?.root?.id;
          if (!outcomeId) return;
          const created = await api.createOpportunity(outcomeId, {
            title: opportunityTitle,
            workspaceId: workspaceIdForWrite,
            parentOpportunityId: id
          });
          if (created?.id) setSelectedKey(getNodeKey('opportunity', created.id));
        }
        if (payload.childType === 'solution' && type === 'opportunity') {
          const created = await api.createSolution(id, {
            title: solutionTitle,
            workspaceId: workspaceIdForWrite
          });
          if (created?.id) setSelectedKey(getNodeKey('solution', created.id));
        }
        if (payload.childType === 'solution' && type === 'solution') {
          const lookup = findNodeByKey(outcomesForDecisionSpace || [], payload.parentKey);
          const opportunityId = lookup?.opportunity?.id;
          if (!opportunityId) return;
          const created = await api.createSolution(opportunityId, {
            title: solutionTitle,
            workspaceId: workspaceIdForWrite,
            parentSolutionId: id
          });
          if (created?.id) setSelectedKey(getNodeKey('solution', created.id));
        }
        if (payload.childType === 'test' && type === 'solution') {
          const created = await api.createTest(id, {
            title: testTitle,
            description: '',
            testTemplate: null,
            testType: 'custom',
            testStatus: 'draft',
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

      if (action === 'set-confidence') {
        shouldRefresh = false;
        const parsed = parseNodeKey(payload.nodeKey);
        if (!parsed) return;
        const score = payload.score != null ? Math.min(100, Math.max(0, Number(payload.score))) : null;
        setNodeOverride(payload.nodeKey, { confidenceScore: score });
        if (parsed.type === 'opportunity') {
          await api.updateOpportunity(parsed.id, { confidenceScore: score });
        }
        if (parsed.type === 'solution') {
          await api.updateSolution(parsed.id, { confidenceScore: score });
        }
      }

      if (action === 'promote-sub-solution') {
        const parsed = parseNodeKey(payload.nodeKey);
        if (!parsed || parsed.type !== 'solution') return;
        await api.updateSolution(parsed.id, { parentSolutionId: null });
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
      setIsCreatingOutcome(false);
      alert(error.message || 'Failed to update board');
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const navigateToPage = (page) => {
    if (page === 'work') {
      setCurrentPage('tree');
      window.history.pushState({}, '', '/tree');
      return;
    }
    setCurrentPage(page);
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
    const forest = buildOstForest(outcomesForDecisionSpace || [], nodeOverrides || {}, { treeStructure });
    return Object.values(forest.nodesByKey || {});
  }, [outcomesForDecisionSpace, nodeOverrides, treeStructure]);

  if (!authInitializing && user && isRecovery) {
    return <SetPasswordForm onDone={() => setIsRecovery(false)} />;
  }

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

  if (isSettingUpWorkspace) {
    return (
      <div className="app app-setting-up">
        <div className="setting-up-card">
          <div className="setting-up-spinner" aria-hidden="true" />
          <p className="setting-up-title">We&apos;re setting things up for you</p>
          <p className="setting-up-subtitle">Creating your workspace and decision space…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${isTodoOpen ? 'todo-open' : ''}`}>
      <header className="top-bar top-bar-overlay">
        <div className="top-bar-left">
          <div className="app-title">TreeFlow</div>
          <div className="board-selector workspace-select">
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
          <button
            type="button"
            className="workspace-team-trigger"
            onClick={() => setShowTeamDrawer((prev) => !prev)}
            aria-label="Open team drawer"
          >
            Team
          </button>
          {currentPage === 'tree' && (
            <div className="board-selector decision-space-select">
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
          )}
        </div>
        <div className="top-bar-center">
          <div className="top-bar-nav" role="group" aria-label="Views">
            <button
              className={`top-bar-nav-btn ${
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
              className={`top-bar-nav-btn ${
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
          <select
            className="top-bar-nav-select"
            value={viewMode}
            onChange={(e) => {
              const next = e.target.value;
              if (next === 'tree' || next === 'list') {
                navigateToPage('tree');
                setViewMode(next);
              }
            }}
            aria-label="Select view"
          >
            <option value="tree">Tree</option>
            <option value="list">List</option>
          </select>
        </div>
        <div className="top-bar-right">
          {activeWorkspace?.type === 'team' && (
            <button className="top-button" type="button" onClick={() => setShowMembersModal(true)}>
              Members
            </button>
          )}
          {workspaceMembers.length > 0 && (
            <button
              type="button"
              className="team-avatar-trigger"
              onClick={() => setShowTeamDrawer((prev) => !prev)}
              aria-label="Open team drawer"
            >
              <AvatarGroup
                users={workspaceMembers.map((member) => member.profile).filter(Boolean)}
                size={22}
                max={3}
                showPresence
                activeIds={activeUserIds}
                ownerId={workspaceMembers.find((member) => member.role === 'owner')?.user_id || null}
              />
            </button>
          )}
          <input
            className="command-input top-bar-command"
            placeholder="⌘K Search or command"
            aria-label="Command palette"
            ref={commandInputRef}
          />
          <AddOutcomeButton
            ref={addOutcomeButtonRef}
            onCreate={() => handleBoardUpdate('add-outcome')}
            label="Outcome"
            disabled={!workspaceIdForWrite}
            creating={isCreatingOutcome}
          />
          <button className="top-button" type="button">Filters</button>
          <div className="help-menu-wrap">
            <button
              type="button"
              className="top-button"
              onClick={() => setShowHelpMenu((v) => !v)}
              aria-expanded={showHelpMenu}
              aria-haspopup="true"
            >
              Help
            </button>
            {showHelpMenu && (
              <>
                <div className="help-menu-backdrop" onClick={() => setShowHelpMenu(false)} aria-hidden="true" />
                <div className="help-menu-dropdown">
                  <button
                    type="button"
                    className="help-menu-item"
                    onClick={() => {
                      setOnboardingCompleted(false);
                      setShowOnboarding(true);
                      setShowHelpMenu(false);
                    }}
                  >
                    Restart Tutorial
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => setShowProfile(true)} className="top-button">
            {user?.name || user?.email || user?.profile?.name || 'User'}
          </button>
          <button onClick={handleLogout} className="top-button ghost">Logout</button>
        </div>
      </header>
      {showProfile && (
        <UserProfile
          user={user}
          workspace={activeWorkspace}
          workspaceRole={workspaceRoleLabel}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}
      <main className={`app-main ${isScrollPage ? 'app-main-scroll' : ''}`}>
        {currentPage === 'tree' && (
          <TreeView
            outcomes={outcomesForDecisionSpace}
            outcomesCount={outcomesForDecisionSpace.length}
            workspaceName={activeWorkspace?.name}
            decisionSpaceName={activeDecisionSpace?.name}
            users={users}
            onUpdate={handleBoardUpdate}
            onAddOutcome={() => handleBoardUpdate('add-outcome')}
            isCreatingOutcome={isCreatingOutcome}
          />
        )}
      </main>
      <TodoSidebar
        isOpen={isTodoOpen}
        todos={workspaceTodos}
        users={users}
        testMetaById={testMetaById}
        highlightedIds={highlightTodoIds}
        onOpenTest={(testId) => {
          if (testId) {
            openNode(`test:${testId}`);
          }
        }}
        onToggleTodo={handleToggleWorkspaceTodo}
        onAssignOwner={handleAssignTestOwner}
        onClose={() => setIsTodoOpen(false)}
      />
      {!isTodoOpen && (
        <button
          type="button"
          className="todo-pill"
          onClick={() => setIsTodoOpen(true)}
          aria-label="Open todos"
        >
          <FaCheckCircle />
          <span>Todos</span>
          <span className="todo-pill-count">{openTodoCount}</span>
        </button>
      )}
      {isCanvasView && selectedKey && (
        <div className="canvas-scrim" onClick={() => setSelectedKey(null)} />
      )}
      <SidePanel
        outcomes={outcomesForDecisionSpace || []}
        users={users}
        onUpdate={handleBoardUpdate}
        isDrawer={isCanvasView}
        treeStructure={treeStructure}
      />
      <TeamDrawer
        isOpen={showTeamDrawer}
        onClose={() => setShowTeamDrawer(false)}
        workspace={activeWorkspace}
        members={workspaceMembers}
        currentUserId={user?.id}
        activeMap={lastNodeByUser}
        activeIds={activeUserIds}
      />
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
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        outcomes={outcomesForDecisionSpace}
        treeStructure={treeStructure}
        onCreateOutcome={(title) => handleBoardUpdate('add-outcome', { initialTitle: title })}
        onUpdate={handleBoardUpdate}
        addOutcomeButtonRef={addOutcomeButtonRef}
      />
      {user && (
        <FeedbackWidget
          context={{
            workspaceName: activeWorkspace?.name,
            decisionSpaceName: activeDecisionSpace?.name,
            url: typeof window !== 'undefined' ? window.location.href : '',
            mode: treeStructure === 'journey' ? 'Journey' : 'Classic',
            selectedNodeId: selectedKey || undefined
          }}
          onSendFeedback={api.sendFeedback}
        />
      )}
      <CookieBanner />
      <BetaWelcomePopup user={user} hideWhenOnboardingOpen={showOnboarding} />
    </div>
  );
}

export default App;

