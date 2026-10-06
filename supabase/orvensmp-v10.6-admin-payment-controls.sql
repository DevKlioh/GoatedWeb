-- OrvenSMP V10.6 — Admin payment authority
-- Run AFTER the V10.4/V10.4.1 support/payment SQL.

-- Replace review function so reject is explicit and leaves the ticket open for follow-up.
create or replace function public.orven_review_gcash_support(p_donation uuid,p_approve boolean)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  d public.support_donations%rowtype;
  v_ticket uuid;
begin
  if not public.orven_is_admin(auth.uid()) then raise exception 'Admin only'; end if;

  select * into d from public.support_donations where id=p_donation for update;
  if d.id is null then raise exception 'Donation not found'; end if;
  if d.status<>'pending' or d.method<>'gcash' then raise exception 'This submission is no longer pending'; end if;

  select ticket_id into v_ticket
    from public.orven_support_ticket_messages
    where donation_id=d.id order by created_at desc limit 1;

  if p_approve then
    update public.support_donations
      set status='approved',reviewed_at=now(),reviewed_by=auth.uid()
      where id=d.id;

    update public.profiles set credits=credits+d.amount where id=d.user_id;

    insert into public.notifications(user_id,type,title,body,target_url,is_read)
    values(d.user_id,'credits','Orven Credits added',
      format('Your GCash payment was verified. ₱%s Orven Credits have been added to your account.',d.amount),
      '/support',false);

    if v_ticket is not null then
      delete from public.orven_support_tickets where id=v_ticket;
    end if;
  else
    update public.support_donations
      set status='rejected',reviewed_at=now(),reviewed_by=auth.uid()
      where id=d.id;

    if v_ticket is not null then
      insert into public.orven_support_ticket_messages(ticket_id,sender_user_id,sender_kind,body,donation_id)
      values(v_ticket,auth.uid(),'support',
        format('Payment verification update: We could not verify the GCash payment request of ₱%s. No Orven Credits were added. You may reply here if you believe this was a mistake or submit a new valid payment.',d.amount),d.id);
      update public.orven_support_tickets set updated_at=now() where id=v_ticket;
    end if;

    insert into public.notifications(user_id,type,title,body,target_url,is_read)
    values(d.user_id,'credits','Payment verification rejected',
      format('We could not verify your GCash payment request of ₱%s. No Orven Credits were added.',d.amount),
      '/messages/support',false);
  end if;
end $$;

revoke all on function public.orven_review_gcash_support(uuid,boolean) from public;
grant execute on function public.orven_review_gcash_support(uuid,boolean) to authenticated;

-- Permanent admin-only removal for fake/duplicate/spam/invalid submissions.
create or replace function public.orven_delete_gcash_support(p_donation uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  d public.support_donations%rowtype;
  v_ticket uuid;
begin
  if not public.orven_is_admin(auth.uid()) then raise exception 'Admin only'; end if;

  select * into d from public.support_donations where id=p_donation for update;
  if d.id is null then raise exception 'Donation not found'; end if;
  if d.method<>'gcash' then raise exception 'Only GCash support requests can be deleted here'; end if;
  if d.status='approved' then raise exception 'Approved payments cannot be deleted from the support chat'; end if;

  select ticket_id into v_ticket
    from public.orven_support_ticket_messages
    where donation_id=d.id order by created_at desc limit 1;

  -- Delete linked conversation first. Messages cascade with the ticket.
  if v_ticket is not null then
    delete from public.orven_support_tickets where id=v_ticket;
  end if;

  -- Remove proof from storage metadata/object is intentionally not attempted in SQL;
  -- the private proof path becomes unreachable from the application after this record is removed.
  delete from public.support_donations where id=d.id;
end $$;

revoke all on function public.orven_delete_gcash_support(uuid) from public;
grant execute on function public.orven_delete_gcash_support(uuid) to authenticated;
