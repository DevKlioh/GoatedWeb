-- OrvenSMP V10.7 — Admin Tickets, rejection reasons, permanent close cleanup
-- Run AFTER V10.6.

create table if not exists public.orven_support_ledger (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null,
  credited boolean not null default false,
  donated boolean not null default false,
  recorded_date date not null default current_date
);

alter table public.orven_support_ledger enable row level security;
drop policy if exists "Admins read support ledger" on public.orven_support_ledger;
create policy "Admins read support ledger" on public.orven_support_ledger
for select to authenticated using (public.orven_is_admin(auth.uid()));

-- Reject requires an admin-written reason. The reason is sent as Orven Support.
create or replace function public.orven_reject_gcash_support(p_donation uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare d public.support_donations%rowtype; v_ticket uuid; v_reason text;
begin
 if not public.orven_is_admin(auth.uid()) then raise exception 'Admin only'; end if;
 v_reason:=trim(coalesce(p_reason,''));
 if char_length(v_reason)<3 then raise exception 'A rejection reason is required'; end if;
 if char_length(v_reason)>500 then raise exception 'Rejection reason is too long'; end if;

 select * into d from public.support_donations where id=p_donation for update;
 if d.id is null then raise exception 'Donation not found'; end if;
 if d.method<>'gcash' or d.status<>'pending' then raise exception 'This payment is no longer pending'; end if;

 select ticket_id into v_ticket from public.orven_support_ticket_messages
 where donation_id=d.id order by created_at desc limit 1;

 update public.support_donations set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=d.id;

 if v_ticket is not null then
   insert into public.orven_support_ticket_messages(ticket_id,sender_user_id,sender_kind,body,donation_id)
   values(v_ticket,auth.uid(),'support',
     format('Payment verification rejected. Reason: %s No Orven Credits were added. You may reply here if you need help.',v_reason),d.id);
   update public.orven_support_tickets set updated_at=now() where id=v_ticket;
 end if;

 insert into public.notifications(user_id,type,title,body,target_url,is_read)
 values(d.user_id,'credits','Payment verification rejected',
   format('Your GCash payment request of ₱%s was rejected. Reason: %s',d.amount,v_reason),
   '/messages/support',false);
end $$;
revoke all on function public.orven_reject_gcash_support(uuid,text) from public;
grant execute on function public.orven_reject_gcash_support(uuid,text) to authenticated;

-- Close = retain only date + amount + whether it was actually credited/donated.
-- Everything private/transaction-specific linked to the ticket is removed.
create or replace function public.orven_close_support_ticket(p_ticket uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
 t public.orven_support_tickets%rowtype;
 d record;
begin
 if not public.orven_is_admin(auth.uid()) then raise exception 'Admin only'; end if;
 select * into t from public.orven_support_tickets where id=p_ticket for update;
 if t.id is null then raise exception 'Ticket not found'; end if;

 for d in
   select distinct sd.id,sd.amount,sd.status,sd.created_at
   from public.support_donations sd
   join public.orven_support_ticket_messages m on m.donation_id=sd.id
   where m.ticket_id=t.id
 loop
   -- Only completed/approved contributions become permanent fund history.
   if d.status='approved' then
     insert into public.orven_support_ledger(amount,credited,donated,recorded_date)
     values(d.amount,true,true,(d.created_at at time zone 'UTC')::date);
   end if;
 end loop;

 -- Delete the ticket first; its conversation cascades. Then delete all linked
 -- transaction rows owned by this member that no longer have a linked ticket.
 delete from public.orven_support_tickets where id=t.id;

 -- For Credits Support, remove pending/rejected transaction details.
 -- Approved rows may already have been removed when approval closed the ticket;
 -- the ledger above is the permanent minimal record when closing manually.
 if t.category='credits_support' then
   delete from public.support_donations
   where user_id=t.user_id and method='gcash' and status in ('pending','rejected');
 end if;
end $$;
revoke all on function public.orven_close_support_ticket(uuid) from public;
grant execute on function public.orven_close_support_ticket(uuid) to authenticated;
