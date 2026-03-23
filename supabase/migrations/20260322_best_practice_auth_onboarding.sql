create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  resolved_role text;
begin
  normalized_email := lower(new.email);

  select i.role
  into resolved_role
  from public.invitations i
  where i.email = normalized_email
  limit 1;

  if normalized_email = 'dybmose@hotmail.com' then
    resolved_role := 'admin';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, normalized_email, coalesce(resolved_role, 'user'))
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role;

  return new;
end;
$$;
