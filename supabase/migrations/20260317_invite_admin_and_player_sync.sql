create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  invitation_role text;
  admin_profile_id uuid;
  display_name text;
begin
  normalized_email := lower(new.email);

  if normalized_email <> 'dybmose@hotmail.com' then
    select role
    into invitation_role
    from public.invitations
    where email = normalized_email
    limit 1;

    if invitation_role is null then
      raise exception 'Email er ikke inviteret til platformen';
    end if;
  else
    invitation_role := 'admin';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, normalized_email, invitation_role)
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role;

  if normalized_email <> 'dybmose@hotmail.com' then
    select id
    into admin_profile_id
    from public.profiles
    where email = 'dybmose@hotmail.com'
    limit 1;

    if admin_profile_id is not null then
      display_name := split_part(normalized_email, '@', 1);
      insert into public.players (owner_id, name, linked_email)
      values (admin_profile_id, display_name, normalized_email)
      on conflict (owner_id, name) do update
        set linked_email = excluded.linked_email,
            updated_at = now();
    end if;
  end if;

  return new;
end;
$$;

update public.profiles
set role = case when lower(email) = 'dybmose@hotmail.com' then 'admin' else 'user' end;

insert into public.invitations (email, role, invited_at)
values ('dybmose@hotmail.com', 'admin', now())
on conflict (email) do update set role = excluded.role;

-- Kun admin må kunne oprette/ændre turneringer.
drop policy if exists "insert own tournaments" on public.tournaments;
create policy "admin insert tournaments"
on public.tournaments
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "update own tournaments" on public.tournaments;
create policy "admin update tournaments"
on public.tournaments
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Kun admin må kunne ændre spillerdatabasen.
drop policy if exists "insert own players" on public.players;
create policy "admin insert players"
on public.players
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "update own players" on public.players;
create policy "admin update players"
on public.players
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "delete own players" on public.players;
create policy "admin delete players"
on public.players
for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
