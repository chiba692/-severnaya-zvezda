СЕВЕРНАЯ ЗВЕЗДА — ULTIMATE V4

ЭТО ФИНАЛЬНАЯ СБОРКА ПЕРЕД ПУБЛИКАЦИЕЙ V2/V3 — их ставить НЕ НУЖНО.

Что вошло:
- компактный кликабельный выбор услуг;
- услуга передается в админку и Push;
- +7 сразу в поле телефона;
- отдельные вопросы для вакцинации / УЗИ / рентгена / анализов / другого;
- стационар с датами с/по и особенностями ухода;
- вид и возраст питомца;
- админ: принять / отклонить / завершить / не пришли;
- редактирование, удаление, ручное добавление;
- повторная запись с автозаполнением клиента;
- история клиента по номеру телефона;
- вкладка «Сегодня»;
- месячный календарь;
- список, поиск, фильтры, статистика;
- PWA для Android;
- Push ведёт прямо в админку.

Установка:
1) Supabase -> SQL Editor -> выполнить supabase/ultimate-v4.sql
2) Заменить/добавить из архива содержимое в репозиторий.
   Ключевые заменяемые файлы:
   index.html
   admin.html
   sw.js
   admin-manifest.webmanifest
   icons/admin-icon.svg
   netlify/functions/_auth.js
   netlify/functions/_schedule.js
   netlify/functions/get-available-slots.js
   netlify/functions/send-booking.js
   netlify/functions/manage-booking.js
   netlify/functions/admin-logout.js
3) НЕ удалять существующие:
   netlify/functions/admin-login.js
   netlify/functions/get-bookings.js
   netlify/functions/get-vapid-public.js
   netlify/functions/save-push-subscription.js
4) Дождаться Netlify Published.

Важно:
Клиентские SMS/WhatsApp-напоминания в эту сборку не включены: для них нужен отдельный провайдер сообщений.
История клиента сейчас формируется по совпадению номера телефона из существующих записей.
