-- GOATEDPLUGINS SOCIAL PRESENCE + MESSAGING + FRIENDS
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Authenticated users may update only their own presence/profile row (existing profile update policy may already cover this).
drop policy if exists "Users update own profile presence" on public.profiles;
create policy "Users update own profile presence" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

create table if not exists public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 content text not null check(char_length(trim(content)) between 1 and 2000),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 constraint no_self_message check(sender_id<>recipient_id)
);
create index if not exists direct_messages_sender_idx on public.direct_messages(sender_id,created_at desc);
create index if not exists direct_messages_recipient_idx on public.direct_messages(recipient_id,created_at desc);
alter table public.direct_messages enable row level security;
drop policy if exists "Participants read messages" on public.direct_messages;
create policy "Participants read messages" on public.direct_messages for select to authenticated using(auth.uid()=sender_id or auth.uid()=recipient_id);
drop policy if exists "Users send messages" on public.direct_messages;
create policy "Users send messages" on public.direct_messages for insert to authenticated with check(auth.uid()=sender_id and sender_id<>recipient_id);
drop policy if exists "Recipients mark messages read" on public.direct_messages;
create policy "Recipients mark messages read" on public.direct_messages for update to authenticated using(auth.uid()=recipient_id) with check(auth.uid()=recipient_id);

-- Friends require no second table: two reciprocal rows in public.follows = friends.
