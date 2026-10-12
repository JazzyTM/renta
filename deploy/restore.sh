#!/usr/bin/env bash
# Восстановление базы из копии: sudo /opt/renta/deploy/restore.sh db-20270101-0330.sql.gz
# Фото: sudo /opt/renta/deploy/restore.sh uploads-20270101-0330.tar.gz
set -Eeuo pipefail
APP=/opt/renta
set -a; . "$APP/.env"; set +a
DIR="${BACKUP_DIR:-/var/backups/renta}"
F="$1"; [ -f "$F" ] || F="$DIR/$1"
[ -f "$F" ] || { echo "Нет файла $1. Копии:"; ls -1t "$DIR"; exit 1; }
read -r -p "Текущие данные будут заменены копией $(basename "$F"). Продолжить? [y/N] " a; [ "$a" = y ] || exit 1
"$APP/deploy/backup.sh" --db-only
systemctl stop renta
if [[ "$F" == *.sql.gz ]]; then
  sudo -u postgres psql -qc "DROP DATABASE IF EXISTS renta WITH (FORCE);" -c "CREATE DATABASE renta OWNER renta;"
  gunzip -c "$F" | psql -q "$DATABASE_URL"
else
  tar -xzf "$F" -C "$(dirname "$UPLOAD_DIR")"; chown -R renta:renta "$UPLOAD_DIR"
fi
systemctl start renta
echo "Восстановлено"
