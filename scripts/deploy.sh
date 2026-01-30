#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/var/www/questroom/repo}
APP_DIR=${2:-/var/www/questroom}
FRONTEND_DIR="$APP_DIR/frontend"
API_PUBLISH_DIR="$APP_DIR/api"
SERVICE_NAME=${3:-questroom-api}

cd "$ROOT_DIR"

git fetch origin main
git reset --hard origin/main

echo "Building frontend..."
npm ci
npm run build

sudo mkdir -p "$FRONTEND_DIR"
sudo rsync -a --delete dist/ "$FRONTEND_DIR/"

echo "Publishing API..."
dotnet restore api
dotnet publish api -c Release -o "$API_PUBLISH_DIR"

sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"

sudo systemctl --no-pager status "$SERVICE_NAME" || true
