-- Journey Layer (Tony Fadell Product Journey) + Sub-Opportunities
-- Backward compatible: existing opportunities remain top-level (parent_opportunity_id NULL, journey_stage NULL).

-- 1) Journey stages canonical table (label + sort order)
CREATE TABLE IF NOT EXISTS public.journey_stages (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.journey_stages (id, label, sort_order) VALUES
  ('awareness', 'Awareness', 1),
  ('education', 'Education', 2),
  ('acquisition', 'Acquisition', 3),
  ('product', 'Product', 4),
  ('onboarding', 'Onboarding', 5),
  ('usage', 'Usage', 6),
  ('support', 'Support', 7),
  ('loyalty', 'Loyalty', 8)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journey_stages_select"
  ON public.journey_stages FOR SELECT TO authenticated USING (true);

-- 2) Opportunities: add columns for sub-opportunities and journey
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS parent_opportunity_id UUID NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS journey_stage TEXT NULL,
  ADD COLUMN IF NOT EXISTS sort_index INT NOT NULL DEFAULT 0;

-- Constraint: journey_stage must be one of the 8 values or NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_journey_stage_check'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_journey_stage_check
      CHECK (journey_stage IS NULL OR journey_stage IN (
        'awareness', 'education', 'acquisition', 'product',
        'onboarding', 'usage', 'support', 'loyalty'
      ));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_outcome_id
  ON public.opportunities (outcome_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_parent_opportunity_id
  ON public.opportunities (parent_opportunity_id) WHERE parent_opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_journey_stage_outcome_id
  ON public.opportunities (journey_stage, outcome_id) WHERE journey_stage IS NOT NULL;

-- RLS: existing policies allow authenticated CRUD; sub-opportunities use same table so no new policies needed.
-- Ensure INSERT allows parent_opportunity_id (optional)
-- Ensure SELECT sees all opportunities (already permissive)
-- No change to UPDATE/DELETE needed.
