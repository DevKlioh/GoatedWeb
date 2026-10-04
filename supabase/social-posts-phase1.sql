-- GOATEDPLUGINS SOCIAL POSTS — PHASE 1
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 2000),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(content)) > 0 or image_url is not null)
);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_idx on public.posts(author_id);
do $$ begin
  alter table public.posts add constraint posts_author_id_fkey_profiles
    foreign key (author_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.post_comments(id) on delete cascade,
  content text not null check(char_length(trim(content)) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing projects may already have marked_posts from the earlier foundation.
create table if not exists public.marked_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.marked_posts enable row level security;

drop policy if exists "Public reads posts" on public.posts;
create policy "Public reads posts" on public.posts for select using (true);
drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts" on public.posts for insert to authenticated with check(auth.uid()=author_id);
drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts" on public.posts for update to authenticated using(auth.uid()=author_id) with check(auth.uid()=author_id);
drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts" on public.posts for delete to authenticated using(auth.uid()=author_id);

drop policy if exists "Public reads likes" on public.post_likes;
create policy "Public reads likes" on public.post_likes for select using(true);
drop policy if exists "Users like as themselves" on public.post_likes;
create policy "Users like as themselves" on public.post_likes for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users remove own likes" on public.post_likes;
create policy "Users remove own likes" on public.post_likes for delete to authenticated using(auth.uid()=user_id);

drop policy if exists "Public reads comments" on public.post_comments;
create policy "Public reads comments" on public.post_comments for select using(true);
drop policy if exists "Users create own comments" on public.post_comments;
create policy "Users create own comments" on public.post_comments for insert to authenticated with check(auth.uid()=author_id);
drop policy if exists "Users update own comments" on public.post_comments;
create policy "Users update own comments" on public.post_comments for update to authenticated using(auth.uid()=author_id) with check(auth.uid()=author_id);
drop policy if exists "Users delete own comments" on public.post_comments;
create policy "Users delete own comments" on public.post_comments for delete to authenticated using(auth.uid()=author_id);

drop policy if exists "Users read own marks" on public.marked_posts;
create policy "Users read own marks" on public.marked_posts for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users create own marks" on public.marked_posts;
create policy "Users create own marks" on public.marked_posts for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users delete own marks" on public.marked_posts;
create policy "Users delete own marks" on public.marked_posts for delete to authenticated using(auth.uid()=user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('post-media','post-media',true,8388608,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=8388608;

drop policy if exists "Users upload own post media" on storage.objects;
create policy "Users upload own post media" on storage.objects for insert to authenticated
with check(bucket_id='post-media' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users delete own post media" on storage.objects;
create policy "Users delete own post media" on storage.objects for delete to authenticated
using(bucket_id='post-media' and (storage.foldername(name))[1]=auth.uid()::text);
