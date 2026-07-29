#!/bin/bash
# Maritime Platform - Keep Alive Server Wrapper
# Auto-restarts the server if it crashes or gets killed
cd /home/z/my-project

export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NODE_ENV="production"
export NODE_OPTIONS="--max-old-space-size=256"

echo "[$(date)] Maritime Analytics Platform - Keep Alive Wrapper"

while true; do
  echo "[$(date)] Starting server..."
  node .next/standalone/server.js >> /tmp/maritime-server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited (code: $EXIT_CODE), restarting immediately..."
  # Small delay to avoid tight restart loop
  sleep 1
done
