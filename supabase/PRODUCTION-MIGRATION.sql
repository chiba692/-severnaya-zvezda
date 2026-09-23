-- СЕВЕРНАЯ ЗВЕЗДА — PRODUCTION MIGRATION
-- Идемпотентная миграция поверх текущей базы. Запускать целиком в Supabase SQL Editor.

create extension if not exists pgcrypto;

-- BOOKING CORE
alter table public.bookings add column if not exists status text not null default 'new';
alter table public.bookings add column if not exists service text not null default 'exam';
alter table public.bookings add column if not exists booking_type text not null default 'regular';
alter table public.bookings add column if not exists admin_note text;
alter table public.bookings add column if not exists public_token text;
alter table public.bookings add column if not exists checked_in_at timestamptz;
alter table public.bookings add column if not exists started_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;
alter table public.bookings add column if not exists updated_at timestamptz not null default now();
alter table public.bookings add column if not exists phone_norm text;
alter table public.bookings add column if not exists request_id text;
alter table public.bookings add column if not exists client_notice text;
alter table public.bookings add column if not exists client_notice_at timestamptz;
alter table public.bookings add column if not exists previous_booking_date date;
alter table public.bookings add column if not exists previous_booking_time time;
alter table public.bookings add column if not exists pet_species text;
alter table public.bookings add column if not exists pet_age text;
alter table public.bookings add column if not exists service_details jsonb not null default '{}'::jsonb;
alter table public.bookings add column if not exists stay_start date;
alter table public.bookings add column if not exists stay_end date;
alter table public.bookings add column if not exists archived_at timestamptz;

update public.bookings set phone_norm=regexp_replace(coalesce(phone,''),'\D','','g') where phone_norm is null or phone_norm='';
update public.bookings set public_token=encode(gen_random_bytes(32),'hex') where public_token is null or public_token='';
alter table public.bookings alter column public_token set default encode(gen_random_bytes(32),'hex');
alter table public.bookings alter column public_token set not null;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check(status in ('new','accepted','arrived','in_progress','completed','rejected','no_show','cancelled'));

alter table public.bookings drop constraint if exists bookings_service_check;
alter table public.bookings add constraint bookings_service_check check(service in ('exam','ultrasound','xray','vaccination','tests','inpatient','other'));

alter table public.bookings drop constraint if exists bookings_stay_dates_check;
alter table public.bookings add constraint bookings_stay_dates_check check(service <> 'inpatient' or (stay_start is not null and stay_end is not null and stay_end >= stay_start));

create unique index if not exists bookings_public_token_unique on public.bookings(public_token);
create unique index if not exists bookings_request_id_unique on public.bookings(request_id) where request_id is not null;
create index if not exists bookings_phone_norm_created_idx on public.bookings(phone_norm,created_at desc);
create index if not exists bookings_active_date_idx on public.bookings(booking_date,booking_time) where archived_at is null;

drop index if exists bookings_date_time_type_unique;
drop index if exists bookings_date_time_unique;
create unique index bookings_date_time_unique on public.bookings(booking_date,booking_time)
where service <> 'inpatient' and status not in ('rejected','cancelled') and archived_at is null;

-- SERVICES
create table if not exists public.clinic_services(
  service_key text primary key,
  name text not null,
  icon text not null default 'paw',
  price_label text not null default '',
  description text not null default '',
  prep text not null default '',
  duration_minutes integer not null default 20 check(duration_minutes between 20 and 240),
  sort_order integer not null default 100,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.clinic_services add column if not exists duration_minutes integer not null default 20;

insert into public.clinic_services(service_key,name,icon,price_label,description,prep,duration_minutes,sort_order,enabled)
values
('exam','Осмотр','stethoscope','850 ₽','Первичный или повторный приём и оценка состояния питомца.','Возьмите ветеринарный паспорт и прежние результаты обследований, если они есть.',20,10,true),
('ultrasound','УЗИ','scan','от 850 ₽','Ультразвуковое исследование по назначению или жалобам.','Подготовка зависит от вида исследования — точные требования клиника уточнит при записи.',20,20,true),
('xray','Рентген','xray','от 1 000 ₽','Рентгенологическое исследование нужной области.','Если есть прежние снимки или заключения, возьмите их с собой.',20,30,true),
('vaccination','Вакцинация','syringe','от 1 800 ₽','Плановая вакцинация с учётом возраста и истории прививок.','Возьмите ветеринарный паспорт. Данные прошлой вакцинации можно указать в заявке.',20,40,true),
('tests','Анализы','flask','от 800 ₽','Лабораторные исследования по назначению врача или для контроля состояния.','Подготовка зависит от вида анализа — при необходимости клиника уточнит её заранее.',20,50,true),
('inpatient','Стационар','home','от 1 000 ₽/день','Размещение питомца на выбранный период с передачей особенностей ухода.','В заявке укажите важные особенности кормления, ухода и поведения.',20,60,true),
('other','Другое','help','уточним','Если нужной услуги нет в списке, коротко опишите запрос.','Администратор уточнит детали после получения заявки.',20,70,true)
on conflict(service_key) do update set
  name=excluded.name,
  icon=excluded.icon,
  sort_order=excluded.sort_order;

-- SCHEDULE EXCEPTIONS / MANUAL BLOCKS
create table if not exists public.schedule_blocks(
  id bigint generated by default as identity primary key,
  block_date date not null,
  start_time time,
  end_time time,
  reason text not null default 'Недоступно',
  created_at timestamptz not null default now(),
  constraint schedule_blocks_time_check check((start_time is null and end_time is null) or (start_time is not null and end_time is not null and end_time > start_time))
);
create index if not exists schedule_blocks_date_idx on public.schedule_blocks(block_date,start_time);

-- SETTINGS
create table if not exists public.clinic_settings(
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.clinic_settings(key,value) values('inpatient_capacity','{"capacity":3}'::jsonb) on conflict(key) do nothing;

-- AUDIT LOG
create table if not exists public.booking_audit(
  id bigint generated by default as identity primary key,
  booking_id bigint not null references public.bookings(id) on delete cascade,
  actor text not null check(actor in ('client','admin','system')),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists booking_audit_booking_idx on public.booking_audit(booking_id,created_at desc);

-- PUSH
create table if not exists public.push_subscriptions(
  id bigint generated by default as identity primary key,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions add column if not exists updated_at timestamptz not null default now();
delete from public.push_subscriptions a using public.push_subscriptions b where a.ctid<b.ctid and a.endpoint=b.endpoint;
create unique index if not exists push_subscriptions_endpoint_unique on public.push_subscriptions(endpoint);

-- RATE LIMIT BACKEND. Исходные IP/телефоны сюда не записываются: только HMAC-хэши.
create table if not exists public.rate_limit_events(
  id bigint generated by default as identity primary key,
  scope text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_lookup_idx on public.rate_limit_events(scope,key_hash,created_at desc);
create index if not exists rate_limit_created_idx on public.rate_limit_events(created_at);

create or replace function public.consume_public_rate_limit(p_scope text,p_key_hash text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer; v_window integer;
begin
  v_window:=greatest(10,least(coalesce(p_window_seconds,60),86400));
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_scope,'')||':'||coalesce(p_key_hash,''),0));
  delete from public.rate_limit_events where created_at<now()-interval '2 days';
  delete from public.rate_limit_events where scope=p_scope and key_hash=p_key_hash and created_at<now()-make_interval(secs=>v_window);
  select count(*) into v_count from public.rate_limit_events where scope=p_scope and key_hash=p_key_hash and created_at>=now()-make_interval(secs=>v_window);
  if v_count>=greatest(1,least(coalesce(p_limit,1),100)) then return false; end if;
  insert into public.rate_limit_events(scope,key_hash) values(p_scope,p_key_hash);
  return true;
end $$;
revoke all on function public.consume_public_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_public_rate_limit(text,text,integer,integer) to service_role;

-- DATABASE LAST-RESORT GUARD FOR PUBLIC BOOKINGS
create or replace function public.guard_public_booking_insert()
returns trigger language plpgsql set search_path=public as $$
declare v_recent integer;
begin
  if new.request_id is null then return new; end if;
  if coalesce(new.phone_norm,'')='' then raise exception 'BOOKING_RATE_LIMIT'; end if;
  if exists(
    select 1 from public.bookings b
    where b.request_id is not null
      and b.phone_norm=new.phone_norm
      and lower(trim(b.pet))=lower(trim(new.pet))
      and b.service=new.service
      and b.created_at>now()-interval '30 minutes'
      and b.status not in ('rejected','cancelled')
      and b.archived_at is null
  ) then raise exception 'DUPLICATE_BOOKING'; end if;
  select count(*) into v_recent from public.bookings b
  where b.request_id is not null and b.phone_norm=new.phone_norm and b.created_at>now()-interval '30 minutes';
  if v_recent>=3 then raise exception 'BOOKING_RATE_LIMIT'; end if;
  return new;
end $$;
drop trigger if exists trg_guard_public_booking_insert on public.bookings;
create trigger trg_guard_public_booking_insert before insert on public.bookings for each row execute function public.guard_public_booking_insert();

-- REVIEWS REMOVED
DROP TABLE IF EXISTS public.reviews CASCADE;

-- DIRECT BROWSER ACCESS IS CLOSED. Backend uses service role through Netlify Functions.
alter table public.bookings enable row level security;
alter table public.clinic_services enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.booking_audit enable row level security;

-- Remove broad policies if earlier prototypes created them.
do $$
declare r record;
begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('bookings','clinic_services','push_subscriptions','rate_limit_events','schedule_blocks','clinic_settings','booking_audit') loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;
