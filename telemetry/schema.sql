-- Life of Colors telemetry tables (Supabase / Postgres).
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run. Safe to run again.
--
-- Privacy by design: no column can hold personal data. visit_id is a random UUID that the
-- browser keeps in memory only (a reload = new visit). No IP, user agent, device, language,
-- location, cookie or browser clock time is stored; received_at is set by the database.
-- The public (anon/publishable) key may only INSERT; nobody without the secret/service key can
-- read anything.
--
-- Format details (snapshots, click-list encoding): see src/telemetry/telemetry.js.

-- Site activity: one row each time a screen is shown.
create table if not exists public.screen_views (
  id              bigint generated always as identity primary key,
  received_at     timestamptz not null default now(),
  visit_id        uuid not null,
  screen          text not null check (screen in ('home', 'level', 'game')),
  level           integer check (level between 0 and 100),
  instance_id     text check (instance_id ~ '^loc_[0-9a-f]{16}$'),
  pick            text check (pick in ('random', 'grid', 'link')),
  app_version     text check (length(app_version) <= 40),
  catalog_version text check (length(catalog_version) <= 40),
  env             text not null check (env in ('prod', 'dev'))
);

-- Gameplay: snapshot rows of a play (open a puzzle -> leave it; Retry stays in the play).
-- Counters are running totals of the whole play; `clicks` holds only the clicks since the
-- previous snapshot. Latest snapshot per play_id = totals; concatenating `clicks` ordered by
-- `snapshot` = full click list.
create table if not exists public.puzzle_plays (
  id               bigint generated always as identity primary key,
  received_at      timestamptz not null default now(),
  visit_id         uuid not null,
  play_id          uuid not null,
  snapshot         integer not null check (snapshot between 0 and 10000),
  reason           text not null check (reason in ('won', 'hidden', 'back', 'pick_new', 'home')),
  instance_id      text not null check (instance_id ~ '^loc_[0-9a-f]{16}$'),
  level            integer check (level between 0 and 100),
  pick             text check (pick in ('random', 'grid', 'link')),
  app_version      text check (length(app_version) <= 40),
  catalog_version  text check (length(catalog_version) <= 40),
  env              text not null check (env in ('prod', 'dev')),
  active_ms        integer not null check (active_ms >= 0),
  last_click_ms    integer check (last_click_ms >= 0),
  n_clicks         integer not null check (n_clicks between 0 and 10000000),
  n_moves          integer not null check (n_moves between 0 and 10000000),
  n_to_orange      integer not null check (n_to_orange >= 0),
  n_to_blue        integer not null check (n_to_blue >= 0),
  n_to_green       integer not null check (n_to_green >= 0),
  n_to_uncolored   integer not null check (n_to_uncolored >= 0),
  n_restarts       integer not null check (n_restarts between 0 and 1000000),
  n_wins           integer not null check (n_wins between 0 and 1000000),
  best_win_clicks  integer check (best_win_clicks >= 0),
  best_win_moves   integer check (best_win_moves >= 0),
  rules            smallint[] not null check (cardinality(rules) <= 165),
  clicks           integer[] not null check (cardinality(clicks) <= 3000),
  clicks_truncated boolean not null default false,
  unique (play_id, snapshot)
);

create index if not exists screen_views_received_idx  on public.screen_views (received_at);
create index if not exists puzzle_plays_instance_idx  on public.puzzle_plays (instance_id);
create index if not exists puzzle_plays_play_idx      on public.puzzle_plays (play_id);
create index if not exists puzzle_plays_received_idx  on public.puzzle_plays (received_at);

-- Row level security: anonymous visitors may insert, never select/update/delete.
alter table public.screen_views  enable row level security;
alter table public.puzzle_plays  enable row level security;

drop policy if exists "anon insert" on public.screen_views;
create policy "anon insert" on public.screen_views  for insert to anon with check (true);
drop policy if exists "anon insert" on public.puzzle_plays;
create policy "anon insert" on public.puzzle_plays  for insert to anon with check (true);

revoke all on public.screen_views, public.puzzle_plays from anon, authenticated;
grant insert on public.screen_views, public.puzzle_plays to anon;
-- (the service_role used by the factory's pull_stats.py bypasses RLS and can read everything)
