#!/bin/bash
echo "[CodeDeploy] BeforeInstall: Preparing environment..."

APP_DIR=/home/ec2-user/infra-assessment

# 배포 대상 디렉토리가 없으면 생성
if [ ! -d "$APP_DIR" ]; then
    echo "[CodeDeploy] Creating app directory: $APP_DIR"
    mkdir -p $APP_DIR
    chown ec2-user:ec2-user $APP_DIR
fi

# logs 디렉토리 생성
mkdir -p $APP_DIR/logs
chown -R ec2-user:ec2-user $APP_DIR/logs

# 기존 애플리케이션 중지
echo "[CodeDeploy] Stopping application..."
if pgrep -f "gunicorn" > /dev/null; then
    pkill -f "gunicorn"
    sleep 2
    echo "[CodeDeploy] Application stopped."
else
    echo "[CodeDeploy] Application was not running."
fi
