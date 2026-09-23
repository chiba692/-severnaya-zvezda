СЕВЕРНАЯ ЗВЕЗДА — PRODUCTION FINAL

Установка через GitHub Desktop:
1. Supabase → SQL Editor → запустить supabase/PRODUCTION-MIGRATION.sql целиком один раз.
2. В локальной папке репозитория удалить старые файлы проекта (папку .git не трогать) и скопировать сюда ВСЁ содержимое этой сборки.
3. GitHub Desktop → Commit to main → Push origin.
4. Netlify автоматически выполнит npm run validate. Если проверка не пройдёт, битая версия не будет опубликована.
5. После Published проверить /, /admin.html и /.netlify/functions/health.

Нужные переменные Netlify:
SUPABASE_URL
SUPABASE_SECRET_KEY
ADMIN_LOGIN
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
RATE_LIMIT_SECRET (желательно отдельный длинный случайный секрет; если нет, используется ADMIN_SESSION_SECRET)
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT=https://zevzvezda.netlify.app

Отзывы в этой версии полностью отсутствуют.
