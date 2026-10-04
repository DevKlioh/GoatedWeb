-- GOATEDPLUGINS RESOURCE MARKETPLACE UPGRADE
-- Run AFTER the earlier resources-and-notifications.sql.

alter table public.resources add column if not exists plugin_version text not null default '1.0.0';
alter table public.resources add column if not exists minecraft_versions text[] not null default array['1.21.11'];
alter table public.resources add column if not exists platforms text[] not null default array['paper'];
alter table public.resources add column if not exists pricing_type text not null default 'free';
alter table public.resources add column if not exists price_php numeric(10,2);
alter table public.resources add column if not exists download_count bigint not null default 0;
alter table public.resources add column if not exists file_bucket text;
alter table public.resources add column if not exists file_path text;
alter table public.resources add column if not exists file_name text;

do $$ begin
  alter table public.resources add constraint resources_pricing_type_check check (pricing_type in ('free','premium'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.resources add constraint resources_price_check check (
    (pricing_type='free' and price_php is null) or
    (pricing_type='premium' and price_php is not null and price_php > 0)
  );
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.resources add constraint resources_platforms_check check (
    platforms <@ array['spigot','paper','purpur','folia']::text[] and cardinality(platforms) > 0
  );
exception when duplicate_object then null; end $$;

create table if not exists public.resource_purchases (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  amount_php numeric(10,2) not null check(amount_php > 0),
  status text not null default 'pending' check(status in ('pending','paid','refunded','cancelled')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique(resource_id,buyer_id)
);
alter table public.resource_purchases enable row level security;
drop policy if exists "Buyers read own purchases" on public.resource_purchases;
create policy "Buyers read own purchases" on public.resource_purchases for select to authenticated using (auth.uid()=buyer_id);
drop policy if exists "Owners see purchases of own resources" on public.resource_purchases;
create policy "Owners see purchases of own resources" on public.resource_purchases for select to authenticated using (
  exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=auth.uid())
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('free-resource-files','free-resource-files',true,104857600,array['application/java-archive','application/octet-stream','application/zip'])
on conflict(id) do update set public=true,file_size_limit=104857600;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('premium-resource-files','premium-resource-files',false,104857600,array['application/java-archive','application/octet-stream','application/zip'])
on conflict(id) do update set public=false,file_size_limit=104857600;

drop policy if exists "Users upload own free resource files" on storage.objects;
create policy "Users upload own free resource files" on storage.objects for insert to authenticated with check (
  bucket_id='free-resource-files' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "Users upload own premium resource files" on storage.objects;
create policy "Users upload own premium resource files" on storage.objects for insert to authenticated with check (
  bucket_id='premium-resource-files' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "Owners manage free resource files" on storage.objects;
create policy "Owners manage free resource files" on storage.objects for delete to authenticated using (
  bucket_id='free-resource-files' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "Owners manage premium resource files" on storage.objects;
create policy "Owners manage premium resource files" on storage.objects for delete to authenticated using (
  bucket_id='premium-resource-files' and (storage.foldername(name))[1]=auth.uid()::text
);

create or replace function public.increment_resource_download(resource_uuid uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.resources set download_count=download_count+1 where id=resource_uuid and status='published';
end $$;
grant execute on function public.increment_resource_download(uuid) to anon, authenticated;

-- Premium file paths should not be readable from the public resources SELECT.
-- Hide storage details and premium price from anonymous users with a public view.
create or replace view public.resource_catalog
with (security_invoker=true) as
select id,owner_id,name,slug,description_html,description_text,icon_url,status,created_at,updated_at,
       plugin_version,minecraft_versions,platforms,pricing_type,
       case when pricing_type='free' or auth.uid() is not null then price_php else null end as price_php,
       download_count
from public.resources;

-- IMPORTANT: purchases should only be marked "paid" by your future payment webhook/server,
-- never by browser-side code.
