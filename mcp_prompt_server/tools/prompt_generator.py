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
    from mcp_prompt_server.tools.skill_manager import _load_all_skills
    logger.info(f"generate_prompt 호출 - intent: {intent}")

    # 1. 스킬 매칭 시도
    matched_skill = None
    matched_tags = []
    all_skills = _load_all_skills()

    for skill in all_skills:
        # 태그 중 하나라도 intent에 포함되어 있는지 확인
        current_matched = [tag for tag in skill.get('tags', []) if tag in intent]
        if current_matched:
            # 가장 많이 매칭된 스킬을 선택 (또는 첫 번째)
            if not matched_skill or len(current_matched) > len(matched_tags):
                matched_skill = skill
                matched_tags = current_matched

    llm = _get_llm()

    if matched_skill:
        logger.info(f"스킬 매칭 성공: [{matched_skill['name']}] (매칭된 키워드: {matched_tags})")
        
        # 매칭된 스킬 템플릿을 기반으로 LLM이 의도(intent)를 반영하여 프롬프트 완성
        system_msg = SystemMessage(content=f"""당신은 Apache 웹서버 분석 전문가이자 AI 프롬프트 엔지니어입니다.
주어진 스킬(Skill) 템플릿을 기반으로 사용자의 구체적인 진단 의도(intent)를 반영한 최종 프롬프트를 생성하십시오.

[기반 스킬 정보]
- 이름: {matched_skill['display_name']}
- 설명: {matched_skill['description']}
- 기본 시스템 프롬프트: {matched_skill['system_prompt']}
- 기본 유저 프롬프트: {matched_skill['user_prompt']}

**CRITICAL RULE: 생성되는 `system_prompt`에는 반드시 기반 스킬에 정의된 'JSON 응답 형식'이 그대로 포함되어야 합니다.**
분석 결과가 JSON으로 반환되지 않으면 시스템이 고장납니다. 절대 JSON 구조를 생략하거나 축약하지 마십시오.

반드시 아래 JSON 형식으로만 응답하십시오:
{{
  "system_prompt": "기반 스킬의 분석 기준과 JSON 응답 형식을 모두 포함하여 고도화된 시스템 프롬프트 (반드시 한국어로 작성)",
  "user_prompt": "실제 분석 요청 메시지. {{content}} 변수 유지 필수 (반드시 한국어로 작성)"
}}

규칙:
- 모든 프롬프트 텍스트는 **반드시 한국어(Korean)**로 작성하십시오.
- `system_prompt` 내부에는 **반드시 기반 스킬에서 정의한 JSON 구조(`html_report`, `recommendations`)**를 명시하십시오.
- `user_prompt`에는 반드시 {{content}} 플레이스홀더를 정확히 포함하십시오.""")
    else:
        logger.info("매칭되는 스킬이 없음 - 일반 프롬프트 생성 모드로 진행")
        system_msg = SystemMessage(content="""당신은 Apache 웹서버 분석 전문가이자 AI 프롬프트 엔지니어입니다.
사용자의 진단 의도를 받아, 제공된 모든 Apache 설정 내용(여러 파일 포함) 분석에 최적화된
시스템 프롬프트와 유저 프롬프트를 생성하십시오.

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "system_prompt": "AI 역할과 분석 기준을 정의하는 시스템 프롬프트 (반드시 한국어로 작성)",
  "user_prompt": "실제 분석 요청 메시지. 반드시 {content} 변수를 포함할 것 (반드시 한국어로 작성)"
}

규칙:
- 모든 프롬프트 텍스트는 **반드시 한국어(Korean)**로 작성하십시오. 영어로 전환하지 마십시오.
- user_prompt에는 반드시 {content} 플레이스홀더를 포함하십시오.
- system_prompt에는 반드시 아래 지침을 포함한 HTML 리포트 형식을 고정하십시오:
  1) 상단에 [총평] 섹션 (<div style='...'>) 추가
  2) 이후 상세 분석 결과 Table (<table>) 추가
  3) '현재 설정' 셀에는 원본 파일명(예: httpd.conf:L10)과 실제 설정 코드 조각(<pre><code>)을 함께 명시
  4) '권장 설정' 셀에도 실제 개선 코드 조각(<pre><code>) 명시
- **JSON 생성 규칙 (CRITICAL)**: 줄바꿈은 반드시 `\n`으로 이스케이프하고, 절대 줄 끝에 백슬래시(`\`)를 사용하여 줄을 잇지 마십시오.
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
{
  "improved_prompt": "개선된 프롬프트 전체 텍스트 (반드시 한국어로 작성)",
  "changes_summary": "무엇을 어떻게 개선했는지 한 문장 요약 (반드시 한국어로 작성)"
}

규칙:
- 모든 프롬프트 텍스트는 **반드시 한국어(Korean)**로 작성하십시오. 영어로 전환하지 마십시오.
- 마크다운 코드블록 없이 순수 JSON만 반환하십시오.""")

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
