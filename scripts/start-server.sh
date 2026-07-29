#!/bin/bash
# Maritime Platform Server Starter
cd /home/z/my-project

export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NODE_ENV="production"

echo "=== Maritime Analytics Platform ==="
echo "Starting production server..."

# Keep restarting on crash
while true; do
  node .next/standalone/server.js 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..."
  sleep 2
done
