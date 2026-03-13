create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('admin', 'user')),
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  invited_at timestamptz
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create or replace function public.is_email_invited(input_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.invitations
    where email = lower(input_email)
  );
$$;

create or replace function public.apply_invitation_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_role text;
begin
  if auth.uid() is null then
    return;
  end if;

  select role
  into invitation_role
  from public.invitations
  where email = lower(auth.jwt() ->> 'email')
  limit 1;

  if invitation_role is not null then
    update public.profiles
    set role = invitation_role
    where id = auth.uid();
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.tournaments enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
on public.profiles
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "user insert own profile" on public.profiles;
create policy "user insert own profile"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "user update own profile" on public.profiles;
create policy "user update own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "admin read invitations" on public.invitations;
create policy "admin read invitations"
on public.invitations
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "service manage invitations" on public.invitations;
create policy "service manage invitations"
on public.invitations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "select own tournaments" on public.tournaments;
create policy "select own tournaments"
on public.tournaments
for select
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "insert own tournaments" on public.tournaments;
create policy "insert own tournaments"
on public.tournaments
for insert
with check (owner_id = auth.uid());

drop policy if exists "update own tournaments" on public.tournaments;
create policy "update own tournaments"
on public.tournaments
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
