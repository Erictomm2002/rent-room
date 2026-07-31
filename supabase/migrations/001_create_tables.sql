create table rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  user_id uuid references auth.users not null default auth.uid(),
  created_at timestamptz default now()
);

create table staff (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  rate integer not null,
  user_id uuid references auth.users not null default auth.uid(),
  created_at timestamptz default now()
);

create table active_sessions (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  staff_id uuid references staff(id) on delete cascade not null,
  start_time timestamptz not null default now(),
  user_id uuid references auth.users not null default auth.uid()
);

create table completed_sessions (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) not null,
  staff_id uuid references staff(id) not null,
  room_name text not null,
  staff_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  hours real not null,
  amount integer not null,
  user_id uuid references auth.users not null default auth.uid(),
  created_at timestamptz default now()
);

alter table rooms enable row level security;
alter table staff enable row level security;
alter table active_sessions enable row level security;
alter table completed_sessions enable row level security;

create policy "Users can manage their own rooms"
  on rooms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own staff"
  on staff for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own active sessions"
  on active_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own completed sessions"
  on completed_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
