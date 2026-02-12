-- Confidence score (0-100) + Sub-Solutions
-- Backward compatible: NULL confidence_score and parent_solution_id.

-- 1) Opportunities: confidence_score
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS confidence_score INT NULL;

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_confidence_score_check;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_confidence_score_check
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100));

CREATE INDEX IF NOT EXISTS idx_opportunities_confidence_score
  ON public.opportunities (confidence_score) WHERE confidence_score IS NOT NULL;

-- 2) Solutions: parent_solution_id, confidence_score, sort_index
ALTER TABLE public.solutions
  ADD COLUMN IF NOT EXISTS parent_solution_id UUID NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS confidence_score INT NULL,
  ADD COLUMN IF NOT EXISTS sort_index INT NOT NULL DEFAULT 0;

ALTER TABLE public.solutions
  DROP CONSTRAINT IF EXISTS solutions_confidence_score_check;

ALTER TABLE public.solutions
  ADD CONSTRAINT solutions_confidence_score_check
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100));

CREATE INDEX IF NOT EXISTS idx_solutions_parent_solution_id
  ON public.solutions (parent_solution_id) WHERE parent_solution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_solutions_confidence_score
  ON public.solutions (confidence_score) WHERE confidence_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_solutions_sort_index
  ON public.solutions (opportunity_id, sort_index);
