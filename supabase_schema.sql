-- Create table for storing user data
create table if not exists user_data (
  username text primary key,
  skips jsonb default '{}'::jsonb,
  manual_canceled jsonb default '{}'::jsonb,
  weekly_schedule jsonb,
  calendar_exceptions jsonb default '[]'::jsonb,
  calendar_skips jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create table for global settings (like default schedule)
create table if not exists global_settings (
  setting_key text primary key,
  setting_value jsonb
);

-- Insert the default schedule into global settings (JSON representation of DEFAULT_SCHEDULE)
-- This is just an example, the app will try to read this.
insert into global_settings (setting_key, setting_value)
values ('default_schedule', '{
  "1": ["mat", "mat", "cj", "cj"],
  "2": ["ivt", "aj", "mat", "nj", "fyz", "tv", "tv"],
  "3": ["sem_cj", "sem_cj", "fyz", "mat", "mat", "nj", "aj"],
  "4": ["nj", "zsv", "cj", "aj", "cj", "sem_mat", "sem_mat"],
  "5": ["aj", "fyz", "mat"]
}'::jsonb)
on conflict (setting_key) do nothing;

-- Enable RLS (Row Level Security) - Optional based on your strictness
-- For now, since auth is weak (only username), we might leave RLS off or open to public for simplicity
-- as per the "enter name" logic.
alter table user_data enable row level security;
alter table global_settings enable row level security;

-- Policies (very open for this specific use case)
create policy "Enable all access for all users" on user_data for all using (true) with check (true);
create policy "Enable read access for all to global settings" on global_settings for select using (true);
