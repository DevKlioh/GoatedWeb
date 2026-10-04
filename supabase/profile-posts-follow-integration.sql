-- GOATEDPLUGINS — PROFILE / POSTS / FOLLOW INTEGRATION
-- Run after social-posts-phase1.sql.

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),
  constraint cannot_follow_self check(follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists follows_follower_idx on public.follows(follower_id);
alter table public.follows enable row level security;

drop policy if exists "Public reads follows" on public.follows;
create policy "Public reads follows" on public.follows for select using(true);
drop policy if exists "Users follow as themselves" on public.follows;
create policy "Users follow as themselves" on public.follows for insert to authenticated with check(auth.uid()=follower_id and follower_id<>following_id);
drop policy if exists "Users unfollow as themselves" on public.follows;
create policy "Users unfollow as themselves" on public.follows for delete to authenticated using(auth.uid()=follower_id);

-- Ensure edit/delete remain owner-only even if older policies changed.
drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts" on public.posts for update to authenticated using(auth.uid()=author_id) with check(auth.uid()=author_id);
drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts" on public.posts for delete to authenticated using(auth.uid()=author_id);
