-- Update experiments table to match new requirements
-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiments' AND column_name = 'type') THEN
    ALTER TABLE public.experiments ADD COLUMN type TEXT DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiments' AND column_name = 'hypothesis') THEN
    ALTER TABLE public.experiments ADD COLUMN hypothesis TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiments' AND column_name = 'target_n') THEN
    ALTER TABLE public.experiments ADD COLUMN target_n INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiments' AND column_name = 'created_by') THEN
    ALTER TABLE public.experiments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop old constraint FIRST (before updating rows)
-- The constraint name is still "tests_status_check" from the original table creation
ALTER TABLE public.experiments DROP CONSTRAINT IF EXISTS tests_status_check;
ALTER TABLE public.experiments DROP CONSTRAINT IF EXISTS experiments_status_check;

-- Update status enum to match new requirements
-- Now we can update existing status values to match new enum
UPDATE public.experiments SET status = 'planned' WHERE status = 'draft';
UPDATE public.experiments SET status = 'running' WHERE status IN ('active', 'testing');
UPDATE public.experiments SET status = 'evaluated' WHERE status = 'completed';
-- Keep 'archived' as is

-- Create new constraint with updated status values
ALTER TABLE public.experiments ADD CONSTRAINT experiments_status_check 
  CHECK (status IN ('planned', 'running', 'evaluated', 'archived'));

-- Set created_by for existing rows (use owner if available, otherwise NULL)
UPDATE public.experiments SET created_by = owner WHERE created_by IS NULL AND owner IS NOT NULL;
