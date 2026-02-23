#!/bin/bash
echo "[CodeDeploy] Installing dependencies..."

APP_DIR=/home/ec2-user/infra-assessment
cd $APP_DIR

# 가상환경 생성 (없으면)
if [ ! -d "venv" ]; then
    echo "[CodeDeploy] Creating virtual environment..."
    python3 -m venv venv
fi

# 가상환경 활성화 후 패키지 설치
source venv/bin/activate
pip install --upgrade pip
pip install gunicorn
pip install -r requirements.txt
deactivate

echo "[CodeDeploy] Dependencies installed successfully."
