-- ============================================================
--  Skupinový plánovač výletů – JEDEN univerzální kalendář
--  Bez zakládání výletů. Každý vyznačí svůj čas → překryvy.
-- ============================================================

-- Drop legacy tables
drop table if exists global_settings cascade;
drop table if exists user_data cascade;
drop table if exists final_vote cascade;
drop table if exists veto cascade;
drop table if exists preference cascade;
drop table if exists option cascade;
drop table if exists availability cascade;
drop table if exists participant cascade;
drop table if exists idea_vote cascade;
drop table if exists idea cascade;
drop table if exists trip cascade;

-- Participant (kdokoli, kdo vyznačí čas) --------------------
create table participant (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  ideal_days      int not null default 3,   -- "kolik dní mi sedí" (slider)
  created_at      timestamptz default now()
);

-- Availability (per den, 4 stavy) ---------------------------
create table availability (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participant(id) on delete cascade,
  day             date not null,
  weight          text not null check (weight in ('ideal','ok','rather_no','no_go')),
  unique(participant_id, day)
);

-- Idea (nápad na destinaci) ---------------------------------
create table idea (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  emoji           text not null default '📍',
  created_by      uuid references participant(id) on delete set null,
  created_at      timestamptz default now()
);

-- Idea vote (👍 / 👎) ---------------------------------------
create table idea_vote (
  idea_id         uuid not null references idea(id) on delete cascade,
  participant_id  uuid not null references participant(id) on delete cascade,
  value           text not null check (value in ('up','down')),
  primary key (idea_id, participant_id)
);

-- RLS: open (no auth) ---------------------------------------
alter table participant   enable row level security;
alter table availability  enable row level security;
alter table idea          enable row level security;
alter table idea_vote     enable row level security;

create policy "open" on participant   for all using (true) with check (true);
create policy "open" on availability  for all using (true) with check (true);
create policy "open" on idea          for all using (true) with check (true);
create policy "open" on idea_vote     for all using (true) with check (true);

-- Předvyplněné nápady ---------------------------------------
insert into idea (title, emoji) values
  ('Chata v Česku', '🏡'),
  ('Chorvatsko – moře', '🏖️'),
  ('Roadtrip', '🚐'),
  ('Hory & turistika', '⛰️'),
  ('Eurovíkend ve městě', '🏙️');
