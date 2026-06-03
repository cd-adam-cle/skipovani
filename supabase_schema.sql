-- Drop old tables
drop table if exists global_settings cascade;
drop table if exists user_data cascade;

-- Trip
create table if not exists trip (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  organizer_name  text not null,
  horizon_start   date not null,
  horizon_end     date not null,
  length_min      int not null,
  length_max      int not null,
  share_slug      text unique not null,
  status          text not null default 'collecting' check (status in ('collecting','shortlist','decided')),
  created_at      timestamptz default now()
);

-- Participant
create table if not exists participant (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references trip(id) on delete cascade,
  name            text not null,
  has_submitted   bool default false,
  veto_budget     int default 2,
  created_at      timestamptz default now()
);

-- Availability
create table if not exists availability (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participant(id) on delete cascade,
  day             date not null,
  weight          text not null check (weight in ('ideal','ok','rather_no','no_go')),
  unique(participant_id, day)
);

-- Preference
create table if not exists preference (
  participant_id  uuid primary key references participant(id) on delete cascade,
  axes            jsonb not null default '{}',
  budget_max      int not null default 0,
  max_travel_h    int,
  fly_ok          bool default true
);

-- Option (hybrid: global catalog or trip-specific)
create table if not exists option (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid references trip(id) on delete cascade,
  name            text not null,
  tags            jsonb not null default '{}',
  est_cost        int not null default 0,
  season_tags     text[] not null default '{}',
  created_by      uuid references participant(id),
  created_at      timestamptz default now()
);

-- Veto
create table if not exists veto (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participant(id) on delete cascade,
  target_type     text not null check (target_type in ('option','date_window')),
  target_ref      text not null
);

-- Final vote
create table if not exists final_vote (
  participant_id  uuid not null references participant(id) on delete cascade,
  proposal_key    text not null,
  value           text not null check (value in ('up','down')),
  primary key (participant_id, proposal_key)
);

-- RLS: open for now (no auth)
alter table trip enable row level security;
alter table participant enable row level security;
alter table availability enable row level security;
alter table preference enable row level security;
alter table option enable row level security;
alter table veto enable row level security;
alter table final_vote enable row level security;

create policy "open" on trip for all using (true) with check (true);
create policy "open" on participant for all using (true) with check (true);
create policy "open" on availability for all using (true) with check (true);
create policy "open" on preference for all using (true) with check (true);
create policy "open" on option for all using (true) with check (true);
create policy "open" on veto for all using (true) with check (true);
create policy "open" on final_vote for all using (true) with check (true);
