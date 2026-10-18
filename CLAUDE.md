# Заметки для работы над кодом

- Язык интерфейса русский. Тексты простые и короткие, без маркетинговых оборотов. Дизайн по образцу kudanamore.ru (прошлый проект Alex): Roboto, оранжевый `#FF5722`, серый фон внутренних страниц и белые панели, без теней и градиентов. Только светлая тема. Слои стилей в `globals.css`: «Дизайн v4», за ним «Адаптив» (телефоны и планшеты), последним «Дизайн v5» (скругления, поиск одной панелью, подвал колонками). Без фото показываются SVG-рисунки из `src/components/Art.tsx`. Проверять вёрстку на 360, 390, 820 и 1280 px.
- Next.js 16: `proxy.ts` вместо middleware, `params`/`searchParams` — промисы. Документация в `node_modules/next/dist/docs`.
- Prisma 7: клиент генерируется в `src/generated/prisma` (`npx prisma generate`), URL базы в `prisma.config.ts`, клиент создаётся с `@prisma/adapter-pg`.
- Формы: серверное действие `(_: unknown, fd: FormData): Promise<FormState>` + компонент `ActionForm`. Параметры привязываются через `.bind(null, id)`.
- Новый справочник в админке: добавить описание в `CRUD` (`src/lib/crud.ts`) и ссылку в `src/app/admin/layout.tsx`.
- Новая настройка: добавить поле в `SETTINGS` (`src/lib/settings.ts`), форма появится сама.
- Изменение схемы — через `npx prisma migrate dev --name ...`; на сервере миграции применяет `deploy/update.sh`.
- Проверка перед коммитом: `npx tsc --noEmit` и `npm run build`.
- Платёжный провайдер пока не выбран (не ЮKassa). Модуль `src/lib/payments.ts` провайдер-независимый.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
