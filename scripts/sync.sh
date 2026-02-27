#!/usr/bin/env bash
set -euo pipefail

# Quick sync for minor updates (CSS, frontend changes)
# Usage: ./scripts/sync.sh

SSH_USER="field2"
SSH_HOST="199.167.200.160"
SSH_PORT="2200"
REMOTE_PATH="/home/field2/public_html/mediator.field2.com"

echo "Quick sync to ${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"

# Build client locally
echo "Building client locally..."
cd "$(dirname "$0")/../client"
npm run build

# Sync only the built assets
echo "Syncing client build to remote..."
rsync -avz --delete \
  -e "ssh -p $SSH_PORT" \
  dist/ \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/server/public/"

# Restart PM2 to clear cached index.html
echo "Restarting server..."
ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}" "cd ${REMOTE_PATH} && pm2 restart mediator-server"

echo "✓ Sync complete"
