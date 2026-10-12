#!/usr/bin/env bash
# Установка сайта на чистый сервер Ubuntu 24.04. Запускать от root:
#   curl -fsSL https://raw.githubusercontent.com/JazzyTM/renta/main/deploy/install.sh | bash
# Репозиторий приватный, поэтому нужен токен GitHub только на чтение (Contents: Read-only):
#   T=github_pat_...; curl -fsSL -H "Authorization: Bearer $T" -H "Accept: application/vnd.github.raw" https://api.github.com/repos/JazzyTM/renta/contents/deploy/install.sh | GITHUB_TOKEN=$T EMAIL=you@mail.ru bash
# С доменом добавьте DOMAIN=example.ru — сразу получит HTTPS-сертификат.
# Скрипт можно запускать повторно: он ничего не сломает и не сотрёт данные.
set -Eeuo pipefail

REPO="${REPO:-https://github.com/JazzyTM/renta.git}"
BRANCH="${BRANCH:-main}"
APP=/opt/renta
STATE=/var/lib/renta
BACKUPS=/var/backups/renta
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
[ -z "$GITHUB_TOKEN" ] && [ -f "$APP/.env" ] && GITHUB_TOKEN=$(grep -oP '^GITHUB_TOKEN="\K[^"]*' "$APP/.env" || true)
GIT=(git); [ -n "$GITHUB_TOKEN" ] && GIT=(git -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)")

say() { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Запустите от root (sudo -i)"; exit 1; }
. /etc/os-release
[ "$ID" = ubuntu ] || echo "Внимание: скрипт проверен на Ubuntu 24.04, у вас $PRETTY_NAME"

say "Пакеты системы"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -yq curl git nginx postgresql postgresql-contrib ca-certificates gnupg openssl rsync

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  say "Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -yq nodejs
fi

# Next.js при сборке требует ~1.5 ГБ памяти. На маленьком сервере добавим swap.
if [ "$(free -m | awk '/Mem:/{print $2}')" -lt 3000 ] && ! swapon --show | grep -q .; then
  say "Файл подкачки 2 ГБ"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Пользователь и папки"
id renta >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /bin/bash renta
mkdir -p "$STATE/uploads" "$BACKUPS"
chown -R renta:renta "$STATE"
chown root:renta "$BACKUPS"; chmod 750 "$BACKUPS"

say "Код сайта"
if [ -d "$APP/.git" ]; then
  sudo -u renta "${GIT[@]}" -C "$APP" fetch -q origin "$BRANCH"
else
  mkdir -p "$APP" && chown renta:renta "$APP"
  sudo -u renta "${GIT[@]}" clone -q -b "$BRANCH" "$REPO" "$APP" || { echo "Не удалось скачать код. Репозиторий приватный: передайте GITHUB_TOKEN"; exit 1; }
fi
chown -R renta:renta "$APP"

say "База данных"
FIRST=0
if [ ! -f "$APP/.env" ]; then
  FIRST=1
  DBPASS=$(openssl rand -hex 16)
  sudo -u postgres psql -qc "DO \$\$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='renta') THEN CREATE ROLE renta LOGIN PASSWORD '$DBPASS'; ELSE ALTER ROLE renta PASSWORD '$DBPASS'; END IF; END\$\$;"
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='renta'" | grep -q 1 || sudo -u postgres createdb -O renta renta
  IP=$(curl -fsS4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
  URL="http://$IP"; [ -n "$DOMAIN" ] && URL="https://$DOMAIN"
  cat > "$APP/.env" <<ENV
NODE_ENV=production
DATABASE_URL="postgresql://renta:$DBPASS@127.0.0.1:5432/renta"
AUTH_SECRET="$(openssl rand -hex 32)"
CRON_SECRET="$(openssl rand -hex 16)"
APP_URL="$URL"
UPLOAD_DIR="$STATE/uploads"
STATE_DIR="$STATE"
BACKUP_DIR="$BACKUPS"
GITHUB_TOKEN="$GITHUB_TOKEN"
ENV
  chown renta:renta "$APP/.env"; chmod 600 "$APP/.env"
fi

say "Сборка (несколько минут)"
sudo -u renta -H bash -c "cd $APP && npm ci --no-audit --no-fund && npx prisma migrate deploy && npm run build"

if [ "$FIRST" = 1 ]; then
  say "Начальные данные: курорты, удобства, администратор"
  ADMIN_EMAIL="${EMAIL:-admin@example.ru}"
  ADMIN_PASS=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-12)
  sudo -u renta -H bash -c "cd $APP && SEED_ADMIN_EMAIL='$ADMIN_EMAIL' SEED_ADMIN_PASSWORD='$ADMIN_PASS' npm run db:seed"
  printf 'Вход в админку: %s/login\nПочта: %s\nПароль: %s\n' "$(grep APP_URL $APP/.env | cut -d'"' -f2)" "$ADMIN_EMAIL" "$ADMIN_PASS" > /root/renta-admin.txt
  chmod 600 /root/renta-admin.txt
fi

say "Службы"
chmod +x "$APP"/deploy/*.sh
cp "$APP"/deploy/systemd/* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now renta.service renta-update.path renta-backup.path renta-backup.timer renta-autoupdate.timer renta-cron.timer
systemctl restart renta.service

say "Веб-сервер nginx"
sed "s/__DOMAIN__/${DOMAIN:-_}/" "$APP/deploy/nginx.conf" > /etc/nginx/sites-available/renta
ln -sf /etc/nginx/sites-available/renta /etc/nginx/sites-enabled/renta
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

if [ -n "$DOMAIN" ]; then "$APP/deploy/set-domain.sh" "$DOMAIN" "$EMAIL"; fi

say "Проверка"
for i in $(seq 1 30); do curl -fs http://127.0.0.1:3000/api/health >/dev/null && break; sleep 2; done
curl -fs http://127.0.0.1:3000/api/health >/dev/null && echo "Сайт работает" || { echo "Сайт не ответил. Журнал: journalctl -u renta -n 100"; exit 1; }
echo
cat /root/renta-admin.txt 2>/dev/null || true
echo "Данные для входа сохранены в /root/renta-admin.txt"
