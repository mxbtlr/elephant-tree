-- Evidence items for tests (quote, kpi, link, note, etc.) – so "Add evidence" is persisted
CREATE TABLE IF NOT EXISTS public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL,
  board_id UUID,
  workspace_id UUID,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS evidence_items_node_id_idx ON public.evidence_items (node_id);
CREATE INDEX IF NOT EXISTS evidence_items_workspace_id_idx ON public.evidence_items (workspace_id) WHERE workspace_id IS NOT NULL;

-- If table already existed (e.g. from 030), ensure columns exist
ALTER TABLE public.evidence_items ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.evidence_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (workspace-scoping can be added later via workspace_id)
DROP POLICY IF EXISTS "Evidence read" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence insert" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence update" ON public.evidence_items;
DROP POLICY IF EXISTS "Evidence delete" ON public.evidence_items;
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

-- Optional: keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_evidence_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS evidence_items_updated_at ON public.evidence_items;
CREATE TRIGGER evidence_items_updated_at
  BEFORE UPDATE ON public.evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.set_evidence_items_updated_at();
