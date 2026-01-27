-- Daily Work + Dashboard support
alter table if exists public.experiments
  add column if not exists completed_at timestamptz;

alter table if exists public.tests
  add column if not exists type text,
  add column if not exists hypothesis_id uuid references public.hypotheses(id) on delete set null;

create or replace function public.set_experiment_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.result_decision is not null and (old.result_decision is distinct from new.result_decision) then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists set_experiment_completed_at on public.experiments;
create trigger set_experiment_completed_at
  before update of result_decision
  on public.experiments
  for each row execute function public.set_experiment_completed_at();

alter table if exists public.experiment_todos
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create or replace function public.set_experiment_todo_workspace_id()
returns trigger
language plpgsql
as $$
begin
  select o.workspace_id into new.workspace_id
  from public.experiments e
  join public.solutions s on s.id = e.solution_id
  join public.opportunities o on o.id = s.opportunity_id
  where e.id = new.experiment_id;
  return new;
end;
$$;

drop trigger if exists set_experiment_todo_workspace_id on public.experiment_todos;
create trigger set_experiment_todo_workspace_id
  before insert on public.experiment_todos
  for each row execute function public.set_experiment_todo_workspace_id();

update public.experiment_todos t
set workspace_id = o.workspace_id
from public.experiments e
join public.solutions s on s.id = e.solution_id
join public.opportunities o on o.id = s.opportunity_id
where t.workspace_id is null
  and t.experiment_id = e.id;

create index if not exists experiment_todos_workspace_done_due_idx
  on public.experiment_todos (workspace_id, is_done, due_date);

create index if not exists experiments_completed_at_idx
  on public.experiments (completed_at);

create index if not exists hypotheses_status_idx
  on public.hypotheses (status);

create index if not exists opportunities_validation_state_idx
  on public.opportunities (validation_state);

drop policy if exists "Experiment todos: authenticated select" on public.experiment_todos;
drop policy if exists "Experiment todos: authenticated insert" on public.experiment_todos;
drop policy if exists "Experiment todos: authenticated update" on public.experiment_todos;
drop policy if exists "Experiment todos: authenticated delete" on public.experiment_todos;

create policy "Experiment todos: select" on public.experiment_todos
  for select using (public.is_workspace_member(experiment_todos.workspace_id));

create policy "Experiment todos: insert" on public.experiment_todos
  for insert with check (public.is_workspace_member(experiment_todos.workspace_id));

create policy "Experiment todos: update" on public.experiment_todos
  for update using (public.is_workspace_member(experiment_todos.workspace_id));

create policy "Experiment todos: delete" on public.experiment_todos
  for delete using (public.is_workspace_member(experiment_todos.workspace_id));

create or replace view public.experiment_todos_with_context as
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

create or replace function public.get_decision_health_metrics(target_workspace_id uuid)
returns table(
  unvalidated_hypotheses int,
  running_experiments int,
  blocked_experiments int,
  validated_opportunities int,
  avg_time_to_decision_days numeric,
  tests_completed_last_7 int,
  todos_completed_last_7 int
)
language sql
security definer
set search_path = public
as $$
select
  (select count(*)
   from public.hypotheses h
   join public.opportunities o on o.id = h.opportunity_id
   where o.workspace_id = target_workspace_id
     and h.status in ('untested','inconclusive')
     and public.is_workspace_member(target_workspace_id)) as unvalidated_hypotheses,
  (select count(*)
   from public.experiments e
   join public.solutions s on s.id = e.solution_id
   join public.opportunities o on o.id = s.opportunity_id
   where o.workspace_id = target_workspace_id
     and coalesce(e.test_status, e.status) in ('planned','running','blocked')
     and public.is_workspace_member(target_workspace_id)) as running_experiments,
  (select count(*)
   from public.experiments e
   join public.solutions s on s.id = e.solution_id
   join public.opportunities o on o.id = s.opportunity_id
   where o.workspace_id = target_workspace_id
     and coalesce(e.test_status, e.status) = 'blocked'
     and public.is_workspace_member(target_workspace_id)) as blocked_experiments,
  (select count(*)
   from public.opportunities o
   where o.workspace_id = target_workspace_id
     and o.validation_state = 'validated'
     and public.is_workspace_member(target_workspace_id)) as validated_opportunities,
  (select avg(extract(epoch from (e.completed_at - e.created_at)) / 86400.0)
   from public.experiments e
   join public.solutions s on s.id = e.solution_id
   join public.opportunities o on o.id = s.opportunity_id
   where o.workspace_id = target_workspace_id
     and e.completed_at is not null
     and public.is_workspace_member(target_workspace_id)) as avg_time_to_decision_days,
  (select count(*)
   from public.experiments e
   join public.solutions s on s.id = e.solution_id
   join public.opportunities o on o.id = s.opportunity_id
   where o.workspace_id = target_workspace_id
     and e.completed_at >= now() - interval '7 days'
     and public.is_workspace_member(target_workspace_id)) as tests_completed_last_7,
  (select count(*)
   from public.experiment_todos t
   where t.workspace_id = target_workspace_id
     and t.is_done = true
     and t.updated_at >= now() - interval '7 days'
     and public.is_workspace_member(target_workspace_id)) as todos_completed_last_7;
$$;

create or replace function public.get_at_risk_opportunities(target_workspace_id uuid)
returns table(
  opportunity_id uuid,
  opportunity_title text,
  unvalidated_count int
)
language sql
security definer
set search_path = public
as $$
select
  o.id,
  o.title,
  count(*) as unvalidated_count
from public.hypotheses h
join public.opportunities o on o.id = h.opportunity_id
where o.workspace_id = target_workspace_id
  and h.status in ('untested','inconclusive')
  and public.is_workspace_member(target_workspace_id)
group by o.id, o.title
order by unvalidated_count desc
limit 5;
$$;
