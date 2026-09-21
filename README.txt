СЕВЕРНАЯ ЗВЕЗДА — FINAL BUILD

1. Сначала в Supabase -> SQL Editor выполните файл:
   supabase/admin-upgrade.sql

2. Затем замените/добавьте файлы из этой папки в корень GitHub-репозитория.
   ВАЖНО: не удаляйте существующие admin-login.js, get-bookings.js,
   get-vapid-public.js и save-push-subscription.js — они уже используются.

3. Новые серверные файлы:
   netlify/functions/_auth.js
   netlify/functions/_schedule.js
   netlify/functions/manage-booking.js
   netlify/functions/admin-logout.js

4. Заменить:
   index.html
   admin.html
   sw.js
   netlify/functions/get-available-slots.js
   netlify/functions/send-booking.js

5. Добавить:
   admin-manifest.webmanifest
   icons/admin-icon.svg

После деплоя откройте /admin.html на Android в Chrome.
В меню браузера выберите «Установить приложение» / «Добавить на главный экран».
