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

from mcp_prompt_server.tools.prompt_generator import generate_prompt, improve_prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app():
    # fastmcp 3.x: stateless_http는 FastMCP() 생성자가 아닌 http_app()에 전달
    mcp = FastMCP(
        name="Infra Assessment Prompt MCP",
        version="1.0.0",
        instructions="""
이 서버는 Apache 웹서버 진단용 AI 프롬프트를 생성/개선하는 도구를 제공합니다.
- generate_prompt(intent): 진단 의도를 입력하면 최적화된 시스템/유저 프롬프트를 생성합니다.
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

    # MCP 도구 등록
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
