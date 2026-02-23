#!/bin/bash
echo "[CodeDeploy] Starting application..."

APP_DIR=/home/ec2-user/infra-assessment
cd $APP_DIR

source venv/bin/activate

# .env 파일이 있으면 환경변수 로드
if [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

nohup gunicorn \
    --workers 4 \
    --bind 0.0.0.0:5000 \
    --access-logfile $APP_DIR/logs/access.log \
    --error-logfile $APP_DIR/logs/error.log \
    --pid $APP_DIR/gunicorn.pid \
    --daemon \
    app:app

echo "[CodeDeploy] Application started on port 5000."
