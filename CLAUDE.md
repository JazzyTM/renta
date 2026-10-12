# Заметки для работы над кодом

- Язык интерфейса русский. Тексты простые и короткие, без маркетинговых оборотов. Цвета: белый и оранжевый (`--accent: #E8620C`), только светлая тема.
- Next.js 16: `proxy.ts` вместо middleware, `params`/`searchParams` — промисы. Документация в `node_modules/next/dist/docs`.
- Prisma 7: клиент генерируется в `src/generated/prisma` (`npx prisma generate`), URL базы в `prisma.config.ts`, клиент создаётся с `@prisma/adapter-pg`.
- Формы: серверное действие `(_: unknown, fd: FormData): Promise<FormState>` + компонент `ActionForm`. Параметры привязываются через `.bind(null, id)`.
- Новый справочник в админке: добавить описание в `CRUD` (`src/lib/crud.ts`) и ссылку в `src/app/admin/layout.tsx`.
- Новая настройка: добавить поле в `SETTINGS` (`src/lib/settings.ts`), форма появится сама.
- Изменение схемы — через `npx prisma migrate dev --name ...`; на сервере миграции применяет `deploy/update.sh`.
- Проверка перед коммитом: `npx tsc --noEmit` и `npm run build`.
- Платёжный провайдер пока не выбран (не ЮKassa). Модуль `src/lib/payments.ts` провайдер-независимый.
