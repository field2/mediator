#!/usr/bin/env bash
set -euo pipefail

# Deploy helper for mediator
# Usage: ./scripts/deploy.sh [branch]
# Defaults to 'main' if no branch supplied.

SSH_USER="field2"
SSH_HOST="199.167.200.160"
SSH_PORT="2200"
REMOTE_PATH="/home/field2/public_html/mediator.field2.com"
BRANCH="${1:-main}"

echo "Deploying branch '$BRANCH' to ${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "BRANCH=$BRANCH REMOTE_PATH=$REMOTE_PATH bash -s" <<'REMOTE_EOF'
set -euo pipefail

echo "Working directory: $REMOTE_PATH"
cd "$REMOTE_PATH" || { echo "Remote path not found: $REMOTE_PATH"; exit 2; }

echo "Fetching latest from origin"
git fetch --all --prune

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" || true
fi

git reset --hard "origin/$BRANCH"

if [ -f package.json ]; then
  echo "Installing root dependencies and running root build (if any)"
  npm ci --prefer-offline --no-audit --no-fund
  if npm run build --silent; then
    echo "Root build succeeded"
  else
    echo "Root build either not defined or failed; continuing"
  fi
fi

if [ -d client ]; then
  echo "Building client"
  cd client
  npm ci --prefer-offline --no-audit --no-fund
  npm run build --silent || echo "Client build failed or not defined"
  cd ..

  # Copy client build to server/public so Express can serve it
  if [ -d client/dist ]; then
    echo "Copying client build to server/public"
    rm -rf server/public/assets server/public/index.html
    cp -r client/dist/* server/public/
  fi
fi

if [ -d server ]; then
  echo "Building server"
  cd server
  npm ci --prefer-offline --no-audit --no-fund
  npm run build --silent || echo "Server build failed or not defined"

  echo "Restarting pm2 using ecosystem.config.js if available"
  if [ -f ecosystem.config.js ]; then
    npm run pm2:restart --silent || pm2 restart ecosystem.config.js --env production || pm2 restart all || true
  else
    pm2 restart all || true
  fi

  cd ..
fi

echo "Deploy finished"
REMOTE_EOF

echo "Done."
