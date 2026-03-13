create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  linked_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists public.active_tournaments (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists active_tournaments_set_updated_at on public.active_tournaments;
create trigger active_tournaments_set_updated_at
before update on public.active_tournaments
for each row execute function public.set_updated_at();

alter table public.players enable row level security;
alter table public.active_tournaments enable row level security;

drop policy if exists "select own players" on public.players;
create policy "select own players"
on public.players
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "insert own players" on public.players;
create policy "insert own players"
on public.players
for insert
with check (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "update own players" on public.players;
create policy "update own players"
on public.players
for update
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "delete own players" on public.players;
create policy "delete own players"
on public.players
for delete
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "select own active_tournament" on public.active_tournaments;
create policy "select own active_tournament"
on public.active_tournaments
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "upsert own active_tournament" on public.active_tournaments;
create policy "upsert own active_tournament"
on public.active_tournaments
for all
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
