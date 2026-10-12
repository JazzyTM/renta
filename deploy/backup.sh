#!/usr/bin/env bash
# Резервная копия базы (и фото, если без --db-only). Хранит 14 последних копий базы и 3 копии фото.
set -Eeuo pipefail
APP=/opt/renta; STATE=/var/lib/renta
set -a; . "$APP/.env"; set +a
DIR="${BACKUP_DIR:-/var/backups/renta}"; mkdir -p "$DIR"
rm -f "$STATE/backup-request"
TS=$(date +%Y%m%d-%H%M)
pg_dump --no-owner "$DATABASE_URL" | gzip > "$DIR/db-$TS.sql.gz"
echo "База: $DIR/db-$TS.sql.gz"
if [ "${1:-}" != "--db-only" ]; then
  tar -czf "$DIR/uploads-$TS.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
  echo "Фото: $DIR/uploads-$TS.tar.gz"
fi
ls -1t "$DIR"/db-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "$DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
# Админка (пользователь renta) видит список копий, остальные нет
chown root:renta "$DIR" "$DIR"/* 2>/dev/null || true
chmod 750 "$DIR"; chmod 640 "$DIR"/* 2>/dev/null || true
