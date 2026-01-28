alter table public.opportunities
  add column if not exists contributor_ids uuid[] default '{}';

alter table public.solutions
  add column if not exists contributor_ids uuid[] default '{}';

alter table public.experiments
  add column if not exists contributor_ids uuid[] default '{}';

alter table public.experiment_todos
  add column if not exists assignee_id uuid references auth.users(id) on delete set null;

drop view if exists public.experiment_todos_with_context;

create view public.experiment_todos_with_context as
select
  t.id,
  t.experiment_id,
  t.title,
  t.is_done,
  t.due_date,
  t.created_at,
  t.updated_at,
  t.sort_order,
  t.workspace_id,
  t.assignee_id,
  e.title as experiment_title,
  e.solution_id,
  s.title as solution_title,
  s.opportunity_id,
  o.title as opportunity_title,
  o.workspace_id as opportunity_workspace_id,
  outc.title as outcome_title
from public.experiment_todos t
join public.experiments e on e.id = t.experiment_id
join public.solutions s on s.id = e.solution_id
join public.opportunities o on o.id = s.opportunity_id
left join public.outcomes outc on outc.id = o.outcome_id;
