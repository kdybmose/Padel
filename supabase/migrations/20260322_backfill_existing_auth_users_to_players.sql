insert into public.players (owner_id, name, linked_email)
select
  admin_profile.id as owner_id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(split_part(lower(u.email), '@', 1)), ''),
    lower(u.email)
  ) as name,
  lower(u.email) as linked_email
from auth.users u
join public.profiles profile on profile.id = u.id
join public.profiles admin_profile on lower(admin_profile.email) = 'dybmose@hotmail.com'
left join public.players existing_player on lower(existing_player.linked_email) = lower(u.email)
where u.email is not null
  and lower(u.email) <> 'dybmose@hotmail.com'
  and existing_player.id is null
on conflict (owner_id, name) do update
set linked_email = excluded.linked_email,
    updated_at = now();
