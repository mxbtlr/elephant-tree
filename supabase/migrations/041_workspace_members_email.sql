-- Add email + pending status to workspace_members
alter table public.workspace_members
  add column if not exists email text;

alter table public.workspace_members
  drop constraint if exists workspace_members_status_check;

update public.workspace_members
set status = coalesce(status, 'active')
where status is null or status = 'invited';

alter table public.workspace_members
  add constraint workspace_members_status_check
  check (status in ('active', 'pending'));

-- Normalize existing rows
update public.workspace_members
set status = coalesce(status, 'active');

-- Ensure every workspace owner is a member
insert into public.workspace_members (workspace_id, user_id, role, status, email)
select w.id,
       w.owner_id,
       'owner',
       'active',
       lower(coalesce(p.email, u.email))
from public.workspaces w
left join public.workspace_members wm
  on wm.workspace_id = w.id and wm.user_id = w.owner_id
left join public.profiles p
  on p.id = w.owner_id
left join auth.users u
  on u.id = w.owner_id
where wm.id is null;

update public.workspace_members wm
set email = lower(p.email)
from public.profiles p
where wm.user_id = p.id
  and (wm.email is null or wm.email = '');

update public.workspace_members wm
set email = lower(u.email)
from auth.users u
where wm.user_id = u.id
  and (wm.email is null or wm.email = '');

update public.workspace_members
set email = concat('missing-email+', id, '@example.invalid')
where email is null;

-- Constraints / indexes
alter table public.workspace_members
  alter column email set not null;

create unique index if not exists workspace_members_workspace_email_uniq
  on public.workspace_members (workspace_id, lower(email));

create unique index if not exists workspace_members_workspace_user_uniq
  on public.workspace_members (workspace_id, user_id)
  where user_id is not null;

-- Helper: owner check
create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  );
$$;

-- Adjust RLS on workspace_members for add-by-email
drop policy if exists "Workspace members read" on public.workspace_members;
drop policy if exists "Workspace members write" on public.workspace_members;

create policy "Workspace members read" on public.workspace_members
  for select using (
    public.is_workspace_member(workspace_members.workspace_id)
  );

create policy "Workspace members write" on public.workspace_members
  for all using (
    public.is_workspace_owner(workspace_members.workspace_id)
  ) with check (
    public.is_workspace_owner(workspace_members.workspace_id)
  );
