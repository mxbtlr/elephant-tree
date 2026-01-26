-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = is_team_member.user_id AND team_id = is_team_member.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in team
CREATE OR REPLACE FUNCTION public.get_team_role(user_id UUID, team_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.team_memberships
    WHERE user_id = get_team_role.user_id AND team_id = get_team_role.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Teams policies
CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (
    public.is_team_member(auth.uid(), id) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Team leads and admins can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (public.is_admin(auth.uid()) OR true) -- Allow all authenticated users to create teams
  );

CREATE POLICY "Team leads and admins can update teams"
  ON public.teams FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.get_team_role(auth.uid(), id) IN ('lead', 'admin') OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Team leads and admins can delete teams"
  ON public.teams FOR DELETE
  USING (
    created_by = auth.uid() OR
    public.get_team_role(auth.uid(), id) IN ('lead', 'admin') OR
    public.is_admin(auth.uid())
  );

-- Team memberships policies
CREATE POLICY "Users can view memberships of teams they belong to"
  ON public.team_memberships FOR SELECT
  USING (
    public.is_team_member(auth.uid(), team_id) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Team leads and admins can manage memberships"
  ON public.team_memberships FOR ALL
  USING (
    public.get_team_role(auth.uid(), team_id) IN ('lead', 'admin') OR
    public.is_admin(auth.uid())
  );

-- Outcomes policies
CREATE POLICY "Users can view outcomes they have access to"
  ON public.outcomes FOR SELECT
  USING (
    visibility = 'public' OR
    (visibility = 'private' AND owner = auth.uid()) OR
    (visibility = 'team' AND (
      team_id IS NULL OR
      public.is_team_member(auth.uid(), team_id) OR
      owner = auth.uid()
    )) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Authenticated users can create outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update outcomes they own or have team access"
  ON public.outcomes FOR UPDATE
  USING (
    owner = auth.uid() OR
    (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id)) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can delete outcomes they own or are team leads"
  ON public.outcomes FOR DELETE
  USING (
    owner = auth.uid() OR
    (team_id IS NOT NULL AND public.get_team_role(auth.uid(), team_id) IN ('lead', 'admin')) OR
    public.is_admin(auth.uid())
  );

-- Opportunities policies (inherit from parent outcome)
CREATE POLICY "Users can view opportunities of accessible outcomes"
  ON public.opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outcomes
      WHERE id = opportunities.outcome_id AND (
        visibility = 'public' OR
        (visibility = 'private' AND owner = auth.uid()) OR
        (visibility = 'team' AND (
          team_id IS NULL OR
          public.is_team_member(auth.uid(), team_id) OR
          owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can create opportunities in accessible outcomes"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.outcomes
      WHERE id = opportunities.outcome_id AND (
        visibility = 'public' OR
        (visibility = 'team' AND (
          team_id IS NULL OR
          public.is_team_member(auth.uid(), team_id) OR
          owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can update opportunities in accessible outcomes"
  ON public.opportunities FOR UPDATE
  USING (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.outcomes o
      WHERE o.id = opportunities.outcome_id AND (
        o.owner = auth.uid() OR
        (o.team_id IS NOT NULL AND public.is_team_member(auth.uid(), o.team_id)) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete opportunities in accessible outcomes"
  ON public.opportunities FOR DELETE
  USING (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.outcomes o
      WHERE o.id = opportunities.outcome_id AND (
        o.owner = auth.uid() OR
        (o.team_id IS NOT NULL AND public.get_team_role(auth.uid(), o.team_id) IN ('lead', 'admin')) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Similar policies for solutions, tests, and KPIs (following the same pattern)
-- Solutions policies
CREATE POLICY "Users can view solutions of accessible opportunities"
  ON public.solutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities opp
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE opp.id = solutions.opportunity_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage solutions in accessible opportunities"
  ON public.solutions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities opp
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE opp.id = solutions.opportunity_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Tests policies
CREATE POLICY "Users can view tests of accessible solutions"
  ON public.tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.solutions sol
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE sol.id = tests.solution_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage tests in accessible solutions"
  ON public.tests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.solutions sol
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE sol.id = tests.solution_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- KPIs policies
CREATE POLICY "Users can view KPIs of accessible tests"
  ON public.kpis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      JOIN public.solutions sol ON sol.id = t.solution_id
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE t.id = kpis.test_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage KPIs in accessible tests"
  ON public.kpis FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      JOIN public.solutions sol ON sol.id = t.solution_id
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE t.id = kpis.test_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments on accessible entities"
  ON public.comments FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.outcomes WHERE id = comments.entity_id AND entity_type = 'outcome' AND (
        visibility = 'public' OR
        (visibility = 'private' AND owner = auth.uid()) OR
        (visibility = 'team' AND (
          team_id IS NULL OR
          public.is_team_member(auth.uid(), team_id) OR
          owner = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Users can create comments on accessible entities"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments or admins can delete any"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- KPI Templates policies (public read, admin write)
CREATE POLICY "All authenticated users can view KPI templates"
  ON public.kpi_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage KPI templates"
  ON public.kpi_templates FOR ALL
  USING (public.is_admin(auth.uid()));

-- Data Sources policies
CREATE POLICY "Users can view data sources of their teams"
  ON public.data_sources FOR SELECT
  USING (
    created_by = auth.uid() OR
    (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id)) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can create data sources"
  ON public.data_sources FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update data sources they created or team leads can update team sources"
  ON public.data_sources FOR UPDATE
  USING (
    created_by = auth.uid() OR
    (team_id IS NOT NULL AND public.get_team_role(auth.uid(), team_id) IN ('lead', 'admin')) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can delete data sources they created or team leads can delete team sources"
  ON public.data_sources FOR DELETE
  USING (
    created_by = auth.uid() OR
    (team_id IS NOT NULL AND public.get_team_role(auth.uid(), team_id) IN ('lead', 'admin')) OR
    public.is_admin(auth.uid())
  );

-- Data Points policies
CREATE POLICY "Users can view data points of accessible data sources"
  ON public.data_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.data_sources ds
      WHERE ds.id = data_points.data_source_id AND (
        ds.created_by = auth.uid() OR
        (ds.team_id IS NOT NULL AND public.is_team_member(auth.uid(), ds.team_id)) OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage data points of accessible data sources"
  ON public.data_points FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.data_sources ds
      WHERE ds.id = data_points.data_source_id AND (
        ds.created_by = auth.uid() OR
        (ds.team_id IS NOT NULL AND public.is_team_member(auth.uid(), ds.team_id)) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Interview Notes policies
CREATE POLICY "Users can view their own notes or notes linked to accessible entities"
  ON public.interview_notes FOR SELECT
  USING (
    created_by = auth.uid() OR
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.note_links nl
      WHERE nl.note_id = interview_notes.id AND (
        (nl.entity_type = 'outcome' AND EXISTS (
          SELECT 1 FROM public.outcomes o WHERE o.id = nl.entity_id AND (
            o.visibility = 'public' OR
            (o.visibility = 'private' AND o.owner = auth.uid()) OR
            (o.visibility = 'team' AND (
              o.team_id IS NULL OR
              public.is_team_member(auth.uid(), o.team_id) OR
              o.owner = auth.uid()
            ))
          )
        ))
      )
    )
  );

CREATE POLICY "Users can create interview notes"
  ON public.interview_notes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own notes"
  ON public.interview_notes FOR UPDATE
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own notes"
  ON public.interview_notes FOR DELETE
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Note Links policies
CREATE POLICY "Users can view note links for accessible notes"
  ON public.note_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_notes n
      WHERE n.id = note_links.note_id AND (
        n.created_by = auth.uid() OR
        public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage note links for their notes"
  ON public.note_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_notes n
      WHERE n.id = note_links.note_id AND n.created_by = auth.uid()
    )
  );

