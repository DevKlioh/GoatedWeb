-- OrvenSMP V9.2 — REAL-TIME SOCIAL NOTIFICATIONS
-- Run ONCE in Supabase SQL Editor. Safe to re-run.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text not null default '',
  target_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications add column if not exists entity_id uuid;
create index if not exists notifications_user_unread_idx on public.notifications(user_id,is_read,created_at desc);
create unique index if not exists notifications_social_dedupe_idx on public.notifications(user_id,actor_id,type,entity_id) where entity_id is not null;
alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

create or replace function public.orven_actor_name(uid uuid) returns text language sql stable security definer set search_path=public as $$
 select coalesce(nullif(display_name,''),nullif(username,''),'Someone') from public.profiles where id=uid limit 1
$$;

create or replace function public.orven_notify_like() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; actor text;
begin
 select author_id into owner from public.posts where id=new.post_id;
 if owner is null or owner=new.user_id then return new; end if;
 actor:=public.orven_actor_name(new.user_id);
 insert into public.notifications(user_id,actor_id,type,title,body,target_url,entity_id)
 values(owner,new.user_id,'like','New like',actor||' liked your post.','/?post='||new.post_id,new.post_id)
 on conflict do nothing; return new;
end $$;
create or replace function public.orven_unnotify_like() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; begin select author_id into owner from public.posts where id=old.post_id; delete from public.notifications where user_id=owner and actor_id=old.user_id and type='like' and entity_id=old.post_id; return old; end $$;

drop trigger if exists orven_like_notification on public.post_likes;
create trigger orven_like_notification after insert on public.post_likes for each row execute function public.orven_notify_like();
drop trigger if exists orven_unlike_notification on public.post_likes;
create trigger orven_unlike_notification after delete on public.post_likes for each row execute function public.orven_unnotify_like();

create or replace function public.orven_notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid; actor text; post_owner uuid;
begin
 actor:=public.orven_actor_name(new.author_id); select author_id into post_owner from public.posts where id=new.post_id;
 if new.parent_id is not null then
   select author_id into recipient from public.post_comments where id=new.parent_id;
   if recipient is not null and recipient<>new.author_id then
    insert into public.notifications(user_id,actor_id,type,title,body,target_url,entity_id) values(recipient,new.author_id,'reply','New reply',actor||' replied to your comment.','/?post='||new.post_id,new.id) on conflict do nothing;
   end if;
   if post_owner is not null and post_owner<>new.author_id and post_owner is distinct from recipient then
    insert into public.notifications(user_id,actor_id,type,title,body,target_url,entity_id) values(post_owner,new.author_id,'comment','New activity on your post',actor||' replied in your post.','/?post='||new.post_id,new.id) on conflict do nothing;
   end if;
 else
   recipient:=post_owner;
   if recipient is not null and recipient<>new.author_id then
    insert into public.notifications(user_id,actor_id,type,title,body,target_url,entity_id) values(recipient,new.author_id,'comment','New comment',actor||' commented on your post.','/?post='||new.post_id,new.id) on conflict do nothing;
   end if;
 end if; return new;
end $$;
drop trigger if exists orven_comment_notification on public.post_comments;
create trigger orven_comment_notification after insert on public.post_comments for each row execute function public.orven_notify_comment();

create or replace function public.orven_notify_message() returns trigger language plpgsql security definer set search_path=public as $$
declare actor text; begin actor:=public.orven_actor_name(new.sender_id); insert into public.notifications(user_id,actor_id,type,title,body,target_url,entity_id) values(new.recipient_id,new.sender_id,'message','New message',actor||' sent you a message.','/messages?with='||new.sender_id,new.id) on conflict do nothing; return new; end $$;
drop trigger if exists orven_message_notification on public.direct_messages;
create trigger orven_message_notification after insert on public.direct_messages for each row execute function public.orven_notify_message();

-- Follows are also live activity. Assumes follows(follower_id, following_id).
create or replace function public.orven_notify_follow() returns trigger language plpgsql security definer set search_path=public as $$
declare actor text; begin if new.follower_id=new.following_id then return new; end if; actor:=public.orven_actor_name(new.follower_id); insert into public.notifications(user_id,actor_id,type,title,body,target_url,entity_id) values(new.following_id,new.follower_id,'follow','New follower',actor||' followed you.','/profile/'||coalesce((select username from public.profiles where id=new.follower_id),'player'),new.follower_id) on conflict do nothing; return new; end $$;
create or replace function public.orven_unnotify_follow() returns trigger language plpgsql security definer set search_path=public as $$ begin delete from public.notifications where user_id=old.following_id and actor_id=old.follower_id and type='follow' and entity_id=old.follower_id; return old; end $$;
drop trigger if exists orven_follow_notification on public.follows;
create trigger orven_follow_notification after insert on public.follows for each row execute function public.orven_notify_follow();
drop trigger if exists orven_unfollow_notification on public.follows;
create trigger orven_unfollow_notification after delete on public.follows for each row execute function public.orven_unnotify_follow();

-- Make notification INSERT/UPDATE/DELETE events available to Supabase Realtime.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
   alter publication supabase_realtime add table public.notifications;
 end if;
end $$;
