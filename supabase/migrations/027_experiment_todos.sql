-- Experiment todos
create table if not exists public.experiment_todos (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sort_order int not null default 0
);

create index if not exists experiment_todos_experiment_sort_idx
  on public.experiment_todos (experiment_id, sort_order);

create index if not exists experiment_todos_experiment_created_idx
  on public.experiment_todos (experiment_id, created_at);

alter table public.experiment_todos enable row level security;

drop policy if exists "Experiment todos: authenticated select" on public.experiment_todos;
drop policy if exists "Experiment todos: authenticated insert" on public.experiment_todos;
drop policy if exists "Experiment todos: authenticated update" on public.experiment_todos;
drop policy if exists "Experiment todos: authenticated delete" on public.experiment_todos;

create policy "Experiment todos: authenticated select" on public.experiment_todos
  for select using (auth.role() = 'authenticated');

create policy "Experiment todos: authenticated insert" on public.experiment_todos
  for insert with check (auth.role() = 'authenticated');

create policy "Experiment todos: authenticated update" on public.experiment_todos
  for update using (auth.role() = 'authenticated');

create policy "Experiment todos: authenticated delete" on public.experiment_todos
  for delete using (auth.role() = 'authenticated');

drop trigger if exists update_experiment_todos_updated_at on public.experiment_todos;
create trigger update_experiment_todos_updated_at
  before update on public.experiment_todos
  for each row execute function update_updated_at_column();
