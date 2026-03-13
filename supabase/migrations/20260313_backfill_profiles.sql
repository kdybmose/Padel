insert into public.profiles (id, email)
select u.id, lower(u.email)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
  and u.email is not null;
