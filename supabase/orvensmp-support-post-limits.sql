-- ORVENSMP SUPPORT + POST LIMITS
alter table public.profiles add column if not exists post_limit integer not null default 5 check(post_limit>=0 and post_limit<=100000);
alter table public.profiles add column if not exists credits numeric(14,2) not null default 0 check(credits>=0);

-- Enforce post limits in the database, not only the UI.
create or replace function public.orven_can_create_post(uid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select (select count(*) from public.posts where author_id=uid) < coalesce((select post_limit from public.profiles where id=uid),5);
$$;
drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts" on public.posts for insert to authenticated with check(auth.uid()=author_id and public.orven_can_create_post(auth.uid()));

create table if not exists public.support_donations(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 amount numeric(14,2) not null check(amount>=10), method text not null check(method in('gcash','paypal')),
 status text not null default 'pending' check(status in('pending','approved','rejected','cancelled')),
 reference text, proof_path text, paypal_order_id text unique, paypal_capture_id text unique,
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references public.profiles(id)
);
create index if not exists support_donations_user_idx on public.support_donations(user_id,created_at desc);
alter table public.support_donations enable row level security;
drop policy if exists "Users read own support" on public.support_donations;
create policy "Users read own support" on public.support_donations for select to authenticated using(user_id=auth.uid() or public.orven_is_admin(auth.uid()));
drop policy if exists "Users submit gcash support" on public.support_donations;
create policy "Users submit gcash support" on public.support_donations for insert to authenticated with check(user_id=auth.uid() and method='gcash' and status='pending');

create table if not exists public.support_messages(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 sender_id uuid references public.profiles(id) on delete set null, sender_role text not null check(sender_role in('user','admin','system')),
 kind text not null default 'general', content text not null check(char_length(trim(content)) between 1 and 2000),
 donation_id uuid references public.support_donations(id) on delete set null, created_at timestamptz not null default now(), read_at timestamptz
);
create index if not exists support_messages_user_idx on public.support_messages(user_id,created_at);
alter table public.support_messages enable row level security;
drop policy if exists "Users and admins read support messages" on public.support_messages;
create policy "Users and admins read support messages" on public.support_messages for select to authenticated using(user_id=auth.uid() or public.orven_is_admin(auth.uid()));
drop policy if exists "Users write own support messages" on public.support_messages;
create policy "Users write own support messages" on public.support_messages for insert to authenticated with check(user_id=auth.uid() and sender_id=auth.uid() and sender_role='user');
drop policy if exists "Admins write support messages" on public.support_messages;
create policy "Admins write support messages" on public.support_messages for insert to authenticated with check(public.orven_is_admin(auth.uid()) and sender_id=auth.uid() and sender_role='admin');

insert into storage.buckets(id,name,public) values('support-proofs','support-proofs',false) on conflict(id) do nothing;
drop policy if exists "Users upload own support proofs" on storage.objects;
create policy "Users upload own support proofs" on storage.objects for insert to authenticated with check(bucket_id='support-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users read own support proofs" on storage.objects;
create policy "Users read own support proofs" on storage.objects for select to authenticated using(bucket_id='support-proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.orven_is_admin(auth.uid())));

create or replace function public.orven_gcash_message() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.method='gcash' then insert into public.support_messages(user_id,sender_role,kind,content,donation_id) values(new.user_id,'system','gcash',format('GCash support submitted: ₱%s · Reference %s. Waiting for admin verification.',new.amount,coalesce(new.reference,'N/A')),new.id); end if; return new; end $$;
drop trigger if exists orven_gcash_message_trigger on public.support_donations;
create trigger orven_gcash_message_trigger after insert on public.support_donations for each row execute function public.orven_gcash_message();

create or replace function public.orven_review_gcash_support(p_donation uuid,p_approve boolean) returns void language plpgsql security definer set search_path=public as $$ declare d public.support_donations%rowtype; begin
 if not public.orven_is_admin(auth.uid()) then raise exception 'Admin only'; end if;
 select * into d from public.support_donations where id=p_donation for update;if d.id is null then raise exception 'Donation not found';end if;if d.status<>'pending' or d.method<>'gcash' then raise exception 'This submission is no longer pending';end if;
 if p_approve then update public.support_donations set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where id=d.id;update public.profiles set credits=credits+d.amount where id=d.user_id;insert into public.support_messages(user_id,sender_id,sender_role,kind,content,donation_id) values(d.user_id,auth.uid(),'admin','gcash',format('Your GCash support of ₱%s was confirmed. ₱%s Orven Credits were added to your account. Thank you for supporting OrvenSMP!',d.amount,d.amount),d.id);
 else update public.support_donations set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=d.id;insert into public.support_messages(user_id,sender_id,sender_role,kind,content,donation_id) values(d.user_id,auth.uid(),'admin','gcash',format('We could not verify your GCash support submission of ₱%s. Please reply to Orven Support if you need help.',d.amount),d.id); end if; end $$;
revoke all on function public.orven_review_gcash_support(uuid,boolean) from public;grant execute on function public.orven_review_gcash_support(uuid,boolean) to authenticated;

create or replace function public.orven_admin_set_post_limit(p_user uuid,p_limit integer) returns void language plpgsql security definer set search_path=public as $$ begin if not public.orven_is_admin(auth.uid()) then raise exception 'Admin only';end if;if p_limit<0 or p_limit>100000 then raise exception 'Invalid limit';end if;update public.profiles set post_limit=p_limit where id=p_user;insert into public.support_messages(user_id,sender_id,sender_role,kind,content) values(p_user,auth.uid(),'admin','post_limit',format('Your posting limit has been updated to %s posts.',p_limit));end $$;
revoke all on function public.orven_admin_set_post_limit(uuid,integer) from public;grant execute on function public.orven_admin_set_post_limit(uuid,integer) to authenticated;

-- Called only by the server after PayPal capture verification. Service-role bypasses RLS.
create or replace function public.orven_complete_paypal_support(p_user uuid,p_order text,p_capture text,p_amount numeric) returns void language plpgsql security definer set search_path=public as $$ begin
 if p_amount<10 then raise exception 'Invalid amount';end if;
 if exists(select 1 from public.support_donations where paypal_order_id=p_order or paypal_capture_id=p_capture) then return;end if;
 insert into public.support_donations(user_id,amount,method,status,paypal_order_id,paypal_capture_id,reviewed_at) values(p_user,p_amount,'paypal','approved',p_order,p_capture,now());update public.profiles set credits=credits+p_amount where id=p_user;insert into public.support_messages(user_id,sender_role,kind,content) values(p_user,'system','paypal',format('PayPal support confirmed: ₱%s. The same amount was added to your Orven Credits. Thank you!',p_amount));end $$;
revoke all on function public.orven_complete_paypal_support(uuid,text,text,numeric) from public;grant execute on function public.orven_complete_paypal_support(uuid,text,text,numeric) to service_role;

-- Allow realtime updates for support messages.
do $$ begin alter publication supabase_realtime add table public.support_messages; exception when duplicate_object then null; end $$;

-- Public-safe aggregate data for the Support page. No payment references or receipt paths are exposed.
create or replace function public.orven_support_summary()
returns table(user_id uuid, username text, display_name text, all_time numeric, this_month numeric)
language sql stable security definer set search_path=public as $$
 select p.id,p.username,p.display_name,
        coalesce(sum(d.amount) filter(where d.status='approved'),0)::numeric as all_time,
        coalesce(sum(d.amount) filter(where d.status='approved' and d.created_at>=date_trunc('month',now())),0)::numeric as this_month
 from public.profiles p join public.support_donations d on d.user_id=p.id
 where d.status='approved' group by p.id,p.username,p.display_name
 order by all_time desc;
$$;
grant execute on function public.orven_support_summary() to authenticated;

-- Users can mark Orven Support messages as read in their own thread.
drop policy if exists "Users mark own support read" on public.support_messages;
create policy "Users mark own support read" on public.support_messages for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());


-- V10.2: only allow the official OrvenSMP support amounts.
alter table public.support_donations
  drop constraint if exists support_donations_allowed_amount_check;
alter table public.support_donations
  add constraint support_donations_allowed_amount_check
  check (amount in (50,100,150,200,300,400,500,1000,1500,2500,5000,10000));
