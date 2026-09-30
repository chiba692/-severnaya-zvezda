# Security report — Cloudflare FINAL v10

Сборка сохраняет security-hardening проекта: signed HttpOnly/Secure/SameSite admin session, CSRF для изменяющих admin-запросов, server-side validation, Supabase RLS/ACL deny для browser roles, rate limiting, idempotency, random public booking tokens, unique active-slot index, `no-store` для API/админки и Service Worker без API caching.

Проверено в v10:
- Worker обслуживает `/api/*`, static assets ограничены `./public`, Netlify runtime отсутствует;
- 19 frontend API endpoints сопоставлены Worker-маршрутам;
- farm исключён из серверных public/admin каталогов даже до миграции, а FINAL SQL удаляет farm из БД-каталога/whitelist;
- `pet_species_other` валидируется сервером и хранится только как отдельное поле записи;
- первая суббота вычисляется через UTC-safe ISO-date logic и на backend, и во frontend/admin; 30.10.2026 тестируется как обычная дата с 20-минутным шагом;
- публичный booking API не отдаёт `admin_note` и телефон клиента по приватной ссылке;
- security regression tests проходят для auth/session, CSRF, token, XSS/input, storage, SQL/RLS и abuse controls.

Остаточный риск: CSP пока использует `unsafe-inline`, потому что CSS/JS текущих HTML-страниц встроены inline. Для отдельного крупного security-refactor их можно вынести в статические assets и ужесточить CSP без изменения UX.

Production E2E новой v10 необходимо подтвердить после deploy: `/api/health`, `/api/price-items` (116 позиций, 0 farm), реальная клиентская запись, админский перенос и Web Push на Android.
