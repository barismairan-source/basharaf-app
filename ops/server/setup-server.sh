#!/usr/bin/env bash
# One-time (idempotent) setup of basharaf-app on the meeez VPS. Run as root on the server from a copy of ops/server:
#   rsync -a ops/server/ root@94.184.45.140:/root/basharaf-ops/
#   ssh root@94.184.45.140 bash /root/basharaf-ops/setup-server.sh base
#   ssh root@94.184.45.140 bash /root/basharaf-ops/setup-server.sh site vps.basharaf.me            # staging name
#   ssh root@94.184.45.140 bash /root/basharaf-ops/setup-server.sh site basharaf.me www.basharaf.me # after the DNS switch
# Nothing here touches meeez, and nothing here contains a secret.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=/srv/basharaf

base() {
  # swap: the build needs more than the server's 2 GB of RAM
  if ! swapon --show | grep -q .; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -q vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/90-swappiness.conf
    echo "swap: 2G on"
  fi

  id basharaf >/dev/null 2>&1 || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin basharaf

  # like /srv/meeez: deploy owns the folder so it can swap the "current" link atomically
  install -d -o deploy -g deploy -m 755 "$ROOT"
  install -d -o deploy -g deploy -m 755 "$ROOT/releases" "$ROOT/incoming" "$ROOT/build" "$ROOT/npm-cache"
  install -d -o basharaf -g basharaf -m 755 "$ROOT/cache"
  touch "$ROOT/.lock" && chown deploy:deploy "$ROOT/.lock"

  # secrets: root only (systemd reads it); build values: readable by deploy, public NEXT_PUBLIC_* only
  install -d -o root -g root -m 755 /etc/basharaf
  [ -f /etc/basharaf/env ] || install -o root -g root -m 600 "$HERE/env.template" /etc/basharaf/env
  [ -f /etc/basharaf/build.env ] || install -o root -g deploy -m 640 /dev/null /etc/basharaf/build.env

  install -o root -g root -m 755 "$HERE/basharaf-release" /usr/local/bin/basharaf-release
  install -o root -g root -m 440 "$HERE/sudoers-basharaf-deploy" /etc/sudoers.d/basharaf-deploy
  visudo -cf /etc/sudoers.d/basharaf-deploy >/dev/null

  install -o root -g root -m 644 "$HERE/basharaf.service" /etc/systemd/system/basharaf.service
  systemctl daemon-reload
  systemctl enable basharaf >/dev/null 2>&1 || true   # started by the first release

  install -o root -g root -m 644 "$HERE/nginx-basharaf-proxy.conf" /etc/nginx/snippets/basharaf-proxy.conf
  echo "base: done"
}

site() {
  local canonical=$1; shift
  local aliases="$*" names="$canonical $*" d
  local conf=/etc/nginx/sites-available/basharaf

  # 1) HTTP only, so certbot can answer its challenge for these names
  cat > "$conf" <<EOF
upstream basharaf_app { server 127.0.0.1:3001; keepalive 16; }
server {
  listen 80; listen [::]:80;
  server_name $names;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 503; }
}
EOF
  ln -sfn "$conf" /etc/nginx/sites-enabled/basharaf
  nginx -t -q && systemctl reload nginx

  local dargs=""; for d in $names; do dargs="$dargs -d $d"; done
  certbot certonly --webroot -w /var/www/html --cert-name "$canonical" $dargs \
    --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring

  # 2) the real site from the template
  local alias_block=""
  if [ -n "$aliases" ]; then
    alias_block="server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name $aliases;
  ssl_certificate /etc/letsencrypt/live/$canonical/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$canonical/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  add_header Strict-Transport-Security \"max-age=15552000\" always;
  return 301 https://$canonical\$request_uri;
}"
  fi
  python3 - "$HERE/nginx-basharaf.conf.template" "$conf" "$canonical" "$aliases" "$alias_block" <<'PY'
import sys
src, dst, canonical, aliases, alias_block = sys.argv[1:6]
s = open(src).read()
s = s.replace('__ALIAS_BLOCK__', alias_block).replace('__CANONICAL__', canonical)
s = s.replace('__ALIASES__', aliases).replace('__CERT__', canonical)
open(dst, 'w').write(s)
PY
  nginx -t -q && systemctl reload nginx
  echo "site: https://$canonical"
}

case "${1:-}" in
  base) base ;;
  site) shift; [ $# -ge 1 ] || { echo "usage: setup-server.sh site <canonical> [aliases...]" >&2; exit 1; }; site "$@" ;;
  *) echo "usage: setup-server.sh base | site <canonical> [aliases...]" >&2; exit 1 ;;
esac
