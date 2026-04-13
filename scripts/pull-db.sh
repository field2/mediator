#!/usr/bin/env bash
# Pull the remote production DB to local.
# Safe to run offline — exits 0 with a warning if unreachable.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_USER="field2"
SSH_HOST="199.167.200.160"
SSH_PORT="2200"
REMOTE_PATH="/home/field2/public_html/mediator.field2.com"
LOCAL_DB="$SCRIPT_DIR/../server/mediator.db"

echo "Pulling remote DB to local..."
scp -P "$SSH_PORT" -o ConnectTimeout=5 -o BatchMode=yes \
  "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/server/mediator.db" \
  "$LOCAL_DB" \
  && echo "✓ Remote DB pulled to server/mediator.db" \
  || echo "⚠  Could not pull remote DB (offline or missing) — using existing local copy"
