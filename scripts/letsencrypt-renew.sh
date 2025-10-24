#!/usr/bin/env bash
set -euo pipefail

# Renovación de certificados (puede programarse vía cron del host)
# Ejecuta renovación silenciosa y recarga nginx si hubo cambios

echo "Ejecutando renovación de certificados..."
docker compose run --rm certbot renew --quiet

echo "Recargando nginx..."
docker compose exec -T nginx nginx -s reload

echo "Renovación finalizada."
#!/usr/bin/env bash
set -euo pipefail

# Emisión inicial de certificados con Let’s Encrypt usando webroot
# Requiere variables DOMAIN y CERTBOT_EMAIL definidas en .env

if [[ ! -f .env ]]; then
  echo "Falta .env. Copia .env.example a .env y ajusta DOMAIN y CERTBOT_EMAIL." >&2
  exit 1
fi

# Exporta variables por si docker compose no las carga automáticamente en run
export $(grep -v '^#' .env | xargs -d '\n' -r)

if [[ -z "${DOMAIN:-}" || -z "${CERTBOT_EMAIL:-}" ]]; then
  echo "Debes definir DOMAIN y CERTBOT_EMAIL en .env" >&2
  exit 1
fi

# Asegúrate de que nginx esté arriba (sirviendo /.well-known/acme-challenge/)
# para que el desafío HTTP-01 funcione

echo "Levantando nginx para validación ACME..."
docker compose up -d nginx

# Espera breve a que nginx inicie
sleep 3

echo "Solicitando certificado para $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email

# Recargar nginx para usar el nuevo certificado
echo "Recargando nginx..."
docker compose exec -T nginx nginx -s reload

echo "Certificado emitido y nginx recargado."

