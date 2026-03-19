"""
skill_manager.py
사전 정의된 Skill YAML 파일을 로드하여 MCP 도구로 제공합니다.

Skills 디렉토리: mcp_prompt_server/skills/*.yaml
각 YAML 파일은 다음 필드를 포함해야 합니다:
  - name: 스킬 식별자 (str)
  - display_name: 사용자 표시 이름 (str)
  - description: 스킬 설명 (str)
  - tags: 태그 목록 (list[str])
  - system_prompt: AI 역할 및 분석 기준 정의 (str)
  - user_prompt: 실제 분석 요청, {content} 플레이스홀더 포함 (str)
"""

import logging
import os
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

# Skills 디렉토리 경로 (이 파일 기준: tools/ → mcp_prompt_server/ → skills/)
_SKILLS_DIR = Path(__file__).parent.parent / "skills"

# 필수 필드 목록
_REQUIRED_FIELDS = {"name", "display_name", "description", "tags", "system_prompt", "user_prompt"}


def _load_all_skills() -> list[dict[str, Any]]:
    """
    Skills 디렉토리의 모든 YAML 파일을 로드합니다.
    파싱 오류가 있는 파일은 건너뛰고 경고 로그를 남깁니다.
    """
    skills = []

    if not _SKILLS_DIR.exists():
        logger.warning(f"Skills 디렉토리를 찾을 수 없습니다: {_SKILLS_DIR}")
        return skills

    for yaml_file in sorted(_SKILLS_DIR.glob("*.yaml")):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            if not isinstance(data, dict):
                logger.warning(f"잘못된 YAML 형식 (스킵): {yaml_file.name}")
                continue

            missing = _REQUIRED_FIELDS - set(data.keys())
            if missing:
                logger.warning(f"필수 필드 누락 {missing} (스킵): {yaml_file.name}")
                continue

            skills.append(data)
            logger.debug(f"스킬 로드 완료: {data['name']}")

        except yaml.YAMLError as e:
            logger.warning(f"YAML 파싱 오류 (스킵): {yaml_file.name} - {e}")
        except OSError as e:
            logger.warning(f"파일 읽기 오류 (스킵): {yaml_file.name} - {e}")

    logger.info(f"총 {len(skills)}개 스킬 로드됨")
    return skills


def list_skills() -> list[dict[str, Any]]:
    """
    사용 가능한 모든 진단 스킬의 목록을 반환합니다.

    각 항목에는 name, display_name, description, tags가 포함됩니다.
    특정 스킬의 프롬프트가 필요하면 get_skill(skill_name)을 사용하십시오.

    Returns:
        list[dict]: 스킬 메타데이터 목록
        예: [{"name": "security_audit", "display_name": "보안 취약점 감사", ...}, ...]
    """
    skills = _load_all_skills()
    return [
        {
            "name": s["name"],
            "display_name": s["display_name"],
            "description": s["description"],
            "tags": s["tags"],
        }
        for s in skills
    ]


def get_skill(skill_name: str) -> dict[str, Any]:
    """
    특정 스킬의 system_prompt와 user_prompt를 반환합니다.

    Apache 설정 파일을 분석할 때, 반환된 user_prompt의 {content} 자리에
    설정 파일 내용을 치환하여 AI에게 전달하십시오.

    Args:
        skill_name: 스킬 식별자 (list_skills()의 name 필드 값)

    Returns:
        dict: 성공 시 {"name", "display_name", "system_prompt", "user_prompt"}
              실패 시 {"error": "오류 메시지", "available_skills": [...]}
    """
    skills = _load_all_skills()
    skill_map = {s["name"]: s for s in skills}

    if skill_name not in skill_map:
        available = sorted(skill_map.keys())
        logger.warning(f"스킬을 찾을 수 없음: {skill_name}. 사용 가능: {available}")
        return {
            "error": f"'{skill_name}' 스킬을 찾을 수 없습니다.",
            "available_skills": available,
        }

    s = skill_map[skill_name]
    return {
        "name": s["name"],
        "display_name": s["display_name"],
        "system_prompt": s["system_prompt"],
        "user_prompt": s["user_prompt"],
    }


def generate_prompt_with_skill(intent: str, skill_name: str) -> dict[str, Any]:
    """
    선택한 스킬의 프롬프트를 베이스로, 사용자의 추가 의도(intent)를 반영하여
    커스터마이징된 system_prompt와 user_prompt를 반환합니다.

    스킬 프롬프트만으로 충분할 때는 get_skill()을 직접 사용하십시오.
    이 도구는 스킬 베이스 위에 사용자의 특정 요구사항을 덧붙이고 싶을 때 사용합니다.

    Args:
        intent: 추가 진단 의도 또는 강조할 항목 (예: "KeepAlive 설정 위주로 집중 분석해줘")
        skill_name: 기반으로 사용할 스킬 식별자

    Returns:
        dict: {"name", "display_name", "system_prompt", "user_prompt", "intent_applied"}
              또는 {"error": "오류 메시지", "available_skills": [...]}
    """
    skill = get_skill(skill_name)

    if "error" in skill:
        return skill

    # intent를 user_prompt 하단에 추가 지시사항으로 부착 (한국어 고정 지침 포함)
    augmented_user_prompt = (
        f"{skill['user_prompt'].rstrip()}\n\n"
        f"[추가 분석 요청]\n{intent}\n\n"
        f"**주의: 모든 분석 결과와 권고 사항은 반드시 한국어(Korean)로 작성하십시오.**"
    )

    logger.info(f"generate_prompt_with_skill - skill: {skill_name}, intent: {intent}")

    return {
        "name": skill["name"],
        "display_name": skill["display_name"],
        "system_prompt": skill["system_prompt"],
        "user_prompt": augmented_user_prompt,
        "intent_applied": intent,
    }
