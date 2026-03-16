create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_state_set_updated_at on public.app_state;
create trigger app_state_set_updated_at
before update on public.app_state
for each row execute function public.set_updated_at();

alter table public.app_state enable row level security;

drop policy if exists "public read app_state" on public.app_state;
create policy "public read app_state"
on public.app_state
for select
using (true);

drop policy if exists "public upsert app_state" on public.app_state;
create policy "public upsert app_state"
on public.app_state
for all
using (true)
with check (true);
