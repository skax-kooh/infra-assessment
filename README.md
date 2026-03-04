# infra-assessment
AI Master Project 3기

## Project Structure
```text
infra-assessment/
├── app.py                # Flask 메인 서버
├── modules/              # 백엔드 모듈
│   ├── infrastructure/   # SSH/설정 수집
│   ├── settings/         # API 설정 관리
│   └── config_store.py   # 설정 저장/동기화
├── templates/            # HTML 템플릿
│   ├── assessments/      # 진단 화면
│   ├── settings/         # 설정 화면
│   └── layout.html       # 공통 레이아웃
├── static/               # 정적 파일
│   ├── css/              # 스타일 (style.css)
│   └── js/               # 스크립트 (script.js)
├── scripts/              # 배포 스크립트
├── logs/                 # 서버 로그
├── requirements.txt      # 의존성 목록
└── appspec.yml          # CodeDeploy 설정
```
