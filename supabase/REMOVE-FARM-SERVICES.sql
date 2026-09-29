-- Северная звезда: удаление сельскохозяйственных услуг из публичного каталога
-- Без удаления старых записей клиентов: исторические bookings сохраняются.

begin;

update public.clinic_services
set enabled = false, updated_at = now()
where service_key = 'farm';

update public.clinic_price_items
set enabled = false, updated_at = now()
where booking_service = 'farm' or item_key like 'farm-%';

-- Убираем упоминание КРС из общей услуги забора крови.
update public.clinic_price_items
set price_label = 'кошки — 400 ₽; собаки — 450 ₽; хорьки — 500 ₽', updated_at = now()
where item_key = 'general-007';

commit;
