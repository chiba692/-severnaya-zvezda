# Северная звезда — CLOUDFLARE FINAL v9

Это единая финальная сборка. Предыдущие v7.1, v8 и v8.1 НЕ НУЖНО ставить по очереди.

## Что уже включено
- Cloudflare Worker + Static Assets, Netlify runtime отсутствует.
- Worker name: `severnaya-zvezda`.
- `main`: `./src/worker.mjs`.
- Static assets: только `./public` — `node_modules` не может попасть в assets.
- 116 актуальных позиций прайса, без сельскохозяйственного направления.
- Основные карточки услуг + единый удобный выбор конкретной услуги в форме.
- Полный прайс отдельной страницей, с поиском и логичными разделами.
- Обычная запись — 20 минут; травматолог в первую субботу — 30 минут.
- Админка, Push/PWA, приватные ссылки, перенос/отмена, security hardening.

## Один SQL
В `supabase/FINAL-MIGRATION.sql` лежит одна кумулятивная идемпотентная миграция.
Она заменяет старые PRICE / ADMIN-COMFORT / SECURITY / REMOVE-FARM миграции.
Запускать старые SQL отдельно не нужно.

## Cloudflare variables/secrets
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD` — минимум 12 символов
- `ADMIN_SESSION_SECRET` — минимум 32 случайных символа
- `RATE_LIMIT_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- после первого успешного deploy: `SITE_URL=https://severnaya-zvezda.<ваш-subdomain>.workers.dev`

## Деплой
1. Полностью заменить содержимое рабочего GitHub-репозитория содержимым этого архива. Старые Netlify-файлы удалить.
2. GitHub Desktop: Commit → Push.
3. Cloudflare build command: `npm run validate`; deploy command: `npx wrangler deploy`.
4. В логе Wrangler ДОЛЖЕН увидеть существующий `wrangler.jsonc`; он не должен создавать новый конфиг. Assets должны быть `./public`, а не `.`.
5. После успешного deploy выполнить `supabase/FINAL-MIGRATION.sql` в Supabase SQL Editor.

После deploy проверить `/`, `/prices.html`, `/admin.html`, `/api/health`.
