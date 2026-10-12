#!/usr/bin/env bash
# Обновление сайта до последней версии с GitHub. По SSH: sudo /opt/renta/deploy/update.sh
# Откат на прошлую версию: sudo /opt/renta/deploy/update.sh --rollback
# Кнопка в админке создаёт файл-запрос, а служба renta-update.path запускает этот скрипт.
set -Eeuo pipefail
APP=/opt/renta; STATE=/var/lib/renta; LOG=$STATE/update.log
MODE="${1:-}"

exec 9>/run/renta-update.lock
flock -n 9 || { echo "Обновление уже идёт"; exit 0; }

set -a; . "$APP/.env"; set +a
setting() { psql "$DATABASE_URL" -tAc "SELECT value#>>'{}' FROM \"Setting\" WHERE key='$1'" 2>/dev/null || true; }

KIND=update
case "$MODE" in
  --from-request)
    [ -f "$STATE/update-request" ] || exit 0
    grep -q '"kind":"rollback"' "$STATE/update-request" && KIND=rollback
    rm -f "$STATE/update-request" ;;
  --auto) [ "$(setting autoUpdate)" = "true" ] || exit 0 ;;
  --rollback) KIND=rollback ;;
esac

: > "$LOG"; chown renta:renta "$LOG"
exec > >(tee -a "$LOG") 2>&1
status() { printf '{"state":"%s","at":"%s","from":"%s","to":"%s","error":"%s"}\n' "$1" "$(date -Is)" "${OLD:-}" "${TARGET:-}" "${2:-}" > "$STATE/status.json"; chown renta:renta "$STATE/status.json"; }
as_renta() { sudo -u renta -H bash -c "cd $APP && $*"; }

BRANCH=$(setting githubBranch); BRANCH=${BRANCH:-main}
TOKEN=$(setting githubToken)
GITAUTH=""; [ -n "$TOKEN" ] && GITAUTH="-c http.extraHeader='Authorization: Bearer $TOKEN'"

cd "$APP"
OLD=$(as_renta git rev-parse HEAD)
echo "$(date '+%F %T') Текущая версия: ${OLD:0:7}"

if [ "$KIND" = rollback ]; then
  TARGET=$(cat "$STATE/prev-version" 2>/dev/null || true)
  [ -n "$TARGET" ] || { echo "Нет сохранённой прошлой версии"; status failed "Нет прошлой версии для отката"; exit 1; }
else
  as_renta git $GITAUTH fetch -q origin "$BRANCH"
  TARGET=$(as_renta git rev-parse "origin/$BRANCH")
  if [ "$TARGET" = "$OLD" ]; then echo "Уже установлена последняя версия"; status ok; exit 0; fi
fi
echo "Ставлю версию: ${TARGET:0:7}"
status running

echo "== Копия базы перед обновлением"
"$APP/deploy/backup.sh" --db-only || echo "Не удалось сделать копию, продолжаю"

deploy() {
  as_renta git reset -q --hard "$1"
  chmod +x "$APP"/deploy/*.sh
  echo "== Зависимости"; as_renta npm ci --no-audit --no-fund
  echo "== Миграции базы"; as_renta npx prisma migrate deploy
  echo "== Сборка"; as_renta npm run build
  if ! cmp -s "$APP/deploy/systemd/renta.service" /etc/systemd/system/renta.service; then cp "$APP"/deploy/systemd/* /etc/systemd/system/; systemctl daemon-reload; fi
  echo "== Перезапуск"; systemctl restart renta
  for i in $(seq 1 45); do curl -fs http://127.0.0.1:3000/api/health >/dev/null && return 0; sleep 2; done
  echo "Сайт не ответил после перезапуска"; return 1
}

if deploy "$TARGET"; then
  echo "$OLD" > "$STATE/prev-version"
  status ok
  echo "$(date '+%F %T') Готово"
else
  echo "== Ошибка. Возвращаю версию ${OLD:0:7}"
  deploy "$OLD" || true
  TARGET_FAILED=$TARGET; TARGET=$OLD
  status failed "Версия ${TARGET_FAILED:0:7} не установилась, вернул прошлую. Подробности в журнале"
  exit 1
fi
