#!/bin/bash
echo "[CodeDeploy] Validating service..."

# 최대 30초 대기하며 앱 응답 확인
for i in {1..6}; do
    if curl -s http://localhost:5000 > /dev/null; then
        echo "[CodeDeploy] Service is running successfully!"
        exit 0
    fi
    echo "[CodeDeploy] Waiting for service to start... ($i/6)"
    sleep 5
done

echo "[CodeDeploy] ERROR: Service did not start within 30 seconds."
exit 1
