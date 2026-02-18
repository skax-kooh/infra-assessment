from flask import Blueprint, render_template, request, jsonify
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
from modules.config_store import config

# 설정 관련 라우트 그룹 정의
settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/llm')
def llm_settings_page():
    """
    LLM(언어모델) API 설정 페이지를 보여줍니다.
    """
    # config를 템플릿에 전달하여 현재 설정값을 미리 채워줍니다.
    return render_template('settings/llm.html', config=config)

@settings_bp.route('/llm/update', methods=['POST'])
def update_llm_settings():
    """
    사용자가 입력한 설정값을 저장합니다.
    """
    try:
        data = request.json
        if not data:
             return jsonify({'status': 'error', 'message': '전송된 데이터가 없습니다.'}), 400

        # 사용자가 입력한 값으로 전역 설정(config) 업데이트
        # 값이 없으면 기존 값 유지
        new_endpoint = data.get('endpoint')
        new_key = data.get('api_key')

        if new_endpoint:
            config['azure_openai_endpoint'] = new_endpoint
        
        if new_key:
            config['azure_openai_api_key'] = new_key
            
        return jsonify({'status': 'success', 'message': '설정이 성공적으로 저장되었습니다.'})
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@settings_bp.route('/llm/test', methods=['POST'])
def test_llm_connection():
    """
    입력한 설정값으로 AI 연결이 잘 되는지 테스트합니다.
    """
    try:
        data = request.json
        endpoint = data.get('endpoint')
        api_key = data.get('api_key')
        
        # 입력된 값이 있으면 그것을 쓰고, 없으면 저장된 설정값을 씁니다.
        test_endpoint = endpoint if endpoint else config['azure_openai_endpoint']
        test_key = api_key if api_key else config['azure_openai_api_key']

        # 테스트용 AI 클라이언트 생성 (짧은 답변만 받도록 설정)
        llm = AzureChatOpenAI(
            azure_deployment=config['azure_openai_deployment'],
            azure_endpoint=test_endpoint,
            api_key=test_key,
            api_version=config['azure_openai_api_version'],
            temperature=0,
            max_tokens=10, # 테스트니까 짧게 받음
            max_retries=1, # 실패 시 재시도 안 함 (빠른 결과 확인)
        )

        # 간단한 인사 메시지 전송
        messages = [
            HumanMessage(content="Hello, is this connection working?")
        ]
        
        response = llm.invoke(messages)
        return jsonify({'status': 'success', 'message': f'연결 성공: {response.content[:50]}...'})

    except Exception as e:
        return jsonify({'status': 'error', 'message': f'연결 실패: {str(e)}'}), 500
