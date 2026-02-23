#!/bin/bash
echo "[CodeDeploy] Stopping application..."

if pgrep -f "gunicorn" > /dev/null; then
    pkill -f "gunicorn"
    sleep 2
    echo "[CodeDeploy] Application stopped."
else
    echo "[CodeDeploy] Application was not running."
fi
