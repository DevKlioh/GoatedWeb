-- OrvenSMP V10.10 — Every registered user becomes searchable automatically.
-- Run AFTER V10.9. Covers Email/Password, Discord, Google and future Supabase Auth signups.

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select using (true);

create or replace function public.orven_sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text;
  v_display text;
  v_avatar text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'user_name'),''),
    nullif(trim(new.raw_user_meta_data->>'preferred_username'),''),
    nullif(trim(new.raw_user_meta_data->>'username'),'')
  );
  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'),''),
    nullif(trim(new.raw_user_meta_data->>'name'),''),
    v_username,
    split_part(coalesce(new.email,'OrvenSMP User'),'@',1)
  );
  v_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'),''),
    nullif(trim(new.raw_user_meta_data->>'picture'),'')
  );

  insert into public.profiles(id,username,display_name,avatar_url)
  values(new.id,v_username,v_display,v_avatar)
  on conflict(id) do update set
    username=coalesce(public.profiles.username,excluded.username),
    display_name=coalesce(nullif(public.profiles.display_name,''),excluded.display_name),
    avatar_url=coalesce(public.profiles.avatar_url,excluded.avatar_url);
  return new;
end $$;

drop trigger if exists orven_auth_user_profile_sync on auth.users;
create trigger orven_auth_user_profile_sync
after insert or update of raw_user_meta_data,email on auth.users
for each row execute function public.orven_sync_auth_profile();

-- Backfill EVERY existing Auth account that somehow has no profiles row.
insert into public.profiles(id,username,display_name,avatar_url)
select
 u.id,
 coalesce(nullif(trim(u.raw_user_meta_data->>'user_name'),''),nullif(trim(u.raw_user_meta_data->>'preferred_username'),''),nullif(trim(u.raw_user_meta_data->>'username'),'')),
 coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(u.raw_user_meta_data->>'name'),''),nullif(trim(u.raw_user_meta_data->>'user_name'),''),nullif(trim(u.raw_user_meta_data->>'preferred_username'),''),nullif(trim(u.raw_user_meta_data->>'username'),''),split_part(coalesce(u.email,'OrvenSMP User'),'@',1)),
 coalesce(nullif(trim(u.raw_user_meta_data->>'avatar_url'),''),nullif(trim(u.raw_user_meta_data->>'picture'),''))
from auth.users u
where not exists(select 1 from public.profiles p where p.id=u.id)
on conflict(id) do nothing;

-- Make profile changes available to the live search subscription.
do $$
begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
