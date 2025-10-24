#!/bin/sh
set -e

TEMPLATE=/etc/nginx/conf.d/default.conf.template
OUTPUT=/etc/nginx/conf.d/default.conf
DOMAIN="$SERVER_NAME"
LE_FULLCHAIN="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

if [ -n "$DOMAIN" ] && [ -f "$LE_FULLCHAIN" ]; then
  echo "[nginx] Certificado encontrado para $DOMAIN. Habilitando HTTPS."
  # Reemplazo simple de placeholder ${SERVER_NAME} en la plantilla
  sed "s|\${SERVER_NAME}|$DOMAIN|g" "$TEMPLATE" > "$OUTPUT"
else
  echo "[nginx] Certificado NO encontrado para $DOMAIN. Iniciando en HTTP-only para ACME."
  cat > "$OUTPUT" <<EOF
# Config generado en arranque (sin certificados)
server {
  listen 80;
  server_name ${DOMAIN};

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 200 'ACME webroot listo. Emite el certificado y nginx se recargará a HTTPS.';
    add_header Content-Type text/plain;
  }
}
EOF
fi

exec nginx -g 'daemon off;'
