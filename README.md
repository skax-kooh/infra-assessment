# infra-assessment
AI Master Project 3기

## Project Structure
```text
infra-assessment/
├── README.md             # 프로젝트 개요 및 구조
├── app.py                # Flask 메인 서버
├── appspec.yml           # CodeDeploy 배포 설정
├── mcp_prompt_server/    # Model Context Protocol 기반 프롬프트/스킬 서버
│   ├── app.py            # MCP Server 메인
│   ├── skills/           # 진단 목적별 Skill YAML (보안, 성능, ISMS-P 등)
│   └── tools/            # 프롬프트 동적 조립 도구
├── modules/              # 백엔드 핵심 비즈니스 로직
│   ├── config_store.py   # 설정 상태 저장소 (config.json 관리)
│   ├── infrastructure/   # 대상 서버 SSH 접속 및 설정 파일 수집/분석
│   └── settings/         # LLM API 등 글로벌 설정 뷰/API
├── scripts/              # AWS CodeDeploy 배포 등 쉘 스크립트
├── static/               # 프론트엔드 정적 리소스
│   ├── css/              # 공통 스타일시트
│   └── js/               # 기능별 모듈화된 JS (ai-analysis, results, sidebar 등)
├── templates/            # HTML 템플릿 파일
│   ├── assessments/      # 실제 진단 구동 뷰 (web_server.html)
│   ├── settings/         # 설정 화면 뷰
│   └── layout.html       # 공통 사이드바 및 네비게이션 레이아웃
└── requirements.txt      # 파이썬 의존성 패키지 목록
```
