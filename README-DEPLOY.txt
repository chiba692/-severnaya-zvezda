СЕВЕРНАЯ ЗВЕЗДА — SECURITY HARDENED v4

ВАЖНО: текущий live-сайт старее этой сборки. Этот ZIP включает последние удобства админки, полный прайс и security hardening.

ПОРЯДОК:
1. Заменить содержимое локального репозитория содержимым этого ZIP.
2. GitHub Desktop: Commit to main -> Push origin и дождаться Netlify Published.
3. Проверить, что главная и админка открываются. До миграции полный прайс может быть пустым — это ожидаемо.
4. В Supabase SQL Editor выполнить supabase/SECURITY-HARDENING-MIGRATION.sql один раз.
5. Обновить сайт и выполнить smoke/security проверку.

ПОЧЕМУ КОД СНАЧАЛА:
Hardened v4 специально умеет работать со старой production-схемой до миграции. Так старый клиентский код не увидит новые направления услуг раньше, чем backend научится их принимать.

NETLIFY ENV:
Обязательные существующие: SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_LOGIN, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, VAPID_PRIVATE_KEY.
VAPID public: код поддерживает и VAPID_PUBLIC_KEY, и старую опечатку VAPID_PUBLICK_KEY.
Рекомендуется позже добавить отдельный RATE_LIMIT_SECRET (случайная строка 32+ байта). Без него работает безопасный fallback на ADMIN_SESSION_SECRET.

ПРОВЕРКА:
npm run validate
