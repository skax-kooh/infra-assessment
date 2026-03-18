#!/bin/bash
echo "[CodeDeploy] Validating service..."

# ── 1. Flask 앱 응답 확인 (포트 5000) ─────────────────────────────────────
echo "[CodeDeploy] Checking Flask app (port 5000)..."
for i in {1..6}; do
    if curl -s http://localhost:5000 > /dev/null; then
        echo "[CodeDeploy] Flask app is running successfully!"
        break
    fi
    echo "[CodeDeploy] Waiting for Flask app... ($i/6)"
    sleep 5
    if [ $i -eq 6 ]; then
        echo "[CodeDeploy] ERROR: Flask app did not start within 30 seconds."
        exit 1
    fi
done

# ── 2. MCP 서버 응답 확인 (포트 8000) ─────────────────────────────────────
echo "[CodeDeploy] Checking MCP server (port 8000)..."
for i in {1..4}; do
    if curl -s http://localhost:8000/prompt/mcp > /dev/null; then
        echo "[CodeDeploy] MCP server is running successfully!"
        exit 0
    fi
    echo "[CodeDeploy] Waiting for MCP server... ($i/4)"
    sleep 3
done

# MCP 서버 미응답 시 경고만 출력 (Flask 동작하면 배포 성공으로 처리)
echo "[CodeDeploy] WARNING: MCP server did not respond, but Flask is running. Deployment continues."
exit 0
