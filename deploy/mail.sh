#!/usr/bin/env bash
# Свой почтовый сервер для писем сайта: Postfix только на отправку + подпись DKIM (OpenDKIM).
# Слушает лишь 127.0.0.1:25, наружу ничего не открывает, пароли не нужны.
# Запуск: sudo /opt/renta/deploy/mail.sh naberegu.su
# В конце печатает DNS-записи, которые нужно добавить у регистратора, и что попросить у хостинга (PTR).
set -Eeuo pipefail
DOMAIN="${1:-}"; APP=/opt/renta
[ -n "$DOMAIN" ] || { echo "Укажите домен: sudo $0 example.ru"; exit 1; }
IP=$(curl -fsS4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
export DEBIAN_FRONTEND=noninteractive

echo "== Пакеты"
echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections
echo "postfix postfix/mailname string $DOMAIN" | debconf-set-selections
apt-get install -yq postfix opendkim opendkim-tools >/dev/null

echo "== Postfix (только отправка)"
postconf -e "myhostname = $DOMAIN" "mydomain = $DOMAIN" "myorigin = $DOMAIN" \
  "inet_interfaces = loopback-only" "inet_protocols = ipv4" "mydestination = localhost" "relayhost =" \
  "smtp_tls_security_level = may" "smtp_tls_loglevel = 1" "smtpd_tls_security_level = none" \
  "smtpd_milters = inet:127.0.0.1:8891" "non_smtpd_milters = inet:127.0.0.1:8891" \
  "milter_default_action = accept" "milter_protocol = 6" "message_size_limit = 20480000" \
  "disable_vrfy_command = yes" 'smtpd_banner = $myhostname ESMTP'
echo "$DOMAIN" > /etc/mailname

echo "== Подпись DKIM"
KEYS=/etc/opendkim/keys/$DOMAIN
mkdir -p "$KEYS"
[ -f "$KEYS/mail.private" ] || opendkim-genkey -b 2048 -d "$DOMAIN" -s mail -D "$KEYS"
chown -R opendkim:opendkim /etc/opendkim; chmod 600 "$KEYS/mail.private"
cat > /etc/opendkim.conf <<EOF
Syslog yes
UMask 007
Mode sv
Canonicalization relaxed/simple
SubDomains no
OversignHeaders From
Domain $DOMAIN
Selector mail
KeyFile $KEYS/mail.private
Socket inet:8891@127.0.0.1
PidFile /run/opendkim/opendkim.pid
UserID opendkim
EOF
systemctl enable -q opendkim postfix
systemctl restart opendkim postfix

echo "== Сайт отправляет письма через этот сервер"
if [ -f "$APP/.env" ]; then
  set -a; . "$APP/.env"; set +a
  psql "$DATABASE_URL" -qc "INSERT INTO \"Setting\"(key,value,\"updatedAt\") VALUES ('smtpHost','\"127.0.0.1\"',now()),('smtpPort','25',now()),('smtpUser','\"\"',now()),('smtpPass','\"\"',now()),('smtpFrom','\"Наберегу <no-reply@$DOMAIN>\"',now()) ON CONFLICT (key) DO UPDATE SET value=excluded.value, \"updatedAt\"=now();" && echo "Настройки почты сайта записаны"
fi

DKIM=$(sed -n 's/.*"\(.*\)".*/\1/p' "$KEYS/mail.txt" | tr -d '\n\t ')
cat <<EOF

============================================================
Добавьте у регистратора домена (DNS) записи TXT:

1) SPF — кто может отправлять от имени $DOMAIN
   Имя: @        Значение: v=spf1 ip4:$IP ~all
   (если в домене уже есть запись v=spf1 — не добавляйте вторую, а впишите ip4:$IP в существующую)

2) DKIM — подпись писем
   Имя: mail._domainkey
   Значение: $DKIM

3) DMARC — что делать с поддельными письмами
   Имя: _dmarc   Значение: v=DMARC1; p=none; adkim=r; aspf=r

И попросите хостинг сервера настроить обратную запись (PTR) для IP $IP → $DOMAIN.
Без неё Gmail и часть почтовиков отклоняют письма.
============================================================
EOF
