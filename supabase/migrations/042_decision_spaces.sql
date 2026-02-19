-- Decision spaces (must run before 043_default_workspace_on_signup RPC)
create table if not exists public.decision_spaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.decision_spaces enable row level security;

drop policy if exists "Decision spaces read" on public.decision_spaces;
drop policy if exists "Decision spaces write" on public.decision_spaces;

create policy "Decision spaces read" on public.decision_spaces
  for select using (public.is_workspace_member(decision_spaces.workspace_id));

create policy "Decision spaces write" on public.decision_spaces
  for all using (public.is_workspace_member(decision_spaces.workspace_id))
  with check (public.is_workspace_member(decision_spaces.workspace_id));

alter table public.outcomes
  add column if not exists decision_space_id uuid references public.decision_spaces(id);

-- Backfill decision spaces and assign existing outcomes
insert into public.decision_spaces (workspace_id, name)
select distinct w.id, 'Default'
from public.workspaces w
where not exists (
  select 1 from public.decision_spaces ds where ds.workspace_id = w.id
);

update public.outcomes o
set decision_space_id = ds.id
from public.decision_spaces ds
where o.decision_space_id is null
  and o.workspace_id = ds.workspace_id;
