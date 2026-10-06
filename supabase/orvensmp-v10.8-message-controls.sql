-- OrvenSMP V10.8 — Message controls
drop policy if exists "Senders edit own messages" on public.direct_messages;
create policy "Senders edit own messages" on public.direct_messages for update to authenticated
using(auth.uid()=sender_id) with check(auth.uid()=sender_id and char_length(trim(content)) between 1 and 2000);
drop policy if exists "Senders delete own messages" on public.direct_messages;
create policy "Senders delete own messages" on public.direct_messages for delete to authenticated using(auth.uid()=sender_id);

drop policy if exists "Users edit own support messages" on public.support_messages;
create policy "Users edit own support messages" on public.support_messages for update to authenticated
using(user_id=auth.uid() and sender_id=auth.uid() and sender_role='user')
with check(user_id=auth.uid() and sender_id=auth.uid() and sender_role='user' and char_length(trim(content)) between 1 and 2000);
drop policy if exists "Users delete own support messages" on public.support_messages;
create policy "Users delete own support messages" on public.support_messages for delete to authenticated
using(user_id=auth.uid() and sender_id=auth.uid() and sender_role='user');

create or replace function public.orven_clear_direct_conversation(p_other uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_other=auth.uid() then raise exception 'Invalid conversation'; end if;
 delete from public.direct_messages where
 (sender_id=auth.uid() and recipient_id=p_other) or (sender_id=p_other and recipient_id=auth.uid());
end $$;
revoke all on function public.orven_clear_direct_conversation(uuid) from public;
grant execute on function public.orven_clear_direct_conversation(uuid) to authenticated;

create or replace function public.orven_clear_support_conversation()
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from public.support_messages where user_id=auth.uid();
end $$;
revoke all on function public.orven_clear_support_conversation() from public;
grant execute on function public.orven_clear_support_conversation() to authenticated;
