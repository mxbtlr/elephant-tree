-- Backfill workspace_id on evidence_items so RLS (e.g. from 040) can allow read/write.
-- Path: experiment -> solution -> opportunity -> outcome.workspace_id (or solution.workspace_id if present).
UPDATE public.evidence_items ei
SET workspace_id = COALESCE(
  (SELECT s.workspace_id FROM public.experiments e
   JOIN public.solutions s ON s.id = e.solution_id
   WHERE e.id = ei.node_id AND s.workspace_id IS NOT NULL
   LIMIT 1),
  (SELECT o.workspace_id FROM public.experiments e
   JOIN public.solutions s ON s.id = e.solution_id
   JOIN public.opportunities opp ON opp.id = s.opportunity_id
   JOIN public.outcomes o ON o.id = opp.outcome_id
   WHERE e.id = ei.node_id
   LIMIT 1)
)
WHERE ei.workspace_id IS NULL
  AND EXISTS (SELECT 1 FROM public.experiments e WHERE e.id = ei.node_id);
