-- OrvenSMP V10.20 — weekly profile picture update
-- Run once in Supabase SQL Editor.

alter table public.profiles
add column if not exists avatar_updated_at timestamptz;

-- Public avatar bucket. The app stores each user's files only under their own UUID folder.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
 public=true,
 file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users upload own profile avatars" on storage.objects;
create policy "Users upload own profile avatars"
on storage.objects for insert to authenticated
with check (
 bucket_id='profile-avatars'
 and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Users delete own profile avatars" on storage.objects;
create policy "Users delete own profile avatars"
on storage.objects for delete to authenticated
using (
 bucket_id='profile-avatars'
 and (storage.foldername(name))[1]=auth.uid()::text
);

-- Cooldown is enforced server-side, so changing browser code cannot bypass it.
create or replace function public.orven_update_profile_avatar(p_avatar_url text)
returns timestamptz
language plpgsql
security definer
set search_path=public
as $$
declare
 v_uid uuid:=auth.uid();
 v_last timestamptz;
 v_now timestamptz:=now();
begin
 if v_uid is null then raise exception 'Not authenticated'; end if;
 if p_avatar_url is null or length(trim(p_avatar_url))=0 then raise exception 'Invalid avatar URL'; end if;

 select avatar_updated_at into v_last
 from public.profiles
 where id=v_uid
 for update;

 if not found then raise exception 'Profile not found'; end if;
 if v_last is not null and v_last + interval '7 days' > v_now then
   raise exception 'Profile picture can only be changed once every 7 days';
 end if;

 update public.profiles
 set avatar_url=trim(p_avatar_url),avatar_updated_at=v_now,updated_at=v_now
 where id=v_uid;
 return v_now;
end $$;

revoke all on function public.orven_update_profile_avatar(text) from public;
grant execute on function public.orven_update_profile_avatar(text) to authenticated;
