#!/bin/bash
export DATABASE_URL=file:/home/z/my-project/db/custom.db
cd /home/z/my-project
while true; do
  node .next/standalone/server.js -p 3000 2>&1
  echo "Server died, restarting in 2s..."
  sleep 2
done
