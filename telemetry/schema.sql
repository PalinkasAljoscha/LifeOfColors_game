-- Life of Colors telemetry tables (Supabase / Postgres).
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run.
--
-- Privacy by design: no column can hold personal data. session_id is a random UUID that the
-- browser keeps in memory only (a reload = new session). No IP, user agent, device, language,
-- location or cookie is stored. The public (anon/publishable) key may only INSERT; nobody
-- without the secret/service key can read anything.

create table if not exists public.sessions (
  session_id      uuid primary key,
  received_at     timestamptz not null default now(),
  app_version     text not null check (length(app_version) <= 40),
  catalog_version text check (length(catalog_version) <= 40),
  env             text not null check (env in ('prod', 'dev'))
);

create table if not exists public.attempt_segments (
  id                     bigint generated always as identity primary key,
  received_at            timestamptz not null default now(),
  session_id             uuid not null,
  attempt_id             uuid not null,
  segment                integer not null check (segment between 0 and 500),
  attempt_no             integer check (attempt_no between 1 and 100000),
  instance_id            text not null check (instance_id ~ '^loc_[0-9a-f]{16}$'),
  level                  integer check (level between 0 and 100),
  catalog_version        text check (length(catalog_version) <= 40),
  app_version            text check (length(app_version) <= 40),
  env                    text not null check (env in ('prod', 'dev')),
  outcome                text not null check (outcome in ('won', 'retry', 'home', 'hidden')),
  pick                   text check (pick in ('random', 'grid', 'link')),
  started_ms_in_session  integer check (started_ms_in_session >= 0),
  duration_ms            integer check (duration_ms >= 0),
  n_clicks               integer check (n_clicks between 0 and 100000),
  n_changed              integer check (n_changed between 0 and 100000),
  start_board            text[] check (start_board is null or cardinality(start_board) <= 12),
  events                 jsonb not null check (jsonb_typeof(events) = 'array' and pg_column_size(events) < 65536),
  unique (attempt_id, segment)
);

-- Added 2026-10-20 (how the puzzle was chosen). For a database created before that date, this
-- adds the column; run it BEFORE deploying an app version that sends `pick`, otherwise the
-- inserts are rejected. Safe to run again.
alter table public.attempt_segments
  add column if not exists pick text check (pick in ('random', 'grid', 'link'));

create index if not exists attempt_segments_instance_idx on public.attempt_segments (instance_id);
create index if not exists attempt_segments_session_idx  on public.attempt_segments (session_id);

-- Row level security: anonymous visitors may insert, never select/update/delete.
alter table public.sessions          enable row level security;
alter table public.attempt_segments  enable row level security;

drop policy if exists "anon insert" on public.sessions;
create policy "anon insert" on public.sessions          for insert to anon with check (true);
drop policy if exists "anon insert" on public.attempt_segments;
create policy "anon insert" on public.attempt_segments  for insert to anon with check (true);

revoke all on public.sessions, public.attempt_segments from anon, authenticated;
grant insert on public.sessions, public.attempt_segments to anon;
-- (the service_role used by the factory's pull_stats.py bypasses RLS and can read everything)
