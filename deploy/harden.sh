#!/usr/bin/env bash
# Защита сервера: файрвол, fail2ban, автоматические обновления безопасности, скрытая версия nginx.
# Запускается при установке и один раз при обновлении. Вручную: sudo /opt/renta/deploy/harden.sh
set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get install -yq ufw fail2ban unattended-upgrades >/dev/null

# Порт SSH берём из настроек sshd, чтобы не закрыть себе доступ
SSH_PORTS=$(sshd -T 2>/dev/null | awk '/^port /{print $2}' | sort -u)
[ -n "$SSH_PORTS" ] || SSH_PORTS=22
for p in $SSH_PORTS; do ufw allow "$p/tcp" >/dev/null; done
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw --force enable >/dev/null
echo "Файрвол: открыты SSH ($SSH_PORTS), 80, 443"

cat > /etc/fail2ban/jail.d/renta.conf <<CONF
[sshd]
enabled = true
port = $(echo $SSH_PORTS | tr ' ' ',')
maxretry = 5
findtime = 10m
bantime = 1h
CONF
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban
echo "fail2ban: 5 неверных входов по SSH — бан на час"

cat > /etc/apt/apt.conf.d/20auto-upgrades <<CONF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF
echo "Обновления безопасности Ubuntu ставятся автоматически"

echo 'server_tokens off;' > /etc/nginx/conf.d/renta-security.conf
nginx -t >/dev/null 2>&1 && systemctl reload nginx

# PostgreSQL слушает только локальный адрес (так по умолчанию, проверяем)
PGCONF=$(ls /etc/postgresql/*/main/postgresql.conf 2>/dev/null | head -1)
if [ -n "$PGCONF" ] && grep -Eq "^\s*listen_addresses\s*=\s*'\*'" "$PGCONF"; then
  sed -i "s/^\s*listen_addresses.*/listen_addresses = 'localhost'/" "$PGCONF"; systemctl restart postgresql
fi

chmod 600 /opt/renta/.env 2>/dev/null || true
mkdir -p /var/lib/renta && touch /var/lib/renta/.hardened-v1
echo "Готово"
