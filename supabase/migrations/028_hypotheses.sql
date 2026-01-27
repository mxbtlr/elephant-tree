-- Hypotheses on opportunities
create table if not exists public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  statement text not null,
  status text not null default 'untested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hypotheses_opportunity_created_idx
  on public.hypotheses (opportunity_id, created_at);

alter table if exists public.experiments
  add column if not exists hypothesis_id uuid references public.hypotheses(id) on delete set null;

create index if not exists experiments_hypothesis_idx on public.experiments (hypothesis_id);

alter table public.hypotheses enable row level security;

drop policy if exists "Hypotheses: authenticated select" on public.hypotheses;
drop policy if exists "Hypotheses: authenticated insert" on public.hypotheses;
drop policy if exists "Hypotheses: authenticated update" on public.hypotheses;
drop policy if exists "Hypotheses: authenticated delete" on public.hypotheses;

create policy "Hypotheses: authenticated select" on public.hypotheses
  for select using (auth.role() = 'authenticated');

create policy "Hypotheses: authenticated insert" on public.hypotheses
  for insert with check (auth.role() = 'authenticated');

create policy "Hypotheses: authenticated update" on public.hypotheses
  for update using (auth.role() = 'authenticated');

create policy "Hypotheses: authenticated delete" on public.hypotheses
  for delete using (auth.role() = 'authenticated');

drop trigger if exists update_hypotheses_updated_at on public.hypotheses;
create trigger update_hypotheses_updated_at
  before update on public.hypotheses
  for each row execute function update_updated_at_column();
