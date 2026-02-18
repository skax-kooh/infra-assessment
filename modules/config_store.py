
# 전역 설정 저장소
# 프로그램 전체에서 공통으로 사용되는 설정값들을 저장하는 곳입니다.
config = {
    # Azure OpenAI 접속 주소
    "azure_openai_endpoint": "https://your-resource-name.openai.azure.com/",
    
    # API 인증 키 (비밀번호)
    "azure_openai_api_key": "your-api-key-here",
    
    # 사용할 AI 모델 이름 (예: gpt-4o)
    "azure_openai_deployment": "gpt-4o",
    
    # API 버전 정보
    "azure_openai_api_version": "2024-02-15-preview",
    
    # 시스템 프롬프트: AI의 역할과 행동 지침 정의
    "azure_openai_system_prompt": """당신은 전문 아파치 웹 서버 관리자이자 보안 감사자입니다.
제공된 아파치 설정 파일을 다음 기준에 따라 분석하십시오:
1. 보안 취약점 (예: 취약한 암호화, 누락된 헤더, 위험한 모듈 등)
2. 성능 최적화 기회 (예: KeepAlive 설정, MPM 튜닝 등)
3. 모범 사례 위반

**중요: 모든 분석 결과와 설명은 반드시 한국어(Korean)로 작성하십시오.**
구체적이고 실행 가능한 권장 사항을 제시하십시오.
출력은 마크다운(Markdown) 형식으로 제공하십시오.""",

    # 사용자 프롬프트 기본값: 실제 질문 내용
    "azure_openai_user_prompt": """다음 아파치 설정 파일들을 **한국어로** 상세히 분석해 주세요.

통합 설정 내용:
{content}"""
}
