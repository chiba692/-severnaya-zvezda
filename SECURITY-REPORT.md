# Security report — Cloudflare v8

Сборка сохраняет security-hardening предыдущей версии: signed HttpOnly/Secure/SameSite admin session, CSRF для изменяющих admin-запросов, server-side validation, Supabase RLS/ACL deny для browser roles, rate limiting, idempotency, random public booking tokens, slot unique index, no-store для API/админки и Service Worker без API caching.

Дополнительно в v8:
- удалены runtime-зависимости от Netlify и старый Netlify sitemap;
- Worker обслуживает только `/api/*`;
- Cloudflare конфиг фиксирует `main=./src/worker.mjs` и assets `./public`;
- package lock делает build воспроизводимым;
- клиентский прайс не показывает raw DB-категорию «Общие услуги», а группирует позиции в понятные клиенту разделы;
- травматологический день блокирует обычный выбор услуги в форме и показывает отдельный режим без фиксированной цены.

Residual risks: CSP всё ещё использует `unsafe-inline` из-за текущей single-file HTML архитектуры; следующий крупный security-refactor может вынести inline JS/CSS в отдельные assets и ужесточить CSP.
