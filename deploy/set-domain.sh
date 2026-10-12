#!/usr/bin/env bash
# Подключить домен и HTTPS, когда он куплен и его A-запись указывает на этот сервер:
#   sudo /opt/renta/deploy/set-domain.sh example.ru you@mail.ru
set -Eeuo pipefail
DOMAIN="$1"; EMAIL="${2:-}"; APP=/opt/renta
[ -n "$DOMAIN" ] || { echo "Укажите домен"; exit 1; }
apt-get install -yq certbot python3-certbot-nginx
sed "s/__DOMAIN__/$DOMAIN www.$DOMAIN/" "$APP/deploy/nginx.conf" > /etc/nginx/sites-available/renta
nginx -t && systemctl reload nginx
MAIL=(--register-unsafely-without-email); [ -n "$EMAIL" ] && MAIL=(-m "$EMAIL")
certbot --nginx --non-interactive --agree-tos --redirect "${MAIL[@]}" -d "$DOMAIN" -d "www.$DOMAIN" || certbot --nginx --non-interactive --agree-tos --redirect "${MAIL[@]}" -d "$DOMAIN"
sed -i "s|^APP_URL=.*|APP_URL=\"https://$DOMAIN\"|" "$APP/.env"
systemctl restart renta
echo "Готово: https://$DOMAIN"
