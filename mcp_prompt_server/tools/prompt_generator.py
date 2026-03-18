"""
prompt_generator.py
Apache 웹서버 분석용 프롬프트를 생성/개선하는 MCP 도구 모음.

NOTE: MCP 서버는 Flask와 별도 프로세스로 동작하므로
      환경변수 대신 공유 config.json을 직접 읽어 Azure OpenAI 설정을 가져옵니다.
"""

import json
import logging
import os
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

# config.json 경로 (mcp_prompt_server와 modules/ 는 같은 프로젝트 루트)
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), '../../modules/config.json')


def _load_config() -> dict:
    """Flask 앱과 공유하는 config.json에서 Azure OpenAI 설정을 읽습니다."""
    try:
        with open(os.path.abspath(_CONFIG_PATH), 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        raise RuntimeError(f"config.json을 찾을 수 없습니다: {_CONFIG_PATH}")


def _get_llm() -> AzureChatOpenAI:
    """config.json에서 Azure OpenAI 클라이언트를 생성합니다."""
    cfg = _load_config()
    return AzureChatOpenAI(
        azure_deployment=cfg['azure_openai_deployment'],
        azure_endpoint=cfg['azure_openai_endpoint'],
        api_key=cfg['azure_openai_api_key'],
        api_version=cfg.get('azure_openai_api_version', '2024-02-15-preview'),
        temperature=0.3,
        max_retries=2,
    )


def generate_prompt(intent: str) -> dict:
    """
    사용자가 원하는 진단 의도를 입력하면, Apache 설정 분석에 최적화된
    시스템 프롬프트와 유저 프롬프트를 JSON 형식으로 생성합니다.

    Args:
        intent: 진단하고 싶은 내용 (예: "가용성 중심 점검", "보안 취약점 분석")
    """
    logger.info(f"generate_prompt 호출 - intent: {intent}")

    llm = _get_llm()

    system_msg = SystemMessage(content="""당신은 Apache 웹서버 분석 전문가이자 AI 프롬프트 엔지니어입니다.
사용자의 진단 의도를 받아, Apache httpd.conf 설정 파일 분석에 최적화된
시스템 프롬프트와 유저 프롬프트를 생성하십시오.

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "system_prompt": "AI 역할과 분석 기준을 정의하는 시스템 프롬프트 (한국어)",
  "user_prompt": "실제 분석 요청 메시지. 반드시 {content} 변수를 포함할 것 (한국어)"
}

규칙:
- user_prompt에는 반드시 {content} 플레이스홀더를 포함하십시오.
- system_prompt에는 반드시 아래 JSON 응답 형식을 포함하십시오:
  { "html_report": "HTML 태그로 작성된 분석 요약", "recommendations": [...] }
- 마크다운 코드블록 없이 순수 JSON만 반환하십시오.""")

    human_msg = HumanMessage(content=f"진단 의도: {intent}")

    response = llm.invoke([system_msg, human_msg])
    raw = _strip_code_block(response.content.strip())

    result = json.loads(raw)
    logger.info("generate_prompt 완료")
    return result


def improve_prompt(current_prompt: str, feedback: str, prompt_type: str = "system") -> dict:
    """
    기존 프롬프트와 개선 요청사항을 받아 더 나은 프롬프트를 반환합니다.

    Args:
        current_prompt: 현재 사용 중인 프롬프트 텍스트
        feedback: 어떻게 개선하고 싶은지 (예: "표를 더 활용해줘", "보안 항목 추가")
        prompt_type: "system" 또는 "user"
    """
    logger.info(f"improve_prompt 호출 - type: {prompt_type}, feedback: {feedback}")

    llm = _get_llm()

    constraint = (
        'JSON 응답 형식(html_report + recommendations)을 반드시 유지하십시오.'
        if prompt_type == 'system'
        else '{content} 플레이스홀더를 반드시 유지하십시오.'
    )

    system_msg = SystemMessage(content=f"""당신은 Apache 웹서버 분석 전문가이자 AI 프롬프트 엔지니어입니다.
주어진 {prompt_type} 프롬프트를 사용자의 피드백에 따라 개선하십시오.
{constraint}

반드시 아래 JSON 형식으로만 응답하십시오:
{{
  "improved_prompt": "개선된 프롬프트 전체 텍스트",
  "changes_summary": "무엇을 어떻게 개선했는지 한 문장 요약"
}}

마크다운 코드블록 없이 순수 JSON만 반환하십시오.""")

    human_msg = HumanMessage(content=f"현재 프롬프트:\n{current_prompt}\n\n개선 요청:\n{feedback}")

    response = llm.invoke([system_msg, human_msg])
    raw = _strip_code_block(response.content.strip())

    result = json.loads(raw)
    logger.info("improve_prompt 완료")
    return result


def _strip_code_block(text: str) -> str:
    """AI가 마크다운 코드블록으로 감쌌을 경우 제거합니다."""
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
