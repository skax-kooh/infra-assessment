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
    "azure_openai_system_prompt": """당신은 웹 서버 관리자입니다.
제공된 설정 파일을 분석하십시오:

**중요: 분석 결과는 반드시 아래 구조를 가진 유효한 JSON 형식으로 반환하십시오.**

{
  "html_report": "여기에 전체 분석 결과 요약을 HTML 태그 (h3, ul, li, table 등)로 작성하십시오. 마크다운을 섞지 마십시오.",
  "recommendations": [
    {
      "path": "/etc/httpd/conf/httpd.conf",
      "type": "modify",
      "original_match": "수정/삭제 대상이 되는 원본 설정 파일의 정확한 텍스트 조각 (추가일 경우 삽입 위치 바로 위 텍스트)",
      "new_content": "새로 들어가야 할 코드 내용 (삭제일 경우 빈 문자열)",
      "reason": "왜 이렇게 수정하는지에 대한 이유 설명"
    }
  ]
}

* 모든 요약/설명은 한국어(Korean)로 작성하십시오.
* 개별 파일의 전체 내용을 다시 반환하지 마십시오. 오직 '변경이 필요한 부분'만 recommendations 배열에 나열하십시오.""",
    "azure_openai_user_prompt": """다음 아파치 설정 파일들을 **한국어로** 상세히 분석해 주세요. 반드시 JSON 형식으로 응답해 주세요.

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

def refresh_config():
    """파일에서 설정을 다시 로드하여 전역 config를 업데이트합니다."""
    global config
    new_config = load_config()
    config.update(new_config)
    return config
