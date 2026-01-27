-- Add test-specific fields to experiments (tests renamed)
alter table if exists public.experiments
  add column if not exists test_template text,
  add column if not exists test_status text,
  add column if not exists success_criteria jsonb,
  add column if not exists result_decision text,
  add column if not exists result_summary text,
  add column if not exists timebox_start timestamp,
  add column if not exists timebox_end timestamp;
