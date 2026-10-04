-- GOATEDPLUGINS: resources, saved posts foundation, notifications and resource media
-- Run this ONCE in Supabase SQL Editor.

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 80),
  slug text not null unique,
  description_html text not null default '',
  description_text text not null default '',
  icon_url text,
  status text not null default 'published' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.resources enable row level security;
drop policy if exists "Published resources are public" on public.resources;
create policy "Published resources are public" on public.resources for select using (status='published' or auth.uid()=owner_id);
drop policy if exists "Users create own resources" on public.resources;
create policy "Users create own resources" on public.resources for insert to authenticated with check (auth.uid()=owner_id);
drop policy if exists "Owners update resources" on public.resources;
create policy "Owners update resources" on public.resources for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
drop policy if exists "Owners delete resources" on public.resources;
create policy "Owners delete resources" on public.resources for delete to authenticated using (auth.uid()=owner_id);

create table if not exists public.resource_links (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  url text not null,
  position smallint not null check (position between 1 and 4),
  unique(resource_id,position)
);
alter table public.resource_links enable row level security;
drop policy if exists "Resource links public read" on public.resource_links;
create policy "Resource links public read" on public.resource_links for select using (exists(select 1 from public.resources r where r.id=resource_id and (r.status='published' or r.owner_id=auth.uid())));
drop policy if exists "Owners create resource links" on public.resource_links;
create policy "Owners create resource links" on public.resource_links for insert to authenticated with check (exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=auth.uid()));
drop policy if exists "Owners delete resource links" on public.resource_links;
create policy "Owners delete resource links" on public.resource_links for delete to authenticated using (exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=auth.uid()));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('mention','reply','like','comment','message','system')),
  title text not null,
  body text not null default '',
  target_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated using (auth.uid()=user_id);
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Foundation table for Marked Posts. It becomes active once the posts table is added.
create table if not exists public.marked_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
alter table public.marked_posts enable row level security;
drop policy if exists "Users manage own marked posts" on public.marked_posts;
create policy "Users manage own marked posts" on public.marked_posts for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('resource-media','resource-media',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists "Public can view resource media" on storage.objects;
create policy "Public can view resource media" on storage.objects for select using (bucket_id='resource-media');
drop policy if exists "Users upload to own resource folder" on storage.objects;
create policy "Users upload to own resource folder" on storage.objects for insert to authenticated with check (bucket_id='resource-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users update own resource media" on storage.objects;
create policy "Users update own resource media" on storage.objects for update to authenticated using (bucket_id='resource-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own resource media" on storage.objects;
create policy "Users delete own resource media" on storage.objects for delete to authenticated using (bucket_id='resource-media' and (storage.foldername(name))[1]=auth.uid()::text);
