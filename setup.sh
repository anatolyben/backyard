#!/bin/bash
set -e

echo "==> backyard setup"

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "==> Docker installed"
else
  echo "==> Docker already installed, skipping"
fi

# Install Docker Compose plugin if not available
if ! docker compose version &> /dev/null; then
  echo "==> Installing Docker Compose plugin..."
  apt-get update -y
  apt-get install -y docker-compose-plugin
  echo "==> Docker Compose installed"
else
  echo "==> Docker Compose already installed, skipping"
fi

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  echo "==> .env created — fill in your values before running pnpm up"
else
  echo "==> .env already exists, skipping"
fi

echo "==> Setup complete"
echo ""
echo "Next steps:"
echo "  1. Edit .env and fill in BOT_TOKEN, POSTGRES_PASSWORD, REDIS_PASSWORD"
echo "  2. Run: docker compose up -d"
echo "  3. Send /ping to your bot in Telegram"
echo "  4. It should reply: pong"
