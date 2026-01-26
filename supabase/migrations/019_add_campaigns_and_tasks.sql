-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'done', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'blocked')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_campaigns_solution_id ON public.campaigns(solution_id);
CREATE INDEX idx_tasks_campaign_id ON public.tasks(campaign_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- Add updated_at triggers
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for campaigns (authenticated users can do everything)
CREATE POLICY "Campaigns: authenticated users can insert" ON public.campaigns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Campaigns: authenticated users can select" ON public.campaigns
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Campaigns: authenticated users can update" ON public.campaigns
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Campaigns: authenticated users can delete" ON public.campaigns
  FOR DELETE USING (auth.role() = 'authenticated');

-- Simple RLS policies for tasks (authenticated users can do everything)
CREATE POLICY "Tasks: authenticated users can insert" ON public.tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tasks: authenticated users can select" ON public.tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tasks: authenticated users can update" ON public.tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Tasks: authenticated users can delete" ON public.tasks
  FOR DELETE USING (auth.role() = 'authenticated');
