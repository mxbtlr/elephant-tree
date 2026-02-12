-- Ensure evidence_items allows authenticated users to insert/select regardless of workspace.
-- Run after 032 and 040 so evidence always works for logged-in users.
DROP POLICY IF EXISTS "Evidence read" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence write" ON public.evidence_items;

DROP POLICY IF EXISTS "Evidence items: authenticated read" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence items: authenticated insert" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence items: authenticated update" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence items: authenticated delete" ON public.evidence_items;

CREATE POLICY "Evidence items: authenticated read" ON public.evidence_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Evidence items: authenticated insert" ON public.evidence_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Evidence items: authenticated update" ON public.evidence_items
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Evidence items: authenticated delete" ON public.evidence_items
  FOR DELETE USING (auth.role() = 'authenticated');
