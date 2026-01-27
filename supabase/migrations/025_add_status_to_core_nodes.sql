-- Add status fields for outcome tree nodes
alter table public.outcomes
  add column if not exists status text;

alter table public.opportunities
  add column if not exists status text;

alter table public.solutions
  add column if not exists status text;

-- Normalize constraints for allowed statuses (nullable)
alter table public.outcomes
  drop constraint if exists outcomes_status_check;
alter table public.outcomes
  add constraint outcomes_status_check
  check (status in ('idea', 'in_progress', 'validated', 'killed'));

alter table public.opportunities
  drop constraint if exists opportunities_status_check;
alter table public.opportunities
  add constraint opportunities_status_check
  check (status in ('idea', 'in_progress', 'validated', 'killed'));

alter table public.solutions
  drop constraint if exists solutions_status_check;
alter table public.solutions
  add constraint solutions_status_check
  check (status in ('idea', 'in_progress', 'validated', 'killed'));
