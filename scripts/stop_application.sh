#!/bin/bash
echo "[CodeDeploy] BeforeInstall: Preparing environment..."

APP_DIR=/home/ec2-user/infra-assessment

# 1. 기존 애플리케이션 중지
echo "[CodeDeploy] Stopping application..."
if pgrep -f "gunicorn" > /dev/null; then
    pkill -f "gunicorn"
    sleep 2
    echo "[CodeDeploy] Application stopped."
else
    echo "[CodeDeploy] Application was not running."
fi

# 2. 기존 파일 삭제 (venv와 logs는 유지)
echo "[CodeDeploy] Cleaning up old files..."
if [ -d "$APP_DIR" ]; then
    find $APP_DIR -mindepth 1 \
        ! -path "$APP_DIR/venv*" \
        ! -path "$APP_DIR/logs*" \
        ! -path "$APP_DIR/.env" \
        -delete 2>/dev/null || true
    echo "[CodeDeploy] Old files removed."
fi

# 3. 필요한 디렉토리 생성
mkdir -p $APP_DIR/logs
chown -R ec2-user:ec2-user $APP_DIR

echo "[CodeDeploy] Environment ready."
