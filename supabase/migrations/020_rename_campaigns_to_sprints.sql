-- Rename campaigns table to sprints
ALTER TABLE public.campaigns RENAME TO sprints;

-- Rename the foreign key column in tasks table
ALTER TABLE public.tasks RENAME COLUMN campaign_id TO sprint_id;

-- Rename indexes
ALTER INDEX idx_campaigns_solution_id RENAME TO idx_sprints_solution_id;
ALTER INDEX idx_tasks_campaign_id RENAME TO idx_tasks_sprint_id;

-- Drop old RLS policies on campaigns (they will be recreated with new names)
DROP POLICY IF EXISTS "Campaigns: authenticated users can insert" ON public.sprints;
DROP POLICY IF EXISTS "Campaigns: authenticated users can select" ON public.sprints;
DROP POLICY IF EXISTS "Campaigns: authenticated users can update" ON public.sprints;
DROP POLICY IF EXISTS "Campaigns: authenticated users can delete" ON public.sprints;

-- Create new RLS policies for sprints
CREATE POLICY "Sprints: authenticated users can insert" ON public.sprints
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Sprints: authenticated users can select" ON public.sprints
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sprints: authenticated users can update" ON public.sprints
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Sprints: authenticated users can delete" ON public.sprints
  FOR DELETE USING (auth.role() = 'authenticated');

-- Rename the trigger
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.sprints;
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
