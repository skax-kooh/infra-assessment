#!/bin/bash
echo "[CodeDeploy] BeforeInstall: Preparing environment..."

APP_DIR=/home/ec2-user/infra-assessment

# ── 1. Flask 앱(gunicorn) 중지 ─────────────────────────────────────────────
echo "[CodeDeploy] Stopping Flask app (gunicorn)..."
if [ -f "$APP_DIR/gunicorn.pid" ]; then
    kill $(cat $APP_DIR/gunicorn.pid) 2>/dev/null || true
    rm -f $APP_DIR/gunicorn.pid
    sleep 2
    echo "[CodeDeploy] Flask app stopped."
elif pgrep -f "gunicorn" > /dev/null; then
    pkill -f "gunicorn"
    sleep 2
    echo "[CodeDeploy] Flask app stopped."
else
    echo "[CodeDeploy] Flask app was not running."
fi

# ── 2. MCP 서버(uvicorn) 중지 ──────────────────────────────────────────────
echo "[CodeDeploy] Stopping MCP prompt server (uvicorn)..."
if [ -f "$APP_DIR/mcp_server.pid" ]; then
    kill $(cat $APP_DIR/mcp_server.pid) 2>/dev/null || true
    rm -f $APP_DIR/mcp_server.pid
    sleep 1
    echo "[CodeDeploy] MCP server stopped."
elif pgrep -f "mcp_prompt_server" > /dev/null; then
    pkill -f "mcp_prompt_server"
    sleep 1
    echo "[CodeDeploy] MCP server stopped."
else
    echo "[CodeDeploy] MCP server was not running."
fi

# ── 3. 기존 파일 삭제 (venv, logs, .env 유지) ───────────────────────────────
echo "[CodeDeploy] Cleaning up old files..."
if [ -d "$APP_DIR" ]; then
    find $APP_DIR -mindepth 1 \
        ! -path "$APP_DIR/venv*" \
        ! -path "$APP_DIR/logs*" \
        ! -path "$APP_DIR/.env" \
        -delete 2>/dev/null || true
    echo "[CodeDeploy] Old files removed."
fi

# ── 4. 필요한 디렉토리 생성 ────────────────────────────────────────────────
mkdir -p $APP_DIR/logs
chown -R ec2-user:ec2-user $APP_DIR

echo "[CodeDeploy] Environment ready."
