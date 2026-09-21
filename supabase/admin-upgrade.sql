-- Запустить один раз в Supabase SQL Editor
alter table public.bookings
  add column if not exists status text not null default 'new';

update public.bookings
set status = 'new'
where status is null or status not in ('new','accepted','completed','rejected');

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('new','accepted','completed','rejected'));

-- Один слот нельзя занять дважды независимо от типа записи.
drop index if exists bookings_date_time_type_unique;
create unique index if not exists bookings_date_time_unique
  on public.bookings (booking_date, booking_time);
