import { supabase, getCurrentUserWithProfile, isAdmin, getUserTeamRole } from './supabase';

/** Build nested opportunity tree from flat list (by parent_opportunity_id). Sorts by sort_index. */
function nestOpportunities(flatOpps) {
  if (!flatOpps || flatOpps.length === 0) return [];
  const byId = new Map();
  flatOpps.forEach((opp) => {
    byId.set(opp.id, { ...opp, subOpportunities: [] });
  });
  const roots = [];
  flatOpps.forEach((opp) => {
    const node = byId.get(opp.id);
    const parentId = opp.parent_opportunity_id ?? opp.parentOpportunityId;
    if (!parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId);
      if (parent) parent.subOpportunities.push(node);
      else roots.push(node);
    }
  });
  const sortByIndex = (a, b) => (a.sort_index ?? a.sortIndex ?? 0) - (b.sort_index ?? b.sortIndex ?? 0);
  roots.sort(sortByIndex);
  roots.forEach((r) => r.subOpportunities.sort(sortByIndex));
  return roots;
}

/** Build nested solution tree from flat list (by parent_solution_id). Sorts by sort_index. */
function nestSolutions(flatSols) {
  if (!flatSols || flatSols.length === 0) return [];
  const byId = new Map();
  flatSols.forEach((sol) => {
    byId.set(sol.id, { ...sol, subSolutions: [] });
  });
  const roots = [];
  flatSols.forEach((sol) => {
    const node = byId.get(sol.id);
    const parentId = sol.parent_solution_id ?? sol.parentSolutionId;
    if (!parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId);
      if (parent) parent.subSolutions.push(node);
      else roots.push(node);
    }
  });
  const sortByIndex = (a, b) => (a.sort_index ?? a.sortIndex ?? 0) - (b.sort_index ?? b.sortIndex ?? 0);
  roots.sort(sortByIndex);
  roots.forEach((r) => r.subSolutions.sort(sortByIndex));
  return roots;
}

const DEBUG_AUTH = false;
let getCurrentUserPromise = null;

// Helper to handle Supabase errors
function handleError(error, defaultMessage = 'An error occurred') {
  console.error('Supabase error:', error);
  throw new Error(error.message || defaultMessage);
}

// Helper to get current user ID
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export default {
  nestSolutions,

  // Experiment todos
  listExperimentTodos: async (experimentId) => {
    const { data, error } = await supabase
      .from('experiment_todos')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) handleError(error, 'Failed to fetch todos');
    return data || [];
  },

  createExperimentTodo: async (experimentId, title, options = {}) => {
    const payload = {
      experiment_id: experimentId,
      title,
      sort_order: options.sortOrder ?? 0,
      due_date: options.dueDate ?? null
    };
    const { data, error } = await supabase
      .from('experiment_todos')
      .insert(payload)
      .select()
      .single();
    if (error) handleError(error, 'Failed to create todo');
    return data;
  },

  toggleExperimentTodo: async (todoId, isDone) => {
    const { data, error } = await supabase
      .from('experiment_todos')
      .update({ is_done: isDone })
      .eq('id', todoId)
      .select()
      .single();
    if (error) handleError(error, 'Failed to update todo');
    return data;
  },

  updateExperimentTodo: async (todoId, updates) => {
    const payload = {
      title: updates.title,
      due_date: updates.dueDate,
      sort_order: updates.sortOrder,
      assignee_id: updates.assigneeId
    };
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    const { data, error } = await supabase
      .from('experiment_todos')
      .update(payload)
      .eq('id', todoId)
      .select()
      .single();
    if (error) handleError(error, 'Failed to update todo');
    return data;
  },

  deleteExperimentTodo: async (todoId) => {
    const { error } = await supabase
      .from('experiment_todos')
      .delete()
      .eq('id', todoId);
    if (error) handleError(error, 'Failed to delete todo');
  },

  // Work + dashboard views
  listWorkspaceTodos: async (workspaceId) => {
    const { data, error } = await supabase
      .from('experiment_todos_with_context')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) handleError(error, 'Failed to fetch workspace todos');
    return data || [];
  },

  getDecisionHealthMetrics: async (workspaceId) => {
    const { data, error } = await supabase
      .rpc('get_decision_health_metrics', { target_workspace_id: workspaceId });
    if (error) handleError(error, 'Failed to fetch decision health metrics');
    return data?.[0] || null;
  },

  getAtRiskOpportunities: async (workspaceId) => {
    const { data, error } = await supabase
      .rpc('get_at_risk_opportunities', { target_workspace_id: workspaceId });
    if (error) handleError(error, 'Failed to fetch at-risk opportunities');
    return data || [];
  },
  // Workspaces
  listDecisionSpaces: async (workspaceId) => {
    const { data, error } = await supabase
      .from('decision_spaces')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    if (error) {
      const message = error.message || '';
      const missingTable =
        error.code === '42P01' ||
        message.includes('does not exist') ||
        message.includes('schema cache') ||
        message.includes('Could not find the table');
      if (missingTable) {
        console.warn('Decision spaces table missing; returning empty list.');
        return [];
      }
      handleError(error, 'Failed to fetch decision spaces');
    }
    return data || [];
  },

  createDecisionSpace: async (workspaceId, payload) => {
    const { data, error } = await supabase.rpc('create_decision_space', {
      p_workspace_id: workspaceId,
      p_name: payload.name ?? 'Default',
      p_description: payload.description ?? null
    });
    if (error) handleError(error, 'Failed to create decision space');
    return data;
  },
  listWorkspaces: async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) handleError(error, 'Failed to fetch workspaces');
    return data || [];
  },

  /** Creates a default personal workspace and "Default" decision space if the user has none. Call after signup or when workspace list is empty. */
  createMyDefaultWorkspace: async () => {
    const { data, error } = await supabase.rpc('create_my_default_workspace');
    if (error) {
      console.warn('create_my_default_workspace failed:', error);
      throw error;
    }
    return data;
  },

  createWorkspace: async (payload) => {
    const userId = await getCurrentUserId();
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name: payload.name,
        type: payload.type,
        owner_id: userId
      })
      .select()
      .single();
    if (error) handleError(error, 'Failed to create workspace');

    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: userId,
      email: payload.ownerEmail || null,
      role: 'owner',
      status: 'active'
    });

    return workspace;
  },

  listWorkspaceMembers: async (workspaceId) => {
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    if (error) handleError(error, 'Failed to fetch workspace members');
    if (!members?.length) return [];
    const userIds = [...new Set(members.map((m) => m.user_id).filter(Boolean))];
    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      if (profiles) {
        profiles.forEach((p) => {
          profilesById[p.id] = p;
        });
      }
    }
    return members.map((m) => ({
      ...m,
      profile: profilesById[m.user_id] || { id: m.user_id, name: null, email: m.email }
    }));
  },

  listWorkspaceInvites: async (workspaceId) => {
    const { data, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) handleError(error, 'Failed to fetch invites');
    return data || [];
  },

  addMemberByEmail: async (workspaceId, email) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error('Email required');

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalized)
      .limit(1);
    if (profileError) handleError(profileError, 'Failed to lookup user');

    const userId = profiles?.[0]?.id || null;
    const status = userId ? 'active' : 'pending';

    const { data, error } = await supabase
      .from('workspace_members')
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          email: normalized,
          role: 'member',
          status
        },
        { onConflict: 'workspace_id,email' }
      )
      .select()
      .single();
    if (error) handleError(error, 'Failed to add member');

    return { member: data, status };
  },

  removeWorkspaceMember: async (memberId) => {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);
    if (error) handleError(error, 'Failed to remove member');
  },

  claimPendingMemberships: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return [];
    const normalized = user.email.toLowerCase();
    const { data, error } = await supabase
      .from('workspace_members')
      .update({ user_id: user.id, status: 'active' })
      .eq('email', normalized)
      .eq('status', 'pending')
      .is('user_id', null)
      .select();
    if (error) handleError(error, 'Failed to claim memberships');
    return data || [];
  },

  acceptWorkspaceInvite: async (token) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: invite, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('token', token)
      .single();
    if (error || !invite) handleError(error, 'Invalid invite');
    if (invite.accepted_at) throw new Error('Invite already accepted');
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error('Invite expired');
    if (user.email?.toLowerCase() !== invite.invited_email?.toLowerCase()) {
      throw new Error('Invite email mismatch');
    }

    await supabase
      .from('workspace_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    await supabase
      .from('workspace_members')
      .update({ user_id: user.id, status: 'active' })
      .eq('workspace_id', invite.workspace_id)
      .eq('invited_email', invite.invited_email);

    return invite.workspace_id;
  },
  // Outcomes
  getOutcomes: async () => {
    try {
      const selectWithExperimentsAndSprints = `
        *,
        opportunities (
          *,
          solutions (
            *,
            experiments (
              *,
              kpis (*)
            ),
            sprints (
              id,
              title,
              status,
              start_date,
              end_date,
              tasks (
                id,
                status
              )
            )
          )
        )
      `;

      const selectWithExperimentsOnly = `
        *,
        opportunities (
          *,
          solutions (
            *,
            experiments (
              *,
              kpis (*)
            )
          )
        )
      `;

      const selectWithTestsAndSprints = `
        *,
        opportunities (
          *,
          solutions (
            *,
            tests (
              *,
              kpis (*)
            ),
            sprints (
              id,
              title,
              status,
              start_date,
              end_date,
              tasks (
                id,
                status
              )
            )
          )
        )
      `;

      const selectWithTestsOnly = `
        *,
        opportunities (
          *,
          solutions (
            *,
            tests (
              *,
              kpis (*)
            )
          )
        )
      `;

      const selectMinimal = `
        *,
        opportunities (
          *,
          solutions (*)
        )
      `;

      const attempts = [
        { name: 'experiments+sprints', select: selectWithExperimentsAndSprints },
        { name: 'experiments', select: selectWithExperimentsOnly },
        { name: 'tests+sprints', select: selectWithTestsAndSprints },
        { name: 'tests', select: selectWithTestsOnly },
        { name: 'minimal', select: selectMinimal }
      ];

      let data = null;
      let lastError = null;

      for (const attempt of attempts) {
        const result = await supabase
          .from('outcomes')
          .select(attempt.select)
          .order('created_at', { ascending: false });

        if (!result.error) {
          data = result.data;
          lastError = null;
          break;
        }

        lastError = result.error;
        const message = result.error.message || '';

        if (message.includes('Could not find a relationship') || message.includes('does not exist') || result.error.code === '42P01') {
          console.warn(`getOutcomes fallback (${attempt.name}):`, message);
          continue;
        }

        if (result.error.code === 'PGRST301' || message.includes('permission') || message.includes('policy')) {
          console.warn('RLS policy error - returning empty array');
          return [];
        }

        // Unexpected error, stop trying
        break;
      }

      if (lastError) {
        console.error('Error fetching outcomes:', lastError);
        handleError(lastError, 'Failed to fetch outcomes');
      }
      
      // Transform snake_case to camelCase, nest solutions (sub-solutions), nest opportunities (sub-opportunities)
      return (data || []).map((outcome) => {
        const flatOpps = (outcome.opportunities || []).map((opp) => {
          const flatSols = (opp.solutions || []).map((sol) => ({
            ...sol,
            parentSolutionId: sol.parent_solution_id ?? null,
            confidenceScore: sol.confidence_score ?? null,
            sortIndex: sol.sort_index ?? 0,
            startDate: sol.start_date,
            endDate: sol.end_date,
            workspaceId: sol.workspace_id,
            tests: ((sol.experiments || sol.tests) || []).map((test) => ({
              ...test,
              startDate: test.start_date,
              endDate: test.end_date,
              testTemplate: test.test_template,
              testType: test.type,
              testStatus: test.test_status,
              successCriteria: test.success_criteria,
              resultDecision: test.result_decision,
              resultSummary: test.result_summary,
              timebox: {
                start: test.timebox_start,
                end: test.timebox_end
              },
              hypothesisId: test.hypothesis_id,
              opportunityId: test.opportunity_id,
              workspaceId: test.workspace_id,
              kpis: test.kpis || []
            })),
            campaigns: (sol.sprints || sol.campaigns || []).map((sprint) => ({
              ...sprint,
              startDate: sprint.start_date,
              endDate: sprint.end_date,
              tasks: (sprint.tasks || []).map((task) => ({
                ...task,
                dueDate: task.due_date
              }))
            })) || []
          }));
          return {
            ...opp,
            parentOpportunityId: opp.parent_opportunity_id ?? null,
            journeyStage: opp.journey_stage ?? null,
            sortIndex: opp.sort_index ?? 0,
            confidenceScore: opp.confidence_score ?? null,
            startDate: opp.start_date,
            endDate: opp.end_date,
            workspaceId: opp.workspace_id,
            solutions: nestSolutions(flatSols)
          };
        });
        const nestedOpportunities = nestOpportunities(flatOpps);
        return {
          ...outcome,
          startDate: outcome.start_date,
          endDate: outcome.end_date,
          teamId: outcome.team_id,
          workspaceId: outcome.workspace_id,
          decisionSpaceId: outcome.decision_space_id,
          opportunities: nestedOpportunities
        };
      });
    } catch (error) {
      console.error('Exception in getOutcomes:', error);
      return []; // Return empty array instead of throwing
    }
  },

  createOutcome: async (data) => {
    try {
      const userId = await getCurrentUserId();
      console.log('Creating outcome with data:', { ...data, owner: data.owner || userId });
      
      const { data: outcome, error } = await supabase
        .from('outcomes')
        .insert({
          title: data.title,
          description: data.description,
          owner: data.owner || userId,
          team_id: data.teamId || null,
          workspace_id: data.workspaceId || null,
          decision_space_id: data.decisionSpaceId || null,
          visibility: data.visibility || 'team',
          start_date: data.startDate || null,
          end_date: data.endDate || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating outcome:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        handleError(error, 'Failed to create outcome');
      }
      return { 
        ...outcome, 
        opportunities: [],
        startDate: outcome.start_date,
        endDate: outcome.end_date,
        teamId: outcome.team_id,
        workspaceId: outcome.workspace_id,
        decisionSpaceId: outcome.decision_space_id
      };
    } catch (error) {
      console.error('Exception in createOutcome:', error);
      throw error;
    }
  },

  updateOutcome: async (id, data) => {
    const updateData = {
      title: data.title,
      description: data.description ?? null,
      owner: (data.owner && String(data.owner).trim()) ? data.owner : null,
      visibility: (data.visibility && String(data.visibility).trim()) ? data.visibility : undefined,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null
    };
    if (Object.prototype.hasOwnProperty.call(data, 'teamId')) {
      updateData.team_id = data.teamId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'workspaceId')) {
      updateData.workspace_id = data.workspaceId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'decisionSpaceId')) {
      updateData.decision_space_id = data.decisionSpaceId ?? null;
    }
    // Remove undefined values (outcomes table has no status column)
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const result = await supabase
      .from('outcomes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (result.error) {
      console.error('Error updating outcome:', result.error);
      console.error('Update data:', updateData);
      handleError(result.error, 'Failed to update outcome');
    }
    const outcome = result.data;
    return {
      ...outcome,
      startDate: outcome.start_date,
      endDate: outcome.end_date,
      teamId: outcome.team_id,
      workspaceId: outcome.workspace_id,
      decisionSpaceId: outcome.decision_space_id
    };
  },

  deleteOutcome: async (id) => {
    const { error } = await supabase
      .from('outcomes')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete outcome');
  },

  // Opportunities
  createOpportunity: async (outcomeId, data) => {
    try {
      const userId = await getCurrentUserId();
      console.log('Creating opportunity:', { outcomeId, data, userId });
      
      // Verify the outcome exists first
      const { data: outcomeCheck, error: outcomeError } = await supabase
        .from('outcomes')
        .select('id')
        .eq('id', outcomeId)
        .single();
      
      if (outcomeError || !outcomeCheck) {
        console.error('Outcome not found or not accessible:', outcomeError);
        throw new Error(`Outcome not found or you don't have access to it. Error: ${outcomeError?.message || 'Unknown error'}`);
      }
      
      const { data: opportunity, error } = await supabase
        .from('opportunities')
        .insert({
          title: data.title,
          description: data.description,
          outcome_id: outcomeId,
          owner: data.owner || userId,
          workspace_id: data.workspaceId || null,
          start_date: data.startDate || null,
          end_date: data.endDate || null,
          parent_opportunity_id: data.parentOpportunityId ?? null,
          journey_stage: data.journeyStage ?? null,
          sort_index: data.sortIndex ?? 0
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating opportunity:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId,
          outcomeId: outcomeId
        });
        
        // Provide more helpful error messages
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error('Permission denied: You may not have permission to create opportunities. Please check your RLS policies.');
        } else if (error.code === '23503' || error.message?.includes('foreign key')) {
          throw new Error('Invalid outcome: The outcome you are trying to add an opportunity to does not exist or is not accessible.');
        } else if (error.code === '23505' || error.message?.includes('unique')) {
          throw new Error('Duplicate entry: An opportunity with this name already exists.');
        } else {
        handleError(error, 'Failed to create opportunity');
      }
      }
      
      if (!opportunity) {
        throw new Error('Opportunity was not created, but no error was returned.');
      }
      
      return { 
        ...opportunity, 
        solutions: [],
        subOpportunities: [],
        startDate: opportunity.start_date,
        endDate: opportunity.end_date,
        workspaceId: opportunity.workspace_id,
        parentOpportunityId: opportunity.parent_opportunity_id ?? null,
        journeyStage: opportunity.journey_stage ?? null,
        sortIndex: opportunity.sort_index ?? 0,
        confidenceScore: opportunity.confidence_score ?? null
      };
    } catch (error) {
      console.error('Exception in createOpportunity:', error);
      // Re-throw with the same error message if it's already a user-friendly error
      if (error.message && (error.message.includes('Permission denied') || error.message.includes('Invalid outcome') || error.message.includes('Duplicate entry'))) {
        throw error;
      }
      throw error;
    }
  },

  updateOpportunity: async (id, data) => {
    const updateData = {
      title: data.title,
      description: data.description,
      status: data.status,
      owner: data.owner,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null
    };
    if (Object.prototype.hasOwnProperty.call(data, 'workspaceId')) {
      updateData.workspace_id = data.workspaceId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'parentOpportunityId')) {
      updateData.parent_opportunity_id = data.parentOpportunityId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'journeyStage')) {
      updateData.journey_stage = data.journeyStage ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'sortIndex')) {
      updateData.sort_index = data.sortIndex ?? 0;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'confidenceScore')) {
      updateData.confidence_score = data.confidenceScore ?? null;
    }
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    
    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update opportunity');
    return {
      ...opportunity,
      startDate: opportunity.start_date,
      endDate: opportunity.end_date,
      workspaceId: opportunity.workspace_id,
      parentOpportunityId: opportunity.parent_opportunity_id ?? null,
      journeyStage: opportunity.journey_stage ?? null,
      sortIndex: opportunity.sort_index ?? 0,
      confidenceScore: opportunity.confidence_score ?? null
    };
  },

  deleteOpportunity: async (id) => {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete opportunity');
  },

  // Solutions
  createSolution: async (opportunityId, data) => {
    const userId = await getCurrentUserId();
    const insertPayload = {
      title: data.title,
      description: data.description,
      opportunity_id: opportunityId,
      owner: data.owner || userId,
      workspace_id: data.workspaceId || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null
    };
    // Only send new columns when provided (avoids "column not in schema cache" if migration 036 not applied)
    if (data.parentSolutionId != null) insertPayload.parent_solution_id = data.parentSolutionId;
    if (data.sortIndex !== undefined) insertPayload.sort_index = data.sortIndex;
    const { data: solution, error } = await supabase
      .from('solutions')
      .insert(insertPayload)
      .select()
      .single();
    if (error) handleError(error, 'Failed to create solution');
    return {
      ...solution,
      tests: [],
      subSolutions: [],
      startDate: solution.start_date,
      endDate: solution.end_date,
      workspaceId: solution.workspace_id,
      parentSolutionId: solution.parent_solution_id ?? null,
      confidenceScore: solution.confidence_score ?? null,
      sortIndex: solution.sort_index ?? 0
    };
  },

  updateSolution: async (id, data) => {
    const updateData = {
      title: data.title,
      description: data.description,
      status: data.status,
      owner: data.owner,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null
    };
    if (Object.prototype.hasOwnProperty.call(data, 'workspaceId')) {
      updateData.workspace_id = data.workspaceId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'parentSolutionId')) {
      updateData.parent_solution_id = data.parentSolutionId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'confidenceScore')) {
      updateData.confidence_score = data.confidenceScore ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'sortIndex')) {
      updateData.sort_index = data.sortIndex ?? 0;
    }
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    
    const { data: solution, error } = await supabase
      .from('solutions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update solution');
    return {
      ...solution,
      startDate: solution.start_date,
      endDate: solution.end_date,
      workspaceId: solution.workspace_id,
      parentSolutionId: solution.parent_solution_id ?? null,
      confidenceScore: solution.confidence_score ?? null,
      sortIndex: solution.sort_index ?? 0
    };
  },

  deleteSolution: async (id) => {
    const { error } = await supabase
      .from('solutions')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete solution');
  },

  // Tests
  createTest: async (solutionId, data) => {
    const userId = await getCurrentUserId();
    const payload = {
      title: data.title,
      description: data.description,
      solution_id: solutionId,
      owner: data.owner || userId,
      status: data.status || 'draft',
      test_template: data.testTemplate || null,
      type: data.testType || 'custom',
      hypothesis_id: data.hypothesisId || null,
      test_status: data.testStatus || 'draft',
      success_criteria: data.successCriteria || null,
      result_decision: data.resultDecision || null,
      result_summary: data.resultSummary || null,
      timebox_start: data.timebox?.start || null,
      timebox_end: data.timebox?.end || null,
      workspace_id: data.workspaceId || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null
    };

    const { data: test, error } = await supabase
      .from('tests')
      .insert(payload)
      .select()
      .single();

    if (!error) {
      return {
        ...test,
        kpis: [],
        startDate: test.start_date,
        endDate: test.end_date,
        testType: test.type,
        hypothesisId: test.hypothesis_id,
        workspaceId: test.workspace_id
      };
    }

    const message = error.message || '';
    const missingTable =
      error.code === '42P01' ||
      message.includes('does not exist') ||
      message.includes('relation') ||
      message.includes('schema cache') ||
      message.includes('Could not find the table');

    if (!missingTable) {
      handleError(error, 'Failed to create test');
    }

    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .insert({
        solution_id: solutionId,
        type: data.testType || 'custom',
        title: data.title,
        hypothesis: data.description || null,
        hypothesis_id: data.hypothesisId || null,
        status: data.status || 'planned',
        target_n: 50,
        created_by: userId,
        owner: data.owner || userId
      })
      .select()
      .single();

    if (experimentError) handleError(experimentError, 'Failed to create test');

    return {
      ...experiment,
      kpis: [],
      startDate: experiment.start_date,
      endDate: experiment.end_date,
      testType: experiment.type,
      hypothesisId: experiment.hypothesis_id,
      workspaceId: experiment.workspace_id
    };
  },

  updateTest: async (id, data) => {
    // Map UI test status to experiments.status (planned|running|evaluated|archived)
    const rawStatus = data.testStatus || data.status;
    const hasResult = data.resultDecision && ['pass', 'iterate', 'kill'].includes(String(data.resultDecision).toLowerCase());
    let experimentStatus = null;
    if (hasResult) {
      experimentStatus = 'evaluated';
    } else if (rawStatus === 'designed' || rawStatus === 'running') {
      experimentStatus = 'running';
    } else if (rawStatus === 'idea' || rawStatus === 'draft' || rawStatus === 'planned' || rawStatus === 'blocked') {
      experimentStatus = 'planned';
    } else if (rawStatus === 'done' || rawStatus === 'completed' || rawStatus === 'evaluated' || rawStatus === 'archived') {
      experimentStatus = rawStatus === 'archived' ? 'archived' : 'evaluated';
    } else {
      experimentStatus = 'planned';
    }

    const experimentUpdate = {
      title: data.title ?? null,
      hypothesis: data.description ?? null,
      status: experimentStatus,
      owner: data.owner ?? null,
      type: data.testType ?? 'custom',
      hypothesis_id: data.hypothesisId ?? null,
      test_template: data.testTemplate ?? null,
      test_status: data.testStatus ?? null,
      success_criteria: data.successCriteria ?? null,
      result_decision: data.resultDecision ?? null,
      result_summary: data.resultSummary ?? null
    };
    if (Object.prototype.hasOwnProperty.call(data, 'timebox')) {
      experimentUpdate.timebox_start = data.timebox?.start ?? null;
      experimentUpdate.timebox_end = data.timebox?.end ?? null;
    }

    // Update experiments first (getOutcomes reads from experiments); fall back to tests if table missing
    let result = await supabase
      .from('experiments')
      .update(experimentUpdate)
      .eq('id', id)
      .select()
      .single();

    if (result.error) {
      const message = result.error.message || '';
      const missingTable =
        result.error.code === '42P01' ||
        message.includes('does not exist') ||
        message.includes('relation') ||
        message.includes('schema cache') ||
        message.includes('Could not find the table');

      if (!missingTable) {
        handleError(result.error, 'Failed to update test');
      }

      const updateData = {
        title: data.title,
        description: data.description,
        owner: data.owner,
        status: data.status,
        evidence: data.evidence,
        result: data.result,
        type: data.testType,
        hypothesis_id: data.hypothesisId,
        test_template: data.testTemplate,
        test_status: data.testStatus,
        success_criteria: data.successCriteria,
        result_decision: data.resultDecision,
        result_summary: data.resultSummary,
        start_date: data.startDate ?? null,
        end_date: data.endDate ?? null
      };
      if (Object.prototype.hasOwnProperty.call(data, 'timebox')) {
        updateData.timebox_start = data.timebox?.start ?? null;
        updateData.timebox_end = data.timebox?.end ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'workspaceId')) {
        updateData.workspace_id = data.workspaceId ?? null;
      }
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      result = await supabase
        .from('tests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (result.error) handleError(result.error, 'Failed to update test');
    }

    const test = result.data;
    return {
      ...test,
      testStatus: test.test_status ?? test.testStatus,
      resultDecision: test.result_decision ?? test.resultDecision ?? null,
      startDate: test.start_date,
      endDate: test.end_date,
      workspaceId: test.workspace_id
    };
  },

  // Evidence
  listEvidence: async (testId) => {
    const { data, error } = await supabase
      .from('evidence_items')
      .select('*')
      .eq('node_id', testId)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code === '42P01' || (error.message && (error.message.includes('does not exist') || error.message.includes('relation')))) {
        console.warn('Evidence table may not exist; run migration 032_create_evidence_items.sql');
        return [];
      }
      console.error('[Evidence] listEvidence failed:', testId, error.code, error.message);
      handleError(error, 'Failed to fetch evidence');
    }
    const items = data || [];
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && items.length > 0) {
      console.log('[Evidence] listEvidence', testId, '→', items.length, 'items');
    }
    return items;
  },

  createEvidence: async (testId, payload) => {
    const userId = await getCurrentUserId();
    let workspaceId = payload.workspaceId ?? null;
    if (!workspaceId) {
      let solutionId = null;
      const { data: exp } = await supabase.from('experiments').select('solution_id').eq('id', testId).single();
      if (exp?.solution_id) solutionId = exp.solution_id;
      if (!solutionId) {
        const { data: testRow } = await supabase.from('tests').select('solution_id').eq('id', testId).single();
        if (testRow?.solution_id) solutionId = testRow.solution_id;
      }
      if (solutionId) {
        const { data: sol } = await supabase.from('solutions').select('workspace_id, opportunity_id').eq('id', solutionId).single();
        if (sol?.workspace_id) workspaceId = sol.workspace_id;
        else if (sol?.opportunity_id) {
          const { data: opp } = await supabase.from('opportunities').select('outcome_id').eq('id', sol.opportunity_id).single();
          if (opp?.outcome_id) {
            const { data: out } = await supabase.from('outcomes').select('workspace_id').eq('id', opp.outcome_id).single();
            if (out?.workspace_id) workspaceId = out.workspace_id;
          }
        }
      }
    }
    const insertPayload = {
      node_id: testId,
      board_id: payload.boardId || null,
      workspace_id: workspaceId,
      type: payload.type,
      content: payload.content || '',
      quality: payload.quality || 'medium',
      source: payload.source || 'customer',
      created_by: userId
    };
    const { data, error } = await supabase
      .from('evidence_items')
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      console.error('[Evidence] createEvidence failed:', testId, error.code, error.message, insertPayload);
      if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
        throw new Error('Evidence storage is not set up. Please run database migrations (see docs or migration 032_create_evidence_items.sql).');
      }
      if (error.code === '42501' || (error.message && error.message.toLowerCase().includes('policy'))) {
        throw new Error('Evidence could not be saved (permission or workspace). Ensure you are in a workspace and run migration 033 to backfill evidence workspace_id.');
      }
      handleError(error, 'Failed to create evidence');
    }
    if (data && typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('[Evidence] createEvidence ok:', testId, '→ id', data?.id);
    }
    return data;
  },

  updateEvidence: async (id, payload) => {
    const { data, error } = await supabase
      .from('evidence_items')
      .update({
        type: payload.type,
        content: payload.content,
        quality: payload.quality,
        source: payload.source
      })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError(error, 'Failed to update evidence');
    return data;
  },

  deleteEvidence: async (id) => {
    const { error } = await supabase
      .from('evidence_items')
      .delete()
      .eq('id', id);
    if (error) handleError(error, 'Failed to delete evidence');
  },

  deleteTest: async (id) => {
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete test');
  },

  // KPIs
  createKPI: async (experimentId, data) => {
    const { data: kpi, error } = await supabase
      .from('kpis')
      .insert({
        ...data,
        experiment_id: experimentId
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create KPI');
    return kpi;
  },

  updateKPI: async (id, data) => {
    const { data: kpi, error } = await supabase
      .from('kpis')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update KPI');
    return kpi;
  },

  deleteKPI: async (id) => {
    const { error } = await supabase
      .from('kpis')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete KPI');
  },

  // Sprints (formerly Campaigns)
  getCampaigns: async (solutionId) => {
    const { data, error } = await supabase
      .from('sprints')
      .select(`
        *,
        tasks (*)
      `)
      .eq('solution_id', solutionId)
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'Failed to fetch sprints');
    
    return (data || []).map(sprint => ({
      ...sprint,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
      tasks: (sprint.tasks || []).map(task => ({
        ...task,
        dueDate: task.due_date
      }))
    }));
  },

  createCampaign: async (solutionId, data) => {
    const { data: sprint, error } = await supabase
      .from('sprints')
      .insert({
        solution_id: solutionId,
        title: data.title,
        description: data.description || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        status: data.status || 'planned'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating sprint:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Sprints table does not exist. Please run the database migration (020_rename_campaigns_to_sprints.sql) in Supabase Studio.');
      }
      handleError(error, 'Failed to create sprint');
    }
    
    return {
      ...sprint,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
      tasks: []
    };
  },

  updateCampaign: async (id, data) => {
    const updateData = {
      title: data.title,
      description: data.description,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      status: data.status
    };
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    
    const { data: sprint, error } = await supabase
      .from('sprints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update sprint');
    
    return {
      ...sprint,
      startDate: sprint.start_date,
      endDate: sprint.end_date
    };
  },

  deleteCampaign: async (id) => {
    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete sprint');
  },

  // Tasks
  createTask: async (campaignId, data) => {
    const userId = await getCurrentUserId();
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        sprint_id: campaignId,
        title: data.title,
        notes: data.notes || null,
        status: data.status || 'todo',
        priority: data.priority || null,
        due_date: data.dueDate || null,
        assignee_id: data.assigneeId || userId
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create task');
    
    return {
      ...task,
      dueDate: task.due_date
    };
  },

  updateTask: async (id, data) => {
    const updateData = {
      title: data.title,
      notes: data.notes,
      status: data.status,
      priority: data.priority,
      due_date: data.dueDate || null,
      assignee_id: data.assigneeId
    };
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update task');
    
    return {
      ...task,
      dueDate: task.due_date
    };
  },

  deleteTask: async (id) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete task');
  },

  // Authentication
  register: async (data) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            invite_code: data.inviteCode?.trim() || ''
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        console.error('Registration error:', authError);
        if (authError.message?.includes('aborted') || authError.message?.includes('signal') || authError.name === 'AbortError') {
          throw new Error('Registration request was cancelled. Please check your connection and try again.');
        }
        handleError(authError, authError.message || 'Failed to register');
      }
      
      // For self-hosted instances, if no session is created, 
      // the user might need to be auto-confirmed
      // Wait a moment for the trigger to run
      if (authData?.user && !authData.session) {
        // Try to get session after a short delay (trigger might be processing)
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          authData.session = session;
        }
      }
      
      return authData;
    } catch (error) {
      console.error('Registration exception:', error);
      if (error.message?.includes('aborted') || error.name === 'AbortError') {
        throw new Error('Registration request was cancelled. Please try again.');
      }
      throw error;
    }
  },

  login: async (data) => {
    const startTime = Date.now();
    try {
      console.log('Starting login for:', data.email);
      
      // Step 1: Sign in with password (this is the critical step)
      const signInStart = Date.now();
      const signInPromise = supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      // Allow slower connections without forcing a timeout rejection
      const { data: authData, error: authError } = await signInPromise;
      
      const signInTime = Date.now() - signInStart;
      console.log(`Sign in completed in ${signInTime}ms`);

      if (authError) {
        console.error('Login error:', authError);
        // Check if it's a network/DNS error
        if (authError.message?.includes('Failed to fetch') || authError.message?.includes('ERR_NAME_NOT_RESOLVED') || authError.message?.includes('NetworkError')) {
          throw new Error('Cannot connect to server. The domain api.maxbeitler.com may not be resolving. Please check your network connection and DNS settings.');
        }
        if (authError.message?.includes('aborted') || authError.message?.includes('signal')) {
          throw new Error('Connection was interrupted. Please check your network connection and try again.');
        }
        if (authError.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        handleError(authError, authError.message || 'Failed to login');
      }
      
      if (!authData || !authData.session) {
        throw new Error('No session created. Please check your credentials and try again.');
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`Login successful, session created (total: ${totalTime}ms)`);
      
      // Step 2: Get user from session (should be fast)
      const user = authData.user || authData.session?.user;
      if (!user) {
        // Fallback: try to get user
        const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !authUser) {
          throw new Error('Could not get user after login. Please try again.');
        }
        const basicUser = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email,
          profile: {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email,
            role: 'user'
          }
        };
        return { 
          user: basicUser, 
          token: authData.session?.access_token 
        };
      }
      
      // Return user immediately - don't wait for profile
      const basicUser = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        profile: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          role: 'user'
        }
      };
      
      // Try to get profile in background (non-blocking)
      getCurrentUserWithProfile()
        .then(userWithProfile => {
          if (userWithProfile && userWithProfile.profile) {
            console.log('Profile loaded successfully');
          }
        })
        .catch(err => {
          console.warn('Could not load profile (non-fatal):', err);
        });
      
      return { 
        user: basicUser, 
        token: authData.session?.access_token 
      };
    } catch (error) {
      console.error('Login exception:', error);
      // Re-throw with a more user-friendly message
      if (error.message?.includes('aborted') || error.name === 'AbortError') {
        throw new Error('Login request was cancelled. Please try again.');
      }
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        throw new Error('Connection to server is slow or unreachable. Please check your network and try again.');
      }
      throw error;
    }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) handleError(error, 'Failed to logout');
  },

  getCurrentUser: async () => {
    if (getCurrentUserPromise) return getCurrentUserPromise;

    getCurrentUserPromise = (async () => {
      try {
        if (DEBUG_AUTH) console.log('[auth] getCurrentUser: start');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          if (DEBUG_AUTH) console.warn('[auth] getCurrentUser: session error', sessionError);
          throw sessionError;
        }

        if (!session) {
          if (DEBUG_AUTH) console.log('[auth] getCurrentUser: no session');
          return null;
        }

        // Fire and forget user fetch to avoid blocking startup on slow networks
        supabase.auth.getUser()
          .then(({ data: { user }, error }) => {
            if (error && DEBUG_AUTH) {
              console.warn('[auth] getCurrentUser: user fetch error', error);
            }
            if (user && DEBUG_AUTH) {
              console.log('[auth] getCurrentUser: user fetch ok');
            }
          })
          .catch((err) => {
            if (DEBUG_AUTH) console.warn('[auth] getCurrentUser: user fetch exception', err);
          });

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

        if (DEBUG_AUTH) console.log('[auth] getCurrentUser: success');
        return basicUser;
      } catch (error) {
        if (DEBUG_AUTH) console.warn('[auth] getCurrentUser: unexpected error', error);
        throw error;
      } finally {
        getCurrentUserPromise = null;
      }
    })();

    return getCurrentUserPromise;
  },

  updateProfile: async (data) => {
    const userId = await getCurrentUserId();
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update profile');
    return profile;
  },

  changePassword: async (data) => {
    const { error } = await supabase.auth.updateUser({
      password: data.newPassword
    });

    if (error) handleError(error, 'Failed to change password');
  },

  getUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (error) handleError(error, 'Failed to fetch users');
    return data || [];
  },

  // Admin endpoints
  getAdminUsers: async () => {
    if (!await isAdmin(await getCurrentUserId())) {
      throw new Error('Admin access required');
    }
    return await this.getUsers();
  },

  updateAdminUser: async (id, data) => {
    if (!await isAdmin(await getCurrentUserId())) {
      throw new Error('Admin access required');
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update user');
    return profile;
  },

  deleteAdminUser: async (id) => {
    if (!await isAdmin(await getCurrentUserId())) {
      throw new Error('Admin access required');
    }
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) handleError(error, 'Failed to delete user');
  },

  // Teams
  getTeams: async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching teams:', error);
        // Don't throw for RLS errors, just return empty array
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
          console.warn('RLS policy error for teams - returning empty array');
          return [];
        }
        handleError(error, 'Failed to fetch teams');
      }
      return data || [];
    } catch (error) {
      console.error('Exception in getTeams:', error);
      return []; // Return empty array instead of throwing
    }
  },

  createTeam: async (data) => {
    const userId = await getCurrentUserId();
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        ...data,
        created_by: userId
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create team');
    
    // Add creator as team lead
    await supabase.from('team_memberships').insert({
      team_id: team.id,
      user_id: userId,
      role: 'lead'
    });
    
    return team;
  },

  updateTeam: async (id, data) => {
    const { data: team, error } = await supabase
      .from('teams')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update team');
    return team;
  },

  deleteTeam: async (id) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete team');
  },

  getTeamMembers: async (teamId) => {
    const { data, error } = await supabase
      .from('team_memberships')
      .select(`
        *,
        user:profiles(*)
      `)
      .eq('team_id', teamId);
    
    if (error) handleError(error, 'Failed to fetch team members');
    return data || [];
  },

  addTeamMember: async (teamId, userEmail, role) => {
    // Find user by email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    if (profileError || !profiles) {
      throw new Error('User not found');
    }
    
    const { data, error } = await supabase
      .from('team_memberships')
      .insert({
        team_id: teamId,
        user_id: profiles.id,
        role: role || 'member'
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to add team member');
    return data;
  },

  updateTeamMember: async (teamId, memberId, role) => {
    const { data, error } = await supabase
      .from('team_memberships')
      .update({ role })
      .eq('team_id', teamId)
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update team member');
    return data;
  },

  removeTeamMember: async (teamId, memberId) => {
    const { error } = await supabase
      .from('team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('id', memberId);
    
    if (error) handleError(error, 'Failed to remove team member');
  },

  // Comments
  addComment: async (entityId, entityType, data) => {
    const userId = await getCurrentUserId();
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        entity_id: entityId,
        entity_type: entityType,
        user_id: userId,
        content: data.content
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to add comment');
    return comment;
  },

  deleteComment: async (commentId) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (error) handleError(error, 'Failed to delete comment');
  },

  // KPI Templates
  getKPITemplates: async (category) => {
    let query = supabase.from('kpi_templates').select('*');
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query.order('name');
    
    if (error) handleError(error, 'Failed to fetch KPI templates');
    return data || [];
  },

  createKPITemplate: async (data) => {
    const userId = await getCurrentUserId();
    if (!await isAdmin(userId)) {
      throw new Error('Admin access required');
    }
    
    const { data: template, error } = await supabase
      .from('kpi_templates')
      .insert(data)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create KPI template');
    return template;
  },

  updateKPITemplate: async (id, data) => {
    const userId = await getCurrentUserId();
    if (!await isAdmin(userId)) {
      throw new Error('Admin access required');
    }
    
    const { data: template, error } = await supabase
      .from('kpi_templates')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update KPI template');
    return template;
  },

  deleteKPITemplate: async (id) => {
    const userId = await getCurrentUserId();
    if (!await isAdmin(userId)) {
      throw new Error('Admin access required');
    }
    
    const { error } = await supabase
      .from('kpi_templates')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete KPI template');
  },

  // Interview Notes
  getInterviewNotes: async () => {
    const { data, error } = await supabase
      .from('interview_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'Failed to fetch interview notes');
    return data || [];
  },

  createInterviewNote: async (data) => {
    const userId = await getCurrentUserId();
    const { data: note, error } = await supabase
      .from('interview_notes')
      .insert({
        ...data,
        created_by: userId
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create interview note');
    return note;
  },

  updateInterviewNote: async (id, data) => {
    const { data: note, error } = await supabase
      .from('interview_notes')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update interview note');
    return note;
  },

  deleteInterviewNote: async (id) => {
    const { error } = await supabase
      .from('interview_notes')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete interview note');
  },

  addNoteLink: async (noteId, data) => {
    const { data: link, error } = await supabase
      .from('note_links')
      .insert({
        note_id: noteId,
        entity_id: data.entityId,
        entity_type: data.entityType
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to add note link');
    return link;
  },

  deleteNoteLink: async (noteId, linkId) => {
    const { error } = await supabase
      .from('note_links')
      .delete()
      .eq('id', linkId)
      .eq('note_id', noteId);
    
    if (error) handleError(error, 'Failed to delete note link');
  },

  // Data Sources
  getDataSources: async () => {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'Failed to fetch data sources');
    return data || [];
  },

  createDataSource: async (data) => {
    const userId = await getCurrentUserId();
    const { data: source, error } = await supabase
      .from('data_sources')
      .insert({
        ...data,
        created_by: userId,
        team_id: data.teamId || null
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create data source');
    return source;
  },

  updateDataSource: async (id, data) => {
    const { data: source, error } = await supabase
      .from('data_sources')
      .update({
        ...data,
        team_id: data.teamId || null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update data source');
    return source;
  },

  deleteDataSource: async (id) => {
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete data source');
  },

  // Data Points
  getDataPoints: async (sourceId, testId) => {
    let query = supabase.from('data_points').select('*');
    if (sourceId) query = query.eq('data_source_id', sourceId);
    if (testId) query = query.eq('test_id', testId);
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) handleError(error, 'Failed to fetch data points');
    return data || [];
  },

  createDataPoint: async (data) => {
    const { data: point, error } = await supabase
      .from('data_points')
      .insert({
        ...data,
        data_source_id: data.dataSourceId,
        test_id: data.testId || null
      })
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to create data point');
    return point;
  },

  updateDataPoint: async (id, data) => {
    const { data: point, error } = await supabase
      .from('data_points')
      .update({
        ...data,
        test_id: data.testId || null
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to update data point');
    return point;
  },

  deleteDataPoint: async (id) => {
    const { error } = await supabase
      .from('data_points')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'Failed to delete data point');
  },

  linkDataPointToTest: async (dataPointId, testId) => {
    const { data, error } = await supabase
      .from('data_points')
      .update({ test_id: testId })
      .eq('id', dataPointId)
      .select()
      .single();
    
    if (error) handleError(error, 'Failed to link data point to test');
    return data;
  },

  // Integration APIs (these would need to be handled by Edge Functions or a separate backend)
  getIntegrationTypes: async () => {
    // This would typically come from a backend service
    return {
      microsoft_clarity: {
        name: 'Microsoft Clarity',
        fields: [
          { name: 'projectId', label: 'Project ID', required: true },
          { name: 'accessToken', label: 'Access Token', required: true, type: 'password' }
        ]
      },
      linkedin: {
        name: 'LinkedIn',
        fields: [
          { name: 'accessToken', label: 'Access Token', required: true, type: 'password' },
          { name: 'organizationId', label: 'Organization ID', required: false },
          { name: 'pageId', label: 'Page ID', required: false }
        ]
      },
      instagram: {
        name: 'Instagram',
        fields: [
          { name: 'accessToken', label: 'Access Token', required: true, type: 'password' },
          { name: 'userId', label: 'User ID', required: true }
        ]
      },
      calling: {
        name: 'Calling Insights',
        fields: [
          { name: 'platform', label: 'Platform', required: true, type: 'select', options: ['twilio', 'ringcentral', 'aircall', 'custom'] },
          { name: 'accountSid', label: 'Account SID', required: false },
          { name: 'authToken', label: 'Auth Token', required: false, type: 'password' }
        ]
      }
    };
  },

  testDataSource: async (sourceId) => {
    // This would call a Supabase Edge Function
    throw new Error('Not implemented - requires Edge Function');
  },

  fetchDataSource: async (sourceId, options) => {
    // This would call a Supabase Edge Function
    throw new Error('Not implemented - requires Edge Function');
  },

  // Experiments Feature (Calling Campaign)
  createExperiment: async (solutionId, payload) => {
    const userId = await getCurrentUserId();
    const { data: experiment, error } = await supabase
      .from('experiments')
      .insert({
        solution_id: solutionId,
        type: payload.type || 'custom',
        title: payload.title,
        hypothesis: payload.hypothesis || null,
        hypothesis_id: payload.hypothesisId || null,
        target_n: payload.targetN || 50,
        status: payload.status || 'planned',
        created_by: userId,
        owner: userId // Keep owner for compatibility
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating experiment:', error);
      handleError(error, 'Failed to create experiment');
    }

    // Auto-create default signals for calling_campaign
    if (experiment && experiment.type === 'calling_campaign') {
      // Call the function directly (it's in the same export object)
      const defaultSignals = [
        { key: 'attractiveness', label: 'Attractiveness', type: 'enum', options: ['attractive', 'less_attractive'], required: true },
        { key: 'urgency', label: 'Urgency', type: 'enum', options: ['high', 'medium', 'low'], required: false },
        { key: 'willingness_to_pay', label: 'Willingness to Pay', type: 'enum', options: ['yes', 'no', 'unclear'], required: false }
      ];

      for (const signalData of defaultSignals) {
        const { error: signalError } = await supabase
          .from('experiment_signals')
          .insert({
            experiment_id: experiment.id,
            key: signalData.key,
            label: signalData.label,
            type: signalData.type,
            options: signalData.options,
            required: signalData.required || false
          });
        
        if (signalError) {
          console.error(`Error creating signal ${signalData.key}:`, signalError);
        }
      }
    }

    return experiment;
  },

  // Hypotheses
  listHypotheses: async (opportunityId) => {
    const { data, error } = await supabase
      .from('hypotheses')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true });
    if (error) handleError(error, 'Failed to fetch hypotheses');
    return data || [];
  },

  createHypothesis: async (opportunityId, statement) => {
    const { data, error } = await supabase
      .from('hypotheses')
      .insert({ opportunity_id: opportunityId, statement })
      .select()
      .single();
    if (error) handleError(error, 'Failed to create hypothesis');
    return data;
  },

  updateHypothesis: async (hypothesisId, updates) => {
    const payload = {
      statement: updates.statement,
      status: updates.status
    };
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    const { data, error } = await supabase
      .from('hypotheses')
      .update(payload)
      .eq('id', hypothesisId)
      .select()
      .single();
    if (error) handleError(error, 'Failed to update hypothesis');
    return data;
  },

  deleteHypothesis: async (hypothesisId) => {
    const { error } = await supabase
      .from('hypotheses')
      .delete()
      .eq('id', hypothesisId);
    if (error) handleError(error, 'Failed to delete hypothesis');
  },

  listExperiments: async (solutionId) => {
    const { data: experiments, error } = await supabase
      .from('experiments')
      .select(`
        *,
        experiment_signals (*),
        experiment_evidence (
          id,
          evidence_type,
          contact_label,
          notes,
          duration_min,
          created_at,
          experiment_evidence_signal_values (
            signal_id,
            value_text,
            experiment_signals!inner (key, label)
          )
        )
      `)
      .eq('solution_id', solutionId)
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'Failed to fetch experiments');
    
    return (experiments || []).map(exp => ({
      ...exp,
      signals: exp.experiment_signals || [],
      evidence: (exp.experiment_evidence || []).map(ev => ({
        ...ev,
        signalValues: ev.experiment_evidence_signal_values || []
      }))
    }));
  },

  getExperiment: async (experimentId) => {
    const { data: experiment, error } = await supabase
      .from('experiments')
      .select(`
        *,
        experiment_signals (*),
        experiment_evidence (
          *,
          experiment_evidence_signal_values (
            *,
            experiment_signals!inner (*)
          )
        )
      `)
      .eq('id', experimentId)
      .single();
    
    if (error) handleError(error, 'Failed to fetch experiment');
    
    return {
      ...experiment,
      signals: experiment.experiment_signals || [],
      evidence: (experiment.experiment_evidence || []).map(ev => ({
        ...ev,
        signalValues: ev.experiment_evidence_signal_values || []
      }))
    };
  },

  createDefaultSignalsForCallingCampaign: async (experimentId) => {
    const defaultSignals = [
      { key: 'attractiveness', label: 'Attractiveness', type: 'enum', options: ['attractive', 'less_attractive'], required: true },
      { key: 'urgency', label: 'Urgency', type: 'enum', options: ['high', 'medium', 'low'], required: false },
      { key: 'willingness_to_pay', label: 'Willingness to Pay', type: 'enum', options: ['yes', 'no', 'unclear'], required: false }
    ];

    const signals = [];
    for (const signalData of defaultSignals) {
      const { data: signal, error } = await supabase
        .from('experiment_signals')
        .insert({
          experiment_id: experimentId,
          key: signalData.key,
          label: signalData.label,
          type: signalData.type,
          options: signalData.options,
          required: signalData.required || false
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating signal ${signalData.key}:`, error);
      } else {
        signals.push(signal);
      }
    }

    return signals;
  },

  listSignals: async (experimentId) => {
    const { data: signals, error } = await supabase
      .from('experiment_signals')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('created_at', { ascending: true });
    
    if (error) handleError(error, 'Failed to fetch signals');
    return signals || [];
  },

  logCall: async (experimentId, evidencePayload, signalValuesPayload) => {
    const userId = await getCurrentUserId();
    
    // Create evidence
    const { data: evidence, error: evidenceError } = await supabase
      .from('experiment_evidence')
      .insert({
        experiment_id: experimentId,
        evidence_type: 'call',
        contact_label: evidencePayload.contactLabel || null,
        notes: evidencePayload.notes || null,
        duration_min: evidencePayload.durationMin || null,
        created_by: userId
      })
      .select()
      .single();
    
    if (evidenceError) {
      console.error('Error creating evidence:', evidenceError);
      handleError(evidenceError, 'Failed to log call');
    }

    // Create signal values
    if (signalValuesPayload && Object.keys(signalValuesPayload).length > 0) {
      // First, get all signals for this experiment to map keys to IDs
      const { data: signals } = await supabase
        .from('experiment_signals')
        .select('id, key')
        .eq('experiment_id', experimentId);
      
      const signalMap = {};
      (signals || []).forEach(s => {
        signalMap[s.key] = s.id;
      });

      const signalValueInserts = [];
      for (const [signalKey, value] of Object.entries(signalValuesPayload)) {
        if (value !== null && value !== undefined && signalMap[signalKey]) {
          signalValueInserts.push({
            evidence_id: evidence.id,
            signal_id: signalMap[signalKey],
            value_text: String(value)
          });
        }
      }

      if (signalValueInserts.length > 0) {
        const { error: valuesError } = await supabase
          .from('experiment_evidence_signal_values')
          .insert(signalValueInserts);
        
        if (valuesError) {
          console.error('Error creating signal values:', valuesError);
          // Don't fail the whole operation, but log the error
        }
      }
    }

    // Fetch the complete evidence with signal values
    const { data: completeEvidence, error: fetchError } = await supabase
      .from('experiment_evidence')
      .select(`
        *,
        experiment_evidence_signal_values (
          *,
          experiment_signals!inner (*)
        )
      `)
      .eq('id', evidence.id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching complete evidence:', fetchError);
      return evidence; // Return basic evidence if fetch fails
    }

    return {
      ...completeEvidence,
      signalValues: completeEvidence.experiment_evidence_signal_values || []
    };
  },

  listEvidence: async (experimentId) => {
    const { data: evidence, error } = await supabase
      .from('experiment_evidence')
      .select(`
        *,
        experiment_evidence_signal_values (
          *,
          experiment_signals!inner (*)
        )
      `)
      .eq('experiment_id', experimentId)
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'Failed to fetch evidence');
    
    return (evidence || []).map(ev => ({
      ...ev,
      signalValues: ev.experiment_evidence_signal_values || []
    }));
  },

  getAggregatedResults: async (experimentId) => {
    // Get all evidence with signal values
    const { data: evidence, error } = await supabase
      .from('experiment_evidence')
      .select(`
        id,
        experiment_evidence_signal_values (
          value_text,
          experiment_signals!inner (key, label, type, options)
        )
      `)
      .eq('experiment_id', experimentId);
    
    if (error) handleError(error, 'Failed to fetch results');
    
    // Aggregate results per signal
    const results = {};
    (evidence || []).forEach(ev => {
      (ev.experiment_evidence_signal_values || []).forEach(sv => {
        const signal = sv.experiment_signals;
        if (!results[signal.key]) {
          results[signal.key] = {
            key: signal.key,
            label: signal.label,
            type: signal.type,
            options: signal.options,
            counts: {},
            total: 0
          };
        }
        const value = sv.value_text;
        results[signal.key].counts[value] = (results[signal.key].counts[value] || 0) + 1;
        results[signal.key].total += 1;
      });
    });

    // Calculate percentages
    Object.values(results).forEach(result => {
      result.percentages = {};
      Object.entries(result.counts).forEach(([value, count]) => {
        result.percentages[value] = result.total > 0 ? Math.round((count / result.total) * 100) : 0;
      });
    });

    return results;
  },

  sendFeedback: async ({ message, includeContext, workspaceName, decisionSpaceName, url, mode, selectedNodeId } = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    const raw = typeof window !== 'undefined' && window.__ENV__?.REACT_APP_API_URL != null
      ? window.__ENV__.REACT_APP_API_URL
      : process.env.REACT_APP_API_URL;
    const base = (typeof raw === 'string' && raw.trim() && /^https?:\/\//i.test(raw.trim()))
      ? raw.trim().replace(/\/$/, '')
      : 'http://localhost:3010/api';
    try {
      const res = await fetch(`${base}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: message?.trim() || '',
          includeContext: !!includeContext,
          workspaceName: workspaceName || undefined,
          decisionSpaceName: decisionSpaceName || undefined,
          url: url || undefined,
          mode: mode || undefined,
          selectedNodeId: selectedNodeId || undefined
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || (res.status === 503 ? 'Feedback service not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to server .env (same as client).' : `Request failed: ${res.status}`);
        throw new Error(msg);
      }
      return res.json();
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        throw new Error('Cannot reach server. Is it running on ' + base + '?');
      }
      throw e;
    }
  }
};

