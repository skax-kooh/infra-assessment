from flask import Blueprint, render_template, request, jsonify
import paramiko
import re
import os
import logging
import traceback
import time
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
# 설정 저장소에서 설정을 가져옵니다.
from modules.config_store import config

logger = logging.getLogger(__name__)

# 블루프린트 정의 (라우트 그룹화)
infrastructure_bp = Blueprint('infrastructure', __name__)

# -----------------------------------------------------------------------------
# 헬퍼 함수 (도와주는 함수들)
# -----------------------------------------------------------------------------

def resolve_path(path, server_root):
    """
    절대 경로로 변환하는 함수입니다.
    경로가 '/'로 시작하지 않으면(상대 경로), ServerRoot와 합칩니다.
    예: conf/httpd.conf -> /etc/httpd/conf/httpd.conf
    """
    path = path.strip('"\'')  # 따옴표 제거
    if not path.startswith('/'):
        return os.path.join(server_root, path)
    return path

def get_files_from_glob(client, pattern):
    """
    와일드카드(*)가 포함된 경로에서 실제 파일 목록을 가져옵니다.
    예: conf.d/*.conf -> [conf.d/ssl.conf, conf.d/user.conf]
    """
    # ls 명령어로 파일 목록을 조회합니다.
    # -1: 한 줄에 파일 하나씩 출력
    # -d: 디렉토리 자체 정보만 출력 (내용물 제외)
    stdin, stdout, stderr = client.exec_command(f"ls -1d {pattern}")
    output = stdout.read().decode('utf-8').strip()
    
    if not output:
        return []
    
    # 줄바꿈(\n)으로 나누어 리스트로 만듭니다.
    return output.split('\n')

def fetch_config_recursively(client, file_path, server_root, visited, configs):
    """
    설정 파일을 읽고, 그 안에 포함된(Include) 다른 파일들도 계속해서 읽어오는 함수입니다.
    (재귀 함수: 자기 자신을 다시 호출함)
    """
    # 이미 읽은 파일이면 건너뜁니다. (무한 루프 방지)
    if file_path in visited:
        return
    
    visited.add(file_path)
    
    # 파일 내용을 읽어옵니다 (cat 명령어 사용)
    stdin, stdout, stderr = client.exec_command(f"cat {file_path}")
    content = stdout.read().decode('utf-8')
    error_msg = stderr.read().decode('utf-8')
    
    # 읽기 실패 시 에러 기록
    if not content and error_msg:
        configs.append({
            'path': file_path,
            'content': f"파일 읽기 오류: {error_msg}",
            'error': True
        })
        return

    # 읽은 내용 저장
    configs.append({
        'path': file_path,
        'content': content,
        'error': False
    })
    
    # -------------------------------------------------------------------------
    # "Include" 또는 "IncludeOptional" 지시어를 찾아서 추가 파일을 읽습니다.
    # 정규식 설명:
    # ^\s*Included(Optional)? : 줄 시작, 공백가능, Include 또는 IncludeOptional
    # \s+(.+) : 공백 뒤에 오는 경로 부분
    # -------------------------------------------------------------------------
    include_pattern = re.compile(r'^\s*Include(Optional)?\s+(.+)$', re.MULTILINE)
    matches = include_pattern.findall(content)
    
    for _, include_path in matches:
        # 경로를 절대 경로로 맞춥니다.
        full_pattern = resolve_path(include_path, server_root)
        
        # 와일드카드(*, ?)가 있으면 여러 파일을 찾습니다.
        if '*' in full_pattern or '?' in full_pattern:
            expanded_files = get_files_from_glob(client, full_pattern)
            for found_file in expanded_files:
                # 찾은 파일에 대해 다시 이 함수를 호출합니다 (재귀 호출)
                fetch_config_recursively(client, found_file.strip(), server_root, visited, configs)
        else:
            # 단일 파일이면 바로 재귀 호출합니다.
            fetch_config_recursively(client, full_pattern, server_root, visited, configs)

# -----------------------------------------------------------------------------
# 라우트 (웹 페이지 주소 및 기능)
# -----------------------------------------------------------------------------

@infrastructure_bp.route('/web-server')
def web_server_assessment():
    """
    웹 서버 진단 페이지를 보여줍니다.
    """
    return render_template('assessments/web_server.html', config=config)

@infrastructure_bp.route('/web-server/scan', methods=['POST'])
def scan_web_servers():
    """
    [진단 시작] 버튼을 눌렀을 때 실행되는 함수입니다.
    SSH로 서버에 접속하여 아파치 설정을 긁어옵니다.
    """
    data = request.json
    servers = data.get('servers', [])
    results = []

    for server in servers:
        ip = server.get('ip')
        user = server.get('username')
        password = server.get('password')
        
        result = {'ip': ip}
        
        # SSH 접속 클라이언트 생성
        client = paramiko.SSHClient()
        # 처음 접속하는 서버도 허용 (키 자동 추가)
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            # 1. 서버 접속 시도
            client.connect(ip, username=user, password=password, timeout=10)

            # 2. httpd 프로세스 확인 (아파치가 실행 중인지)
            stdin, stdout, stderr = client.exec_command("ps -ef | grep httpd | grep -v grep")
            process_output = stdout.read().decode('utf-8').strip()

            if not process_output:
                result['status'] = 'error'
                result['message'] = '아파치(httpd) 프로세스를 찾을 수 없습니다.'
            else:
                result['status'] = 'success'
                result['process_info'] = process_output

                # 3. 설정 파일 위치 찾기 (-f 옵션과 -d 옵션 파싱)
                config_path = '/etc/httpd/conf/httpd.conf' # 기본값
                server_root = '/etc/httpd' # 기본값
                
                # 정규식으로 -f (설정파일) 찾기
                match_f = re.search(r'-f\s+([\w/.-]+)', process_output)
                if match_f:
                    config_path = match_f.group(1)
                
                # 정규식으로 -d (루트 디렉토리) 찾기
                match_d = re.search(r'-d\s+([\w/.-]+)', process_output)
                if match_d:
                    server_root = match_d.group(1)

                # 상대 경로라면 절대 경로로 변환
                if not config_path.startswith('/'):
                    config_path = os.path.join(server_root, config_path)

                result['main_config_file'] = config_path
                result['server_root'] = server_root

                # 4. 설정 파일들을 재귀적으로 모두 읽어오기
                collected_configs = []
                visited_paths = set()
                
                fetch_config_recursively(client, config_path, server_root, visited_paths, collected_configs)
                
                result['configs'] = collected_configs
                result['config_count'] = len(collected_configs)

        except Exception as e:
            # 에러 발생 시 로그 기록
            logger.error(f"SSH 스캔 중 오류 발생 ({ip}): {str(e)}")
            logger.error(traceback.format_exc())
            result['status'] = 'error'
            result['message'] = str(e)
        finally:
            # 작업이 끝나면 무조건 연결 종료
            client.close()

        results.append(result)

    return jsonify(results)

@infrastructure_bp.route('/web-server/analyze', methods=['POST'])
def analyze_config():
    """
    [AI 통합 진단] 버튼을 눌렀을 때 실행됩니다.
    수집한 설정 파일 내용을 AI에게 보내 분석 결과를 받습니다.
    """
    data = request.json
    
    # 클라이언트에서 보낸 설정 파일 목록을 받습니다.
    configs = data.get('configs', [])
    
    # 예외 처리: 데이터 형식이 옛날 방식일 경우를 대비해 변환 (호환성 유지)
    if not configs:
        single_content = data.get('content')
        single_path = data.get('path', '알 수 없는 경로')
        if single_content:
            configs.append({'path': single_path, 'content': single_content})

    if not configs:
        return jsonify({'error': '분석할 설정 파일 내용이 없습니다.'}), 400

    logger.info(f"AI 분석 요청 수신 - 대상 파일 수: {len(configs)}")

    try:
        # 1. AI에게 보낼 내용을 하나로 합칩니다. (토큰 절약을 위해 주석 제거)
        combined_content = ""
        for cfg in configs:
            path = cfg.get('path', 'Unknown')
            raw_content = cfg.get('content', '')
            
            # 주석(#) 제거 로직
            lines = raw_content.splitlines()
            # 빈 줄이나 #으로 시작하는 줄은 제외
            clean_lines = [
                line for line in lines 
                if line.strip() and not line.strip().startswith('#')
            ]
            clean_content = "\n".join(clean_lines)
            
            # 파일별로 구분해서 합치기
            combined_content += f"\n--- 파일 시작: {path} ---\n"
            combined_content += clean_content
            combined_content += f"\n--- 파일 끝: {path} ---\n"

        # 2. Azure OpenAI 클라이언트 생성
        raw_endpoint = config.get('azure_openai_endpoint', '').strip().rstrip('/')
        logger.info(f"Using endpoint: {raw_endpoint}")

        llm = AzureChatOpenAI(
            azure_deployment=config['azure_openai_deployment'],
            azure_endpoint=raw_endpoint,
            api_key=config['azure_openai_api_key'],
            api_version=config['azure_openai_api_version'],
            temperature=0,      # 창의성 낮춤 (정확한 분석 위해)
            max_tokens=None,    # 토큰 제한 없음
            timeout=None,
            max_retries=2,      # 실패 시 2번 재시도
        )

        # 3. 프롬프트(지시문) 준비
        # 사용자 설정이 있으면 그것을 쓰고, 없으면 기본값을 씁니다.
        
        # 시스템 프롬프트: AI의 역할 정의
        system_prompt = data.get('system_prompt', config.get('azure_openai_system_prompt'))
        if not system_prompt:
            # 기본값
            system_prompt = """당신은 Apache 웹서버 전문가입니다. 제공된 설정 파일을 성능, 가용성, 보안, 모범 사례 관점에서 분석하십시오.
반드시 아래 JSON 형식으로만 응답하십시오 (마크다운 코드블록 없이):
{"html_report":"<h3>진단 요약</h3><p>총평 한 문장</p><table border='1' cellpadding='6' style='border-collapse:collapse;width:100%;font-size:13px;'><thead><tr style='background:#f0f0f0'><th>항목</th><th>현재 설정</th><th>상태</th><th>권장 조치</th></tr></thead><tbody><!-- 점검 항목을 <tr>로 채우십시오. 상태: ✅ 양호 / ⚠️ 개선필요 / ❌ 위험 --></tbody></table>","score_items":[{"name":"항목명","passed":true,"reason":"이유"}],"recommendations":[{"path":"파일경로","type":"modify","original_match":"원본 텍스트","new_content":"권장 내용","reason":"이유"}]}
모든 설명은 한국어로 작성. 파일 전체 내용 반환 금지."""

        # 사용자 프롬프트: 실제 질문 내용
        user_prompt_template = data.get('user_prompt', config.get('azure_openai_user_prompt'))
        if not user_prompt_template:
            user_prompt_template = "아래 Apache 설정을 분석하고 JSON으로 응답하십시오.\n\n{content}"

        # {content} 부분을 실제 설정 파일 내용으로 바꿔치기
        # 대소문자나 공백이 섞였을 경우를 대비해 정규식 치환 시도
        placeholder_pattern = re.compile(r'\{\s*content\s*\}', re.IGNORECASE)
        
        if placeholder_pattern.search(user_prompt_template):
            user_prompt = placeholder_pattern.sub(combined_content, user_prompt_template)
            logger.info("프롬프트 템플릿의 {content} 위치에 설정을 삽입했습니다.")
        else:
            # 플레이스홀더가 없으면 에러 방지를 위해 맨 뒤에 강제 결합
            user_prompt = f"{user_prompt_template}\n\n[분석 대상 설정 내용]:\n{combined_content}"
            logger.warning("프롬프트 템플릿에서 {content}를 찾을 수 없어 하단에 강제 결합했습니다.")

        # score_items 지시문 강제 주입 (응답에 반드시 포함되도록)
        SCORE_INJECTION = "\n[필수] JSON에 score_items 배열 포함: [{\"name\":\"항목명\",\"passed\":true,\"reason\":\"이유\"}]. passed=true(+1점)/false(0점). 최소 5개 이상."
        system_prompt = system_prompt + SCORE_INJECTION
        logger.info("score_items 지시문 주입 완료")

        # 로깅 (프리뷰 및 전체 프롬프트 기록)
        logger.info(f"--- AI 분석 요청 시작 ---")
        logger.info(f"System Prompt:\n{system_prompt}")
        logger.info(f"User Prompt:\n{user_prompt}")
        logger.info(f"최종 전송 프롬프트 길이: {len(user_prompt)}자")
        if len(combined_content.strip()) < 50:
            logger.warning("주의: 결합된 설정 파일 내용(combined_content)이 매우 짧습니다.")

        # 4. AI에게 메시지 전송
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        logger.info(f"Azure OpenAI에 분석 요청을 전송합니다 (모델: {config['azure_openai_deployment']})...")

        # 5. 결과 받아서 반환
        t_start = time.perf_counter()
        ai_msg = llm.invoke(messages)
        elapsed_seconds = round(time.perf_counter() - t_start, 1)

        logger.info(f"Azure OpenAI 분석 응답 수신 완료 (수행 시간: {elapsed_seconds}s)")

        # 토큰 사용량 정보 추출
        usage = getattr(ai_msg, 'usage_metadata', {})
        
        raw_response = ai_msg.content.strip()
        
        # AI가 마크다운 코드 블록(```json ... ```)으로 래핑한 경우 제거
        if raw_response.startswith('```json'):
            raw_response = raw_response[7:]
        elif raw_response.startswith('```'):
            raw_response = raw_response[3:]
            
        if raw_response.endswith('```'):
            raw_response = raw_response[:-3]
            
        raw_response = raw_response.strip()

        import json
        try:
            # 1. 일반적인 파싱 시도
            parsed_analysis = json.loads(raw_response)
        except json.JSONDecodeError:
            # 2. 파싱 실패 시 전처리 시도 (줄바꿈 이스케이프 누락 등 처리)
            logger.warning("JSON 기본 파싱 실패. 전처리를 시도합니다.")
            try:
                # 줄 끝에 위치한 비표준 백슬래시(\) 제거 (AI가 줄바꿈 표시용으로 쓰는 경우 대비)
                cleaned_response = re.sub(r'\\\s*\n', '\n', raw_response)
                # 이스케이프되지 않은 실제 줄바꿈을 \n으로 치환 (단, 필드 구분 등은 유지해야 하므로 주의)
                # 여기서는 간단하게 \r\n을 \n으로 통일하고, 
                # JSON 문자열 내부의 실제 줄바꿈은 json.loads가 못 받으므로 strict=False 옵션 사용 고려
                parsed_analysis = json.loads(cleaned_response, strict=False)
            except Exception as e2:
                logger.error(f"전처리 후에도 JSON 파싱 오류: {str(e2)}")
                logger.error(f"원본 데이터: {raw_response}")
                # 최종 실패 시 폴백
                parsed_analysis = {
                    "html_report": f"<p>AI 응답을 파싱하는 중 오류가 발생했습니다.</p><pre style='white-space: pre-wrap; background: #f8f9fa; padding: 10px;'>{raw_response}</pre>",
                    "recommendations": []
                }
        
        logger.info(f"JSON 파싱 완료. 응답을 클라이언트에 반환합니다.")
        return jsonify({
            'analysis': parsed_analysis,
            'usage': usage,
            'elapsed_seconds': elapsed_seconds
        })

    except Exception as e:
        logger.error(f"AI 분석 중 오류 발생: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
