-- Workspaces (must run before 043_default_workspace_on_signup / create_my_default_workspace RPC)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal', 'team')),
  owner_id uuid not null,
  created_at timestamp with time zone default now()
);

-- Workspace members
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text not null check (role in ('owner', 'member')),
  status text not null check (status in ('active', 'invited')),
  invited_email text,
  created_at timestamp with time zone default now(),
  unique (workspace_id, user_id)
);

-- Workspace invites
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('member')),
  token text unique not null,
  expires_at timestamp with time zone not null,
  created_by uuid not null,
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone
);

-- Add workspace_id to outcomes and descendants (decision spaces)
alter table if exists public.outcomes
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table if exists public.opportunities
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table if exists public.solutions
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table if exists public.tests
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table if exists public.evidence_items
  add column if not exists workspace_id uuid references public.workspaces(id);

-- RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.outcomes enable row level security;
alter table public.opportunities enable row level security;
alter table public.solutions enable row level security;
alter table if exists public.tests enable row level security;
alter table if exists public.evidence_items enable row level security;

-- Helper functions to avoid policy recursion
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

-- Workspace access: owner or active member
drop policy if exists "Workspace read" on public.workspaces;
drop policy if exists "Workspace write" on public.workspaces;

create policy "Workspace read" on public.workspaces
  for select using (
    auth.uid() = owner_id
    or public.is_workspace_member(id)
  );

create policy "Workspace write" on public.workspaces
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Workspace members
drop policy if exists "Workspace members read" on public.workspace_members;
drop policy if exists "Workspace members write" on public.workspace_members;

create policy "Workspace members read" on public.workspace_members
  for select using (
    public.is_workspace_member(workspace_members.workspace_id)
  );

create policy "Workspace members write" on public.workspace_members
  for all using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_id = auth.uid()
    )
  );

-- Workspace invites
drop policy if exists "Workspace invites read" on public.workspace_invites;
drop policy if exists "Workspace invites write" on public.workspace_invites;
drop policy if exists "Workspace invites update" on public.workspace_invites;

create policy "Workspace invites read" on public.workspace_invites
  for select using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_invites.workspace_id
        and w.owner_id = auth.uid()
    )
  );

create policy "Workspace invites write" on public.workspace_invites
  for insert with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_invites.workspace_id
        and w.owner_id = auth.uid()
    )
  );

create policy "Workspace invites update" on public.workspace_invites
  for update using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_invites.workspace_id
        and w.owner_id = auth.uid()
    )
  );

-- Outcomes and descendants scoped by workspace membership
drop policy if exists "Outcomes read" on public.outcomes;
drop policy if exists "Outcomes write" on public.outcomes;

create policy "Outcomes read" on public.outcomes
  for select using (
    public.is_workspace_member(outcomes.workspace_id)
    or (outcomes.workspace_id is null and outcomes.owner = auth.uid())
  );

create policy "Outcomes write" on public.outcomes
  for all using (
    public.is_workspace_member(outcomes.workspace_id)
    or (outcomes.workspace_id is null and outcomes.owner = auth.uid())
  ) with check (
    public.is_workspace_member(outcomes.workspace_id)
    or (outcomes.workspace_id is null and outcomes.owner = auth.uid())
  );

drop policy if exists "Opportunities read" on public.opportunities;
drop policy if exists "Opportunities write" on public.opportunities;

create policy "Opportunities read" on public.opportunities
  for select using (
    public.is_workspace_member(opportunities.workspace_id)
    or (opportunities.workspace_id is null and opportunities.owner = auth.uid())
  );

create policy "Opportunities write" on public.opportunities
  for all using (
    public.is_workspace_member(opportunities.workspace_id)
    or (opportunities.workspace_id is null and opportunities.owner = auth.uid())
  )
  with check (
    public.is_workspace_member(opportunities.workspace_id)
    or (opportunities.workspace_id is null and opportunities.owner = auth.uid())
  );

drop policy if exists "Solutions read" on public.solutions;
drop policy if exists "Solutions write" on public.solutions;

create policy "Solutions read" on public.solutions
  for select using (
    public.is_workspace_member(solutions.workspace_id)
    or (solutions.workspace_id is null and solutions.owner = auth.uid())
  );

create policy "Solutions write" on public.solutions
  for all using (
    public.is_workspace_member(solutions.workspace_id)
    or (solutions.workspace_id is null and solutions.owner = auth.uid())
  )
  with check (
    public.is_workspace_member(solutions.workspace_id)
    or (solutions.workspace_id is null and solutions.owner = auth.uid())
  );

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'tests') then
    drop policy if exists "Tests read" on public.tests;
    drop policy if exists "Tests write" on public.tests;
    create policy "Tests read" on public.tests
      for select using (
        public.is_workspace_member(tests.workspace_id)
        or (tests.workspace_id is null and auth.uid() is not null)
      );
    create policy "Tests write" on public.tests
      for all using (
        public.is_workspace_member(tests.workspace_id)
        or (tests.workspace_id is null and auth.uid() is not null)
      ) with check (
        public.is_workspace_member(tests.workspace_id)
        or (tests.workspace_id is null and auth.uid() is not null)
      );
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'evidence_items') then
    drop policy if exists "Evidence read" on public.evidence_items;
    drop policy if exists "Evidence write" on public.evidence_items;
    create policy "Evidence read" on public.evidence_items
      for select using (
        public.is_workspace_member(evidence_items.workspace_id)
        or (evidence_items.workspace_id is null and auth.uid() is not null)
      );
    create policy "Evidence write" on public.evidence_items
      for all using (
        public.is_workspace_member(evidence_items.workspace_id)
        or (evidence_items.workspace_id is null and auth.uid() is not null)
      ) with check (
        public.is_workspace_member(evidence_items.workspace_id)
        or (evidence_items.workspace_id is null and auth.uid() is not null)
      );
  end if;
end $$;

-- Backfill workspace_id for existing personal outcomes (owner personal workspace)
update public.outcomes o
set workspace_id = w.id
from public.workspaces w
where o.workspace_id is null
  and w.type = 'personal'
  and w.owner_id = o.owner;
