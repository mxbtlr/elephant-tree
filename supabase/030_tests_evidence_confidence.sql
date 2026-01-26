-- Add test-specific fields to tests table
alter table if exists public.tests
  add column if not exists test_template text,
  add column if not exists test_status text,
  add column if not exists success_criteria jsonb,
  add column if not exists result_decision text,
  add column if not exists result_summary text,
  add column if not exists timebox_start timestamp,
  add column if not exists timebox_end timestamp;

-- Optional confidence fields on nodes
alter table if exists public.outcomes
  add column if not exists confidence_score integer,
  add column if not exists confidence_level text,
  add column if not exists confidence_updated_at timestamp;

alter table if exists public.opportunities
  add column if not exists confidence_score integer,
  add column if not exists confidence_level text,
  add column if not exists confidence_updated_at timestamp;

alter table if exists public.solutions
  add column if not exists confidence_score integer,
  add column if not exists confidence_level text,
  add column if not exists confidence_updated_at timestamp;

-- Evidence items table
create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid,
  node_id uuid not null,
  type text not null,
  content text not null,
  quality text not null,
  source text not null,
  created_at timestamp with time zone default now(),
  created_by uuid
);

-- Indexes
create index if not exists evidence_items_node_id_idx on public.evidence_items (node_id);

-- RLS
alter table public.evidence_items enable row level security;

-- Basic policies mirroring existing read/write access patterns (adjust as needed)
create policy if not exists "Evidence read" on public.evidence_items
  for select using (auth.uid() is not null);

create policy if not exists "Evidence insert" on public.evidence_items
  for insert with check (auth.uid() = created_by);

create policy if not exists "Evidence update" on public.evidence_items
  for update using (auth.uid() = created_by);

create policy if not exists "Evidence delete" on public.evidence_items
  for delete using (auth.uid() = created_by);
