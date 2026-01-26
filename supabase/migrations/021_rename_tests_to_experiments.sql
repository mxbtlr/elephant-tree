-- Rename tests table to experiments
ALTER TABLE public.tests RENAME TO experiments;

-- Rename the foreign key column in kpis table
ALTER TABLE public.kpis RENAME COLUMN test_id TO experiment_id;

-- Rename the foreign key column in data_points table
ALTER TABLE public.data_points RENAME COLUMN test_id TO experiment_id;

-- Rename indexes
DROP INDEX IF EXISTS idx_tests_solution_id;
CREATE INDEX IF NOT EXISTS idx_experiments_solution_id ON public.experiments(solution_id);

DROP INDEX IF EXISTS idx_kpis_test_id;
CREATE INDEX IF NOT EXISTS idx_kpis_experiment_id ON public.kpis(experiment_id);

-- Update comments table entity_type check constraint
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_entity_type_check;
ALTER TABLE public.comments ADD CONSTRAINT comments_entity_type_check 
  CHECK (entity_type IN ('outcome', 'opportunity', 'solution', 'experiment'));

-- Update foreign key constraints (PostgreSQL will handle these automatically when columns are renamed)
-- But we need to update any references in views or functions

-- Drop old RLS policies on tests (they will be recreated with new names)
DROP POLICY IF EXISTS "Tests: authenticated users can insert" ON public.experiments;
DROP POLICY IF EXISTS "Tests: authenticated users can select" ON public.experiments;
DROP POLICY IF EXISTS "Tests: authenticated users can update" ON public.experiments;
DROP POLICY IF EXISTS "Tests: authenticated users can delete" ON public.experiments;

-- Create new RLS policies for experiments
CREATE POLICY "Experiments: authenticated users can insert" ON public.experiments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Experiments: authenticated users can select" ON public.experiments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Experiments: authenticated users can update" ON public.experiments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Experiments: authenticated users can delete" ON public.experiments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Rename the trigger
DROP TRIGGER IF EXISTS update_tests_updated_at ON public.experiments;
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
