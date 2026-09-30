# Северная звезда — CLOUDFLARE FINAL v10

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
1. Сначала выполнить `supabase/FINAL-MIGRATION.sql` в Supabase SQL Editor. Это безопасно для существующих клиентских записей и добавляет поле для собственного вида животного до выхода нового frontend/backend.
2. Полностью заменить содержимое рабочего GitHub-репозитория содержимым этого архива. Старые Netlify-файлы удалить.
3. GitHub Desktop: Commit → Push. Cloudflare должен выполнить `npm run validate` и затем `npx wrangler deploy`.
4. В логе Wrangler должен использовать существующий `wrangler.jsonc`; assets — только `./public`. После deploy проверить `/api/health` и `/api/price-items`.
5. Для автоматического production-smoke можно выполнить `SITE_URL=https://severnaya-zvezda.eugangster161.workers.dev npm run smoke` — ожидается 116 позиций и 0 farm.

Старые SQL отдельно не запускать.
