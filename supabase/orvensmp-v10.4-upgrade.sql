-- OrvenSMP V10.4 upgrade
-- Run this ONCE after the V10.3 SQL has already completed successfully.

alter table public.orven_support_ticket_messages
  add column if not exists donation_id uuid references public.support_donations(id) on delete set null;

create index if not exists orven_support_ticket_messages_donation_idx
  on public.orven_support_ticket_messages(donation_id);

-- New GCash submissions automatically open/reuse Credits Support and post the payment there.
create or replace function public.orven_gcash_message()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ticket uuid;
begin
  if new.method='gcash' then
    select id into v_ticket
      from public.orven_support_tickets
      where user_id=new.user_id and category='credits_support' and status='open'
      order by created_at desc limit 1;

    if v_ticket is null then
      insert into public.orven_support_tickets(user_id,category,status)
      values(new.user_id,'credits_support','open')
      returning id into v_ticket;
    end if;

    insert into public.orven_support_ticket_messages
      (ticket_id,sender_user_id,sender_kind,body,donation_id)
    values
      (v_ticket,new.user_id,'user',
       format('GCash payment submitted for verification.%sAmount: ₱%s%sReference: %s%sReceipt attached. Please verify my payment.',
              chr(10),new.amount,chr(10),coalesce(new.reference,'N/A'),chr(10)),
       new.id);

    update public.orven_support_tickets set updated_at=now() where id=v_ticket;
  end if;
  return new;
end $$;

drop trigger if exists orven_gcash_message_trigger on public.support_donations;
create trigger orven_gcash_message_trigger
after insert on public.support_donations
for each row execute function public.orven_gcash_message();

-- Approving is atomic: lock donation, issue credits once, then delete/clear its Credits Support ticket.
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
    where donation_id=d.id
    order by created_at desc limit 1;

  if p_approve then
    update public.support_donations
      set status='approved',reviewed_at=now(),reviewed_by=auth.uid()
      where id=d.id;

    update public.profiles
      set credits=credits+d.amount
      where id=d.user_id;

    -- The user requested completed payment conversations to be cleared.
    -- Deleting the ticket cascades all messages in that completed conversation.
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
        format('We could not verify the GCash payment of ₱%s. Please check the payment details or send us a message if you need help.',d.amount),d.id);
      update public.orven_support_tickets set updated_at=now() where id=v_ticket;
    end if;
  end if;
end $$;

revoke all on function public.orven_review_gcash_support(uuid,boolean) from public;
grant execute on function public.orven_review_gcash_support(uuid,boolean) to authenticated;

-- Backfill any GCash payments that were submitted before this upgrade but are still pending.
do $$
declare
  d record;
  v_ticket uuid;
begin
  for d in
    select * from public.support_donations
    where method='gcash' and status='pending'
      and not exists (
        select 1 from public.orven_support_ticket_messages m where m.donation_id=support_donations.id
      )
  loop
    select id into v_ticket from public.orven_support_tickets
      where user_id=d.user_id and category='credits_support' and status='open'
      order by created_at desc limit 1;

    if v_ticket is null then
      insert into public.orven_support_tickets(user_id,category,status)
      values(d.user_id,'credits_support','open') returning id into v_ticket;
    end if;

    insert into public.orven_support_ticket_messages(ticket_id,sender_user_id,sender_kind,body,donation_id)
    values(v_ticket,d.user_id,'user',
      format('GCash payment submitted for verification.%sAmount: ₱%s%sReference: %s%sReceipt attached. Please verify my payment.',
             chr(10),d.amount,chr(10),coalesce(d.reference,'N/A'),chr(10)),d.id);
  end loop;
end $$;

-- Realtime for payment status changes (safe if already present).
do $$
begin
  begin alter publication supabase_realtime add table public.support_donations;
  exception when duplicate_object then null;
  end;
end $$;
