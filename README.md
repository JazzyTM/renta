# Берег — сайт жилья у моря

Хозяева сами размещают гостевые дома, квартиры и отели на курортах Черноморского и Азовского побережья, Крыма и Абхазии. Гости находят жильё, звонят хозяину или отправляют заявку с датами.

Один проект на Next.js (App Router, server actions) + Prisma 7 + PostgreSQL.

## Установка на сервер (Ubuntu 24.04)

От root:

```bash
curl -fsSL https://raw.githubusercontent.com/JazzyTM/renta/main/deploy/install.sh | EMAIL=you@mail.ru bash
```

Скрипт ставит Node.js 22, PostgreSQL, nginx, создаёт базу, собирает сайт и запускает его как службу `renta`. В конце печатает почту и пароль администратора (они же в `/root/renta-admin.txt`).

Когда будет домен (A-запись указывает на сервер):

```bash
sudo /opt/renta/deploy/set-domain.sh example.ru you@mail.ru
```

## Обновление

- В админке: «Обновления» → «Обновить». Сервер сам скачает версию с GitHub, сделает копию базы, применит миграции, соберёт и перезапустит сайт. Если новая версия не поднялась, вернёт прошлую.
- По SSH: `sudo /opt/renta/deploy/update.sh` (откат: `--rollback`).
- Автообновление ночью включается в настройках админки.

## Резервные копии

Каждую ночь в `/var/backups/renta`: база (14 копий) и фото (3 копии). Вручную: `sudo /opt/renta/deploy/backup.sh`. Восстановить: `sudo /opt/renta/deploy/restore.sh db-ДАТА.sql.gz`.

## Где что на сервере

| Что | Где |
| --- | --- |
| Код | `/opt/renta` |
| Настройки окружения | `/opt/renta/.env` |
| Фото | `/var/lib/renta/uploads` |
| Журнал обновления | `/var/lib/renta/update.log` |
| Журнал сайта | `journalctl -u renta -f` |

## Разработка

```bash
cp .env.example .env    # указать DATABASE_URL
npm install
npx prisma migrate dev
SEED_DEMO=1 npm run db:seed   # курорты, удобства, админ admin@example.ru / admin12345, демо-объявления
npm run dev
```

## Устройство

- `src/app/(site)` — публичный сайт, вход, страница заявки, кабинет хозяина (`/cabinet`).
- `src/app/admin` — админка. Простые справочники описаны в `src/lib/crud.ts`, формы строятся по описанию.
- `src/lib/settings.ts` — все настройки сайта; админка строит по ним формы.
- `src/lib/payments.ts` — заготовка онлайн-оплаты. Провайдер подключается реализацией интерфейса `PaymentProvider`.
- `src/lib/plan.ts` — лимиты хозяина: бесплатный период, тариф.
- `deploy/` — установка, обновление, копии, systemd и nginx.
