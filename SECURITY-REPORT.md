# Северная звезда — Security Audit v4

Дата аудита: 2026-09-24

## Область проверки

Проверены три источника истины:

1. текущий production-деплой Netlify `zevzvezda` и его commit;
2. актуальная production-база Supabase;
3. новая сборка `SECURITY-HARDENED-v4`, собранная поверх последних UX/admin/price изменений.

Важно: текущий опубликованный Netlify deploy всё ещё старее локальных обновлений прайса/Admin Comfort. Поэтому таблица ниже показывает **что обнаружено в текущем production** и **что сделано в hardened-сборке**.

## Итоговая таблица

| Уровень | Находка | Текущий production | Hardened v4 |
|---|---|---|---|
| 🟠 Высокий | Stored XSS в карточке питомца: публичное имя/телефон попадали внутрь inline `onclick` | Есть | Исправлено: `data-*` + JS listener, пользовательские строки не становятся JS-кодом |
| 🟠 Высокий, условный | Admin login мог fail-open при ошибочной конфигурации пустых `ADMIN_LOGIN/ADMIN_PASSWORD` | Код допускал; live env сейчас заполнены | Исправлено: fail-closed, пароль >= 12, session secret >= 32 |
| 🟡 Средний | Приватный bearer-token записи находился в query string | Есть | Новые ссылки используют `#t=...`; чтение идёт POST JSON. Старый GET оставлен только для обратной совместимости |
| 🟡 Средний | `public_token` сохранялся в offline-cache админки | Есть | Удалён из persistent cache; сам cache ограничен 48 часами |
| 🟡 Средний | Availability summary делал много последовательных DB-запросов и не имел throttle | Есть | 2 batch-запроса к DB + rate-limit |
| 🟡 Средний | Часть public GET endpoint'ов была без rate-limit | Есть | Добавлен rate-limit для slots/services/price/settings/health/availability |
| 🟡 Средний | CSV formula injection при экспорте полей клиента | Есть | Значения `= + - @ TAB CR` нейтрализуются перед CSV |
| 🟡 Средний | Idempotency `request_id` мог вернуть существующий bearer token без сверки содержимого заявки | Есть | request_id привязан к номеру/питомцу/услуге/конкретной позиции |
| 🟡 Средний | RLS работал deny-by-default, но anon/authenticated всё ещё имели table grants, а явных policies не было | Есть | SQL revoke + explicit deny RLS policies + default privilege hardening |
| 🟡 Средний | CSP допускает `script-src 'unsafe-inline'` и `style-src 'unsafe-inline'` | Есть | Оставлено как residual risk: полный вынос inline JS/CSS — отдельный рефакторинг |
| 🟡 Средний | Push subscription принимала слишком свободный объект | Есть | Проверка HTTPS endpoint, размеров/формата ключей, хранится минимальный объект |
| 🟡 Средний | Неограниченный admin `get-bookings` / очень широкий CSV export | Есть | Ограничены диапазоны и количество строк |
| 🟢 Нормально | Классическая SQL injection | Не найдена | PostgREST/JSON, whitelist/validation и `encodeURIComponent`; raw SQL из HTTP input не строится |
| 🟢 Нормально | Race condition одного временного слота | Закрыта DB unique partial index | Индекс принудительно создаётся миграцией |
| 🟢 Нормально | IDOR по `booking id` в публичном API | Не найден | Публичная запись доступна только по случайному bearer token 48/64 hex |
| 🟢 Нормально | Sensitive fields в public booking response | Телефон/admin_note не выдаются | Явный whitelist полей, token/request_id/phone/admin_note не возвращаются |
| 🟢 Нормально | Service Worker кэширует API | Нет | API по-прежнему исключён; notification click ограничен `/admin.html` |
| 🟢 Нормально | Секреты в текущем Netlify deploy | Secret Scan: совпадений нет | Public-файлы дополнительно проверяются validator/security-tests |
| ⚪ Улучшение | Отдельный `RATE_LIMIT_SECRET` | Не задан, используется fallback на session secret | Код совместим; рекомендуется добавить отдельный secret |
| ⚪ Улучшение | Опечатка `VAPID_PUBLICK_KEY` в Netlify env | Есть | Код понимает и правильное, и старое имя; позже лучше переименовать в `VAPID_PUBLIC_KEY` |
| ⚪ Улучшение | Индивидуальная server-side ревокация admin session | Нет | Есть 12h expiry, UA binding и `ADMIN_SESSION_VERSION`; полноценное session store можно добавить позже |
| ⚪ Улучшение | Защита от распределённых ботов | Rate-limit + DB guard | Этого достаточно для текущего масштаба; Turnstile можно добавить позже при реальном abuse |

## SQL injection / PostgREST

Классической SQL injection в JavaScript-функциях не найдено. HTTP-значения не вставляются в raw SQL: Netlify Functions работают с Supabase REST/PostgREST, тела передаются JSON. Значения, которые попадают в PostgREST-фильтры, либо проходят строгую проверку (ID/date/status/service), либо кодируются `encodeURIComponent`.

В SQL migration есть dynamic SQL только для управления policies/объектами базы; пользовательский HTTP input туда не попадает. В hardened migration критические ACL/RLS операции записаны явно.

## XSS

Главная подтверждённая уязвимость текущего production была в `admin.html`: имя питомца и телефон, полученные из публичной заявки, использовались внутри inline JavaScript handler. HTML escaping не является корректным JavaScript escaping. В hardened v4 этот путь удалён: данные помещаются в `data-*`, затем считываются через DOM listener.

Остальные ключевые пользовательские данные в HTML-шаблонах выводятся через `esc()`/`textContent`. CSP остаётся слабее идеального из-за `unsafe-inline`, поэтому дальнейший лучший шаг — вынести inline scripts/styles в отдельные файлы и убрать unsafe-inline.

## CSRF и admin auth

State-changing admin endpoints требуют admin session + CSRF. Logout тоже теперь same-origin + CSRF при активной сессии. Cookie изменён на `__Host-sz_admin`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, `Priority=High`.

Сессия HMAC-подписана, имеет 12-часовой expiry, случайный CSRF и привязку к User-Agent. `ADMIN_SESSION_VERSION` позволяет принудительно инвалидировать все старые сессии сменой одной env-переменной.

## Supabase / RLS

В live Supabase RLS включён на таблицах, но security advisor показывает отсутствие policies. Прямой доступ сейчас фактически блокируется RLS deny-by-default, однако у `anon`/`authenticated` остались широкие table grants. Hardened migration:

- отзывает grants у `anon`/`authenticated`;
- создаёт явные deny policies;
- закрывает execute sensitive RPC;
- сохраняет работу только через server-side service role;
- расширяет whitelist услуг для нового прайса;
- создаёт `clinic_price_items` и полный прайс;
- сохраняет старые 48-char public tokens и новые 64-char tokens;
- гарантирует unique active slot.

## Secrets

Текущий Netlify deploy прошёл встроенный secret scan без совпадений. Серверные секреты находятся в Netlify environment variables и не найдены в public HTML/JS.

Полную историю всех старых Git commit'ов этот аудит не объявляет доказанно чистой. Если какой-либо `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, `ADMIN_PASSWORD` или `ADMIN_SESSION_SECRET` когда-либо реально попадал в публичный репозиторий, его нужно ротировать. По обнаруженным данным обязательной аварийной ротации прямо сейчас нет.

## Web Push

Push subscription теперь принимается только после admin auth + CSRF и проходит структурную проверку. Private VAPID остаётся server-side. Мёртвые subscriptions 404/410 удаляются. Push navigation ограничена страницей админки.

В Netlify сейчас присутствует переменная с исторической опечаткой `VAPID_PUBLICK_KEY`; hardened code имеет совместимый fallback.

## Headers / CSP

Хорошо настроены: HSTS, nosniff, frame deny, referrer policy, permissions policy, COOP/CORP, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, function no-store.

Residual risk: `script-src 'unsafe-inline'` / `style-src 'unsafe-inline'`. Это не новая уязвимость само по себе, но снижает ценность CSP как второго рубежа при XSS.

## Client storage / PWA

Admin auth cookie никогда не хранится в localStorage. Bearer-token клиентской записи удалён из offline admin cache. Offline operational cache остаётся только для удобства администратора и автоматически считается устаревшим после 48 часов. Logout очищает его. Service Worker не кэширует `/.netlify/functions/*`.

Клиентский `localStorage` хранит приватные ссылки на собственные записи по замыслу продукта; это bearer-секреты уровня конкретной записи, поэтому устройство пользователя должно считаться доверенным.

## DoS / abuse

Добавлены/усилены:

- body size limits;
- JSON Content-Type validation;
- IP + key rate-limit через атомарный RPC;
- DB duplicate guard;
- batched availability query;
- limits на admin list/export;
- health throttling;
- public read token throttling.

Распределённый ботнет полностью rate-limit'ом не остановить. Если появится реальный спам, следующим рубежом должен быть Turnstile.

## Dependencies

В проекте одна runtime dependency — `web-push`, закреплена на `3.6.7`. Это текущий latest npm release на момент аудита. Полный registry `npm audit` в локальной audit-среде выполнить не удалось из-за отсутствия сетевого доступа к npm registry, поэтому отсутствие transitive advisories не заявляется как доказанный факт.

## Что протестировано автоматически

`npm run validate` теперь запускает:

1. structural validator;
2. core scheduling/auth tests;
3. security-tests.

Security tests проверяют:

- malformed/oversized/non-JSON requests;
- SQL-like strings остаются данными;
- CSV formula escaping;
- admin endpoint без cookie -> 401;
- неверный CSRF -> 403;
- UA-bound admin session;
- token 48/64 hex и отказ numeric ID;
- отсутствие phone/admin_note/public_token/request_id в public response;
- отсутствие server secrets/process.env в public files;
- regression на stored-XSS `quickFromPet`;
- отсутствие public_token в admin offline cache;
- fragment-based private links;
- API exclusion from Service Worker cache;
- RLS/revoke/unique-slot/duplicate-guard в единой SQL migration;
- baseline CSP directives;
- отсутствие `eval`/`new Function`/`insertAdjacentHTML`.

## Residual risk после деплоя

1. CSP всё ещё использует `unsafe-inline`.
2. Admin sessions статeless: конкретную украденную сессию нельзя отозвать отдельно; можно сменить `ADMIN_SESSION_VERSION`/secret или дождаться expiry.
3. Offline admin cache содержит ограниченный объём рабочих персональных данных (имя/телефон/питомец) до 48 часов ради offline-read-only режима.
4. Старые клиентские ссылки с `?token=`/`?t=` поддерживаются для совместимости; новые генерируются только с fragment.
5. Защита от распределённого abuse не заменяет CAPTCHA/Turnstile при целевой атаке.
6. SQL migration подготовлена, но намеренно НЕ применена к production во время аудита.

## Deployment drift

Аудит подтвердил: текущий Netlify production deploy привязан к более старому commit, а live Supabase ещё не содержит `clinic_price_items` и расширенный whitelist новых направлений. Поэтому для перехода на hardened v4 нужен новый deploy и один SQL migration. Hardened код содержит pre-migration fallback, поэтому безопаснее сначала задеплоить код, а затем выполнить SQL.
