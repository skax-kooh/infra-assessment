from flask import Flask, render_template

# 우리가 만든 모듈(기능)들을 가져옵니다.
from modules.infrastructure.routes import infrastructure_bp
from modules.settings.routes import settings_bp

# 플라스크 앱 생성 (웹 서버의 본체)
app = Flask(__name__)

# 블루프린트 등록 (기능들을 앱에 연결)
# /infrastructure 주소로 들어오면 infrastructure_bp가 처리
app.register_blueprint(infrastructure_bp, url_prefix='/infrastructure')
# /settings 주소로 들어오면 settings_bp가 처리
app.register_blueprint(settings_bp, url_prefix='/settings')

# 메인 페이지 (홈) 라우트
@app.route('/')
def index():
    # templates/index.html 파일을 보여줍니다.
    return render_template('index.html')

# 이 파일이 직접 실행될 때만 웹 서버를 켭니다.
if __name__ == '__main__':
    # host='0.0.0.0': 외부 접속 허용 (EC2 등에서 필수)
    # debug=True: 코드 수정 시 자동 재시작
    # port=5000: 5000번 포트에서 실행
    app.run(host='0.0.0.0', debug=True, port=5000)
