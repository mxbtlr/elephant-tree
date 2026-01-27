-- Experiment type + hypothesis linkage + opportunity validation
alter table if exists public.experiments
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

alter table if exists public.experiments
  alter column type set default 'custom';

update public.experiments
set type = 'custom'
where type is null;

create index if not exists experiments_hypothesis_idx on public.experiments (hypothesis_id);
create index if not exists experiments_opportunity_created_idx on public.experiments (opportunity_id, created_at);

alter table if exists public.opportunities
  add column if not exists validation_state text default 'in_progress';

alter table if exists public.hypotheses
  drop constraint if exists hypotheses_status_check;

alter table if exists public.hypotheses
  add constraint hypotheses_status_check
  check (status in ('untested', 'supported', 'disproven', 'inconclusive'));

update public.hypotheses
set status = 'untested'
where status is null;

create or replace function public.set_experiment_opportunity_id()
returns trigger
language plpgsql
as $$
begin
  if new.solution_id is not null then
    select opportunity_id into new.opportunity_id
    from public.solutions
    where id = new.solution_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_experiment_opportunity_id on public.experiments;
create trigger set_experiment_opportunity_id
  before insert or update of solution_id
  on public.experiments
  for each row execute function public.set_experiment_opportunity_id();

create or replace function public.recompute_hypothesis_status(target_hypothesis_id uuid)
returns void
language plpgsql
as $$
declare
  total_tests int;
  pass_count int;
  kill_count int;
begin
  if target_hypothesis_id is null then
    return;
  end if;

  select count(*) into total_tests
  from public.experiments
  where hypothesis_id = target_hypothesis_id;

  select count(*) into pass_count
  from public.experiments
  where hypothesis_id = target_hypothesis_id
    and lower(coalesce(result_decision, '')) = 'pass';

  select count(*) into kill_count
  from public.experiments
  where hypothesis_id = target_hypothesis_id
    and lower(coalesce(result_decision, '')) = 'kill';

  if total_tests = 0 then
    update public.hypotheses set status = 'untested' where id = target_hypothesis_id;
  elsif kill_count > 0 then
    update public.hypotheses set status = 'disproven' where id = target_hypothesis_id;
  elsif pass_count = total_tests then
    update public.hypotheses set status = 'supported' where id = target_hypothesis_id;
  else
    update public.hypotheses set status = 'inconclusive' where id = target_hypothesis_id;
  end if;
end;
$$;

create or replace function public.recompute_opportunity_validation(target_opportunity_id uuid)
returns void
language plpgsql
as $$
declare
  total_hypotheses int;
  supported_hypotheses int;
  hypotheses_with_tests int;
begin
  if target_opportunity_id is null then
    return;
  end if;

  select count(*) into total_hypotheses
  from public.hypotheses
  where opportunity_id = target_opportunity_id;

  select count(*) into supported_hypotheses
  from public.hypotheses
  where opportunity_id = target_opportunity_id
    and status = 'supported';

  select count(distinct h.id) into hypotheses_with_tests
  from public.hypotheses h
  join public.experiments e on e.hypothesis_id = h.id
  where h.opportunity_id = target_opportunity_id;

  if total_hypotheses > 0
     and supported_hypotheses = total_hypotheses
     and hypotheses_with_tests = total_hypotheses then
    update public.opportunities set validation_state = 'validated'
    where id = target_opportunity_id;
  else
    update public.opportunities set validation_state = 'in_progress'
    where id = target_opportunity_id;
  end if;
end;
$$;

create or replace function public.handle_experiment_hypothesis_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_hypothesis_status(old.hypothesis_id);
    perform public.recompute_opportunity_validation(old.opportunity_id);
    return null;
  end if;
  perform public.recompute_hypothesis_status(old.hypothesis_id);
  perform public.recompute_hypothesis_status(new.hypothesis_id);
  perform public.recompute_opportunity_validation(old.opportunity_id);
  perform public.recompute_opportunity_validation(new.opportunity_id);
  return null;
end;
$$;

drop trigger if exists experiments_hypothesis_recompute on public.experiments;
create trigger experiments_hypothesis_recompute
  after insert or update of result_decision, hypothesis_id, opportunity_id or delete
  on public.experiments
  for each row execute function public.handle_experiment_hypothesis_change();

create or replace function public.handle_hypothesis_change()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_opportunity_validation(coalesce(new.opportunity_id, old.opportunity_id));
  return null;
end;
$$;

drop trigger if exists hypotheses_opportunity_recompute on public.hypotheses;
create trigger hypotheses_opportunity_recompute
  after insert or update or delete
  on public.hypotheses
  for each row execute function public.handle_hypothesis_change();
