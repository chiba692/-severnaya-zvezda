# Северная звезда — Cloudflare Workers v8

Финальная Cloudflare-сборка: Worker API + Static Assets + существующий Supabase. Netlify не используется.

## Что внутри
- `src/worker.mjs` — единый API Worker (`/api/*`).
- `public/` — клиентский сайт, админка, прайс, PWA и иконки.
- `supabase/SECURITY-HARDENING-MIGRATION.sql` — актуальная резервная схема; для самого перехода на v8 новый SQL не нужен, если security migration уже была выполнена.
- Улучшенный каталог услуг: основные карточки с быстрыми вариантами, двухшаговый выбор услуги в форме, логичные разделы полного прайса.
- 20 минут для обычной записи, 30 минут в первую субботу для травматолога.
- Админка показывает Cloudflare Worker + Supabase в разделе «Система».

## Переменные Cloudflare
Обязательные secrets/vars:
`SUPABASE_URL`
`SUPABASE_SECRET_KEY`
`ADMIN_LOGIN`
`ADMIN_PASSWORD` (минимум 12 символов)
`ADMIN_SESSION_SECRET` (минимум 32 случайных символа)
`RATE_LIMIT_SECRET`
`VAPID_PUBLIC_KEY`
`VAPID_PRIVATE_KEY`
`VAPID_SUBJECT`

После первого успешного deploy добавьте `SITE_URL=https://severnaya-zvezda.<ваш-subdomain>.workers.dev` и сделайте redeploy.

## Деплой из GitHub
1. Содержимое архива положить прямо в корень репозитория, старые Netlify-файлы удалить.
2. GitHub Desktop: Commit → Push.
3. Cloudflare Workers Builds: Build command `npm run validate`, Deploy command `npx wrangler deploy`.
4. Убедиться, что лог видит `wrangler.jsonc`, `main: ./src/worker.mjs`, assets `./public`. Wrangler НЕ должен создавать конфиг сам и НЕ должен использовать Output Directory `.`.
5. После Success открыть `/`, `/admin.html` и `/api/health`.

## Локальная проверка
`npm ci`
`npm run validate`
`npm run dev`
