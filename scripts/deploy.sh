#!/usr/bin/env bash
set -euo pipefail

# Deploy helper for mediator
# Usage: ./scripts/deploy.sh [branch]
# Defaults to 'main' if no branch supplied.
#
# DB strategy: local is the single source of truth.
#   1. Pull remote DB to local first (captures any remote-only writes).
#   2. Deploy code (git reset — DB is never touched remotely).
#   3. Push local DB to remote.
#   4. Restart pm2.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_USER="field2"
SSH_HOST="199.167.200.160"
SSH_PORT="2200"
REMOTE_PATH="/home/field2/public_html/mediator.field2.com"
BRANCH="${1:-main}"
LOCAL_DB="$SCRIPT_DIR/../server/mediator.db"

echo "Deploying branch '$BRANCH' to ${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

# ── Step 1: pull remote DB to local ──────────────────────────────────────────
echo "Pulling remote DB to local..."
scp -P "$SSH_PORT" -o ConnectTimeout=10 -o BatchMode=yes \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/server/mediator.db" \
  "$LOCAL_DB" \
  && echo "✓ Remote DB pulled to local" \
  || echo "⚠  No remote DB found — local copy will be pushed"

# ── Step 2: git update + build (no DB logic on remote) ───────────────────────
ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "BRANCH=$BRANCH REMOTE_PATH=$REMOTE_PATH bash -s" <<'REMOTE_EOF'
set -euo pipefail

echo "Working directory: $REMOTE_PATH"
cd "$REMOTE_PATH" || { echo "Remote path not found: $REMOTE_PATH"; exit 2; }

echo "Fetching latest from origin"
git fetch --all --prune

echo "Cleaning working directory"
git clean -fd

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" || true
fi

echo "Hard reset to origin/$BRANCH"
git reset --hard "origin/$BRANCH"

if [ -d client ]; then
  echo "Building client"
  cd client
  npm ci --prefer-offline --no-audit --no-fund
  npm run build || { echo "Client build failed"; exit 3; }
  cd ..

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
  cd ..
fi

echo "Build complete"
REMOTE_EOF

# ── Step 3: push local DB to remote (authoritative copy) ─────────────────────
echo "Pushing local DB to remote..."
scp -P "$SSH_PORT" "$LOCAL_DB" \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/server/mediator.db" \
  && echo "✓ DB pushed to remote" \
  || { echo "ERROR: failed to push DB to remote"; exit 5; }

# ── Step 4: restart pm2 ───────────────────────────────────────────────────────
echo "Restarting pm2..."
ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" \
  "cd ${REMOTE_PATH}/server && (npm run pm2:restart || pm2 restart ecosystem.config.js --env production || pm2 restart all)"

echo "Deploy finished"
echo "Done."
