"""
app.py - MCP Prompt Server
fastmcp 3.x API에 맞게 작성.

실행 방법:
    cd /Users/P039321/workspace/infra-assessment
    .venv/bin/uvicorn mcp_prompt_server.app:app --port 8000 --reload
"""

import logging
from fastmcp import FastMCP
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from mcp_prompt_server.tools.prompt_generator import generate_prompt, improve_prompt
from mcp_prompt_server.tools.skill_manager import (
    list_skills,
    get_skill,
    generate_prompt_with_skill,
)


def create_app():
    # fastmcp 3.x: stateless_http는 FastMCP() 생성자가 아닌 http_app()에 전달
    mcp = FastMCP(
        name="Infra Assessment Prompt MCP",
        version="1.0.0",
        instructions="""
이 서버는 Apache 웹서버 진단용 AI 프롬프트를 생성/개선하는 도구를 제공합니다.

[Skills 기반 도구 (추천)]
- list_skills(): 사용 가능한 진단 스킬 목록을 반환합니다. (보안, 가용성, 성능, SSL/TLS)
- get_skill(skill_name): 특정 스킬의 system_prompt와 user_prompt를 반환합니다.
- generate_prompt_with_skill(intent, skill_name): 스킬 베이스에 추가 의도를 반영한 프롬프트를 반환합니다.

[LLM 생성 도구]
- generate_prompt(intent): 진단 의도를 입력하면 LLM이 최적화된 프롬프트를 생성합니다.
- improve_prompt(current_prompt, feedback, prompt_type): 기존 프롬프트를 피드백에 따라 개선합니다.
"""
    )

    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ]

    # MCP 도구 등록 - Skills 기반 도구
    mcp.tool(list_skills)
    mcp.tool(get_skill)
    mcp.tool(generate_prompt_with_skill)

    # MCP 도구 등록 - LLM 생성 도구
    mcp.tool(generate_prompt)
    mcp.tool(improve_prompt)

    # fastmcp 3.x: stateless_http를 http_app()에 전달
    return mcp.http_app(
        path="/prompt/mcp",
        transport="streamable-http",
        middleware=middleware,
        stateless_http=True,
    )


app = create_app()  # uvicorn이 사용할 ASGI 앱
