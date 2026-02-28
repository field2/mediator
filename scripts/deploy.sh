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

# Backup database(s) if they exist.
# Runtime DB path depends on process cwd, so preserve both common locations.
DB_BACKUP_DIR="$(mktemp -d /tmp/mediator-db-backup-XXXXXX)"
DB_FILES=()
for DB_FILE in "mediator.db" "server/mediator.db"; do
  if [ -f "$DB_FILE" ]; then
    SAFE_NAME="${DB_FILE//\//__}"
    echo "Backing up $DB_FILE to $DB_BACKUP_DIR/$SAFE_NAME"
    cp "$DB_FILE" "$DB_BACKUP_DIR/$SAFE_NAME"
    DB_FILES+=("$DB_FILE")
  fi
done

echo "Cleaning working directory"
git clean -fd -e mediator.db -e server/mediator.db

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" || true
fi

echo "Hard reset to origin/$BRANCH"
git reset --hard "origin/$BRANCH"

# Restore any backed-up database files to their original paths
if [ ${#DB_FILES[@]} -gt 0 ]; then
  echo "Restoring database files from backup"
  for DB_FILE in "${DB_FILES[@]}"; do
    SAFE_NAME="${DB_FILE//\//__}"
    if [ -f "$DB_BACKUP_DIR/$SAFE_NAME" ]; then
      mkdir -p "$(dirname "$DB_FILE")"
      cp "$DB_BACKUP_DIR/$SAFE_NAME" "$DB_FILE"
      echo "✓ Restored $DB_FILE"
    fi
  done
fi
rm -rf "$DB_BACKUP_DIR"

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

  echo "Pruning server dev dependencies for production runtime"
  npm prune --omit=dev --no-audit --no-fund

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
