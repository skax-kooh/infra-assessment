#!/bin/bash
echo "[CodeDeploy] Starting application..."

APP_DIR=/home/ec2-user/infra-assessment
cd $APP_DIR

source venv/bin/activate

# .env 파일이 있으면 환경변수 로드
if [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# logs 디렉토리 확인
mkdir -p $APP_DIR/logs

# ── 1. MCP 프롬프트 서버 시작 (포트 8000) ──────────────────────────────────
echo "[CodeDeploy] Starting MCP prompt server on port 8000..."
nohup uvicorn mcp_prompt_server.app:app \
    --host 0.0.0.0 \
    --port 8000 \
    --log-level info \
    > $APP_DIR/logs/mcp_server.log 2>&1 &
echo $! > $APP_DIR/mcp_server.pid
echo "[CodeDeploy] MCP server started (PID: $(cat $APP_DIR/mcp_server.pid))"

# MCP 서버 초기화 대기
sleep 3

# ── 2. Flask 앱 시작 (포트 5000) ───────────────────────────────────────────
echo "[CodeDeploy] Starting Flask app on port 5000..."
nohup gunicorn \
    --workers 4 \
    --timeout 120 \
    --bind 0.0.0.0:5000 \
    --access-logfile $APP_DIR/logs/access.log \
    --error-logfile $APP_DIR/logs/error.log \
    --pid $APP_DIR/gunicorn.pid \
    --daemon \
    app:app

echo "[CodeDeploy] Application started. Flask:5000, MCP:8000"
