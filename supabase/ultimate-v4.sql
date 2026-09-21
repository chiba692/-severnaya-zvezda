-- СЕВЕРНАЯ ЗВЕЗДА — ULTIMATE V4
-- Можно запускать поверх уже выполненного первого SQL: запрос идемпотентный.

alter table public.bookings add column if not exists status text not null default 'new';
alter table public.bookings add column if not exists service text not null default 'exam';
alter table public.bookings add column if not exists stay_start date;
alter table public.bookings add column if not exists stay_end date;
alter table public.bookings add column if not exists pet_species text;
alter table public.bookings add column if not exists pet_age text;
alter table public.bookings add column if not exists service_details jsonb not null default '{}'::jsonb;

update public.bookings set status='new'
where status is null or status not in ('new','accepted','completed','rejected','no_show');

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
check (status in ('new','accepted','completed','rejected','no_show'));

alter table public.bookings drop constraint if exists bookings_service_check;
alter table public.bookings add constraint bookings_service_check
check (service in ('exam','ultrasound','xray','vaccination','tests','inpatient','other'));

alter table public.bookings drop constraint if exists bookings_stay_dates_check;
alter table public.bookings add constraint bookings_stay_dates_check
check (service <> 'inpatient' or (stay_start is not null and stay_end is not null and stay_end >= stay_start));

drop index if exists bookings_date_time_type_unique;
drop index if exists bookings_date_time_unique;
create unique index if not exists bookings_date_time_unique
on public.bookings (booking_date, booking_time)
where service <> 'inpatient';
