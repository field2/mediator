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

# Keep the Express static directory current.
echo "Syncing client build to server/public..."
rsync -avz --delete \
  -e "ssh -p $SSH_PORT" \
  dist/ \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/server/public/"

# Apache serves the site from the remote root. Sync top-level build files
# separately so --delete cannot remove the backend or other runtime files.
echo "Syncing frontend files to Apache document root..."
rsync -avz \
  --exclude "assets/" \
  -e "ssh -p $SSH_PORT" \
  dist/ \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/"

echo "Syncing frontend assets to Apache document root..."
rsync -avz --delete \
  -e "ssh -p $SSH_PORT" \
  dist/assets/ \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/assets/"

# Keep the running Node process aligned with server/public.
echo "Restarting server..."
ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}" "cd ${REMOTE_PATH} && pm2 restart mediator-server"

echo "✓ Sync complete"
