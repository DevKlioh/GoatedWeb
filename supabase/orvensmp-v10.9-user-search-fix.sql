-- OrvenSMP V10.9 — Registered-user search/profile access fix
-- Safe to run once on the existing database.

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

-- Backfill a display name for older OAuth/email accounts whose profile row exists
-- but whose display_name was never populated. This makes those registered users searchable.
update public.profiles p
set display_name = coalesce(
  nullif(trim(u.raw_user_meta_data->>'full_name'),''),
  nullif(trim(u.raw_user_meta_data->>'name'),''),
  nullif(trim(u.raw_user_meta_data->>'user_name'),''),
  nullif(trim(u.raw_user_meta_data->>'preferred_username'),'')
)
from auth.users u
where p.id=u.id
  and nullif(trim(coalesce(p.display_name,'')),'') is null
  and coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    nullif(trim(u.raw_user_meta_data->>'user_name'),''),
    nullif(trim(u.raw_user_meta_data->>'preferred_username'),'')
  ) is not null;
