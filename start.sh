#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env file found — generating one with random secrets..."

  JWT_SECRET=$(openssl rand -base64 48)
  ENCRYPTION_KEY=$(openssl rand -hex 32)

  cat > "$ENV_FILE" <<EOF
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
EOF

  echo "Created $ENV_FILE"
else
  # Ensure both keys exist, append any missing ones
  changed=false

  if ! grep -q '^JWT_SECRET=' "$ENV_FILE"; then
    echo "JWT_SECRET=$(openssl rand -base64 48)" >> "$ENV_FILE"
    echo "Added missing JWT_SECRET to $ENV_FILE"
    changed=true
  fi

  if ! grep -q '^ENCRYPTION_KEY=' "$ENV_FILE"; then
    echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> "$ENV_FILE"
    echo "Added missing ENCRYPTION_KEY to $ENV_FILE"
    changed=true
  fi

  if [ "$changed" = false ]; then
    echo ".env file OK"
  fi
fi

exec docker compose up -d
