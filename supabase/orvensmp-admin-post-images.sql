-- ORVENSMP CONVERSION: admin-only resources + up to 5 post images (5 MB each)
-- Run after the previous GoatedPlugins migrations.

alter table public.profiles add column if not exists role text not null default 'member';
do $$ begin alter table public.profiles add constraint profiles_role_check check(role in ('member','admin')); exception when duplicate_object then null; end $$;

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=uid and role='admin');
$$;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- Resource rows are readable publicly when published, but only admins can create/change/delete them.
drop policy if exists "Users create own resources" on public.resources;
drop policy if exists "Owners update resources" on public.resources;
drop policy if exists "Owners delete resources" on public.resources;
drop policy if exists "Admins create resources" on public.resources;
create policy "Admins create resources" on public.resources for insert to authenticated with check(public.is_admin() and auth.uid()=owner_id);
drop policy if exists "Admins update resources" on public.resources;
create policy "Admins update resources" on public.resources for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Admins delete resources" on public.resources;
create policy "Admins delete resources" on public.resources for delete to authenticated using(public.is_admin());

-- Resource links/media/files are admin-only writes.
drop policy if exists "Owners create resource links" on public.resource_links;
drop policy if exists "Owners delete resource links" on public.resource_links;
drop policy if exists "Admins create resource links" on public.resource_links;
create policy "Admins create resource links" on public.resource_links for insert to authenticated with check(public.is_admin());
drop policy if exists "Admins delete resource links" on public.resource_links;
create policy "Admins delete resource links" on public.resource_links for delete to authenticated using(public.is_admin());

drop policy if exists "Users upload to own resource folder" on storage.objects;
drop policy if exists "Users update own resource media" on storage.objects;
drop policy if exists "Users delete own resource media" on storage.objects;
drop policy if exists "Admins upload resource media" on storage.objects;
create policy "Admins upload resource media" on storage.objects for insert to authenticated with check(bucket_id='resource-media' and public.is_admin());
drop policy if exists "Admins update resource media" on storage.objects;
create policy "Admins update resource media" on storage.objects for update to authenticated using(bucket_id='resource-media' and public.is_admin());
drop policy if exists "Admins delete resource media" on storage.objects;
create policy "Admins delete resource media" on storage.objects for delete to authenticated using(bucket_id='resource-media' and public.is_admin());

drop policy if exists "Users upload own free resource files" on storage.objects;
drop policy if exists "Users upload own premium resource files" on storage.objects;
drop policy if exists "Owners manage free resource files" on storage.objects;
drop policy if exists "Owners manage premium resource files" on storage.objects;
drop policy if exists "Admins upload free resource files" on storage.objects;
create policy "Admins upload free resource files" on storage.objects for insert to authenticated with check(bucket_id='free-resource-files' and public.is_admin());
drop policy if exists "Admins upload premium resource files" on storage.objects;
create policy "Admins upload premium resource files" on storage.objects for insert to authenticated with check(bucket_id='premium-resource-files' and public.is_admin());
drop policy if exists "Admins delete free resource files" on storage.objects;
create policy "Admins delete free resource files" on storage.objects for delete to authenticated using(bucket_id='free-resource-files' and public.is_admin());
drop policy if exists "Admins delete premium resource files" on storage.objects;
create policy "Admins delete premium resource files" on storage.objects for delete to authenticated using(bucket_id='premium-resource-files' and public.is_admin());

-- Multi-image posts. Existing posts keep posts.image_url for backward compatibility.
create table if not exists public.post_images(
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
 image_url text not null, position smallint not null default 0 check(position between 0 and 4), created_at timestamptz not null default now(),
 unique(post_id,position)
);
alter table public.post_images enable row level security;
drop policy if exists "Public reads post images" on public.post_images;
create policy "Public reads post images" on public.post_images for select using(true);
drop policy if exists "Authors add post images" on public.post_images;
create policy "Authors add post images" on public.post_images for insert to authenticated with check(exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));
drop policy if exists "Authors delete post images" on public.post_images;
create policy "Authors delete post images" on public.post_images for delete to authenticated using(exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));

-- Enforce 5 MB per uploaded post image at Storage level.
update storage.buckets set file_size_limit=5242880 where id='post-media';

-- Promote YOUR account after replacing the email below, then run only this UPDATE line separately:
-- update public.profiles set role='admin' where id=(select id from auth.users where lower(email)=lower('YOUR_EMAIL_HERE'));
