import logging
import os

# 프로젝트 루트의 logs 디렉토리 경로 계산
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_LOGS_DIR = os.path.abspath(os.path.join(_BASE_DIR, "../logs"))

if not os.path.exists(_LOGS_DIR):
    os.makedirs(_LOGS_DIR)

# 전용 로거 생성 (mcp_prompt_server 내의 모든 모듈에서 공유)
# app.py와 개별 도구들에서 이 설정을 따르게 함
_log_file = os.path.join(_LOGS_DIR, "mcp_server.log")

# 전역 로깅 설정 (이미 설정되어 있어도 덮어쓰지 않도록 함)
# 하지만 MCP 서버는 별도 프로세스이므로 강력하게 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler(_log_file, encoding='utf-8'),
        logging.StreamHandler()
    ],
    force=True # uvicorn 등의 기본 로거 설정을 덮어씀
)

logging.getLogger(__name__).info(f"MCP Prompt Server 로깅 초기화 완료: {_log_file}")
