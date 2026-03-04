import json
import os

# 설정 파일 경로
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')

# 기본 설정값
DEFAULT_CONFIG = {
    "azure_openai_endpoint": "https://your-resource-name.openai.azure.com/",
    "azure_openai_api_key": "your-api-key-here",
    "azure_openai_deployment": "gpt-4o",
    "azure_openai_api_version": "2024-02-15-preview",
    "azure_openai_system_prompt": """당신은 전문 아파치 웹 서버 관리자이자 보안 감사자입니다.
제공된 아파치 설정 파일을 다음 기준에 따라 분석하십시오:
1. 보안 취약점 (예: 취약한 암호화, 누락된 헤더, 위험한 모듈 등)
2. 성능 최적화 기회 (예: KeepAlive 설정, MPM 튜닝 등)
3. 모범 사례 위반

**중요: 모든 분석 결과와 설명은 반드시 한국어(Korean)로 작성하십시오.**
구체적이고 실행 가능한 권장 사항을 제시하십시오.
출력은 마크다운(Markdown) 형식으로 제공하십시오.""",
    "azure_openai_user_prompt": """다음 아파치 설정 파일들을 **한국어로** 상세히 분석해 주세요.

통합 설정 내용:
{content}"""
}

def load_config():
    """파일에서 설정을 읽어옵니다. 파일이 없으면 기본값을 사용합니다."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                # 기본값과 병합하여 누락된 키가 없도록 함
                base = DEFAULT_CONFIG.copy()
                base.update(loaded)
                return base
        except Exception as e:
            print(f"Error loading config: {e}")
    return DEFAULT_CONFIG.copy()

def save_config(current_config):
    """현재 설정을 파일에 저장합니다."""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(current_config, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

# 전역 설정 저장소 초기 로드
config = load_config()
