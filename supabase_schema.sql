-- Run this once in Supabase: Project > SQL Editor > New query > paste > Run

create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  title text not null,
  goal text not null,
  mgr_name text,
  mgr_disp text,
  group_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  framework text not null,
  concepts jsonb not null default '[]',
  plan jsonb not null default '{}',
  transcript jsonb not null default '[]',
  summary_tags jsonb not null default '[]',
  outcome text,
  status text not null default 'in-progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table scenarios enable row level security;
alter table attempts enable row level security;

-- Each person can only ever see/insert/update/delete their own rows.
create policy "Users manage own scenarios" on scenarios
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own attempts" on attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists attempts_scenario_id_idx on attempts (scenario_id);
create index if not exists scenarios_group_key_idx on scenarios (group_key);

-- Added later: optional scenario context (company size/culture, employee experience)
-- used to ground the AI plan and the manager's negotiating room. Safe to re-run —
-- each statement is a no-op if the column already exists.
alter table scenarios add column if not exists company_size text;
alter table scenarios add column if not exists years_experience text;
alter table scenarios add column if not exists company_culture text;
