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

# Backup database if it exists
DB_BACKUP="/tmp/mediator-db-backup-$(date +%s).db"
if [ -f "server/mediator.db" ]; then
  echo "Backing up database to $DB_BACKUP"
  cp server/mediator.db "$DB_BACKUP"
fi

echo "Cleaning working directory"
git clean -fd

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" || true
fi

echo "Hard reset to origin/$BRANCH"
git reset --hard "origin/$BRANCH"

# Restore database if backup exists
if [ -f "$DB_BACKUP" ]; then
  echo "Restoring database from backup"
  mkdir -p server
  cp "$DB_BACKUP" server/mediator.db
  rm "$DB_BACKUP"
  echo "✓ Database restored"
fi

if [ -f package.json ]; then
  echo "Installing root dependencies and running root build (if any)"
  npm ci --prefer-offline --no-audit --no-fund
  npm run build || echo "Root build not defined; skipping"
fi

if [ -d client ]; then
  echo "Building client"
  cd client
  npm ci --prefer-offline --no-audit --no-fund
  npm run build || { echo "Client build failed"; exit 3; }
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
  npm run build || { echo "Server build failed"; exit 4; }

  echo "Restarting pm2 using ecosystem.config.js"
  if [ -f ecosystem.config.js ]; then
    npm run pm2:restart || pm2 restart ecosystem.config.js --env production || pm2 restart all
  else
    pm2 restart all
  fi

  cd ..
fi

echo "Deploy finished"
REMOTE_EOF

echo "Done."
