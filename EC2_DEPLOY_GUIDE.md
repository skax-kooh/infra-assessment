# EC2 배포 및 실행 가이드

방금 생성한 EC2 인스턴스(Amazon Linux 2023 또는 Ubuntu)에서 이 프로그램을 실행하기 위한 단계별 절차입니다.

## 1. 사전 준비 (Prerequisites)

EC2 인스턴스의 **보안 그룹(Security Group)** 설정에서 다음 포트를 허용해야 합니다.
- **22 (SSH)**: 터미널 접속용 (내 IP만 허용 권장)
- **5000 (Custom TCP)**: Flask 웹 서버 접속용 (테스트 시 'Anywhere 0.0.0.0/0' 또는 내 IP 허용)

## 2. 서버 접속 및 기본 패키지 설치

터미널에서 SSH로 EC2에 접속한 후, 필요한 패키지(Python, Git)를 설치합니다.

### Amazon Linux 2023 (권장)
```bash
# 시스템 패키지 업데이트
sudo yum update -y

# Python 3 및 Git 설치
sudo yum install python3 git -y
```

### Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip git -y
```

## 3. 프로젝트 코드 다운로드

Github 저장소에서 코드를 클론하거나, 로컬에서 파일을 업로드합니다.

### 방법 A: Git Clone (Github에 코드가 있는 경우)
```bash
# 예시 URL (본인 저장소 주소로 변경)
git clone https://github.com/your-username/infra-assessment.git
cd infra-assessment
```

### 방법 B: 파일 업로드 (개발 PC -> EC2)
개발 PC에서 `scp` 명령어로 파일 전송 (또는 FTP 툴 사용)
```bash
# (개발 PC 터미널에서 실행)
scp -i "keypair.pem" -r ./infra-assessment ec2-user@<EC2_PUBLIC_IP>:~/
```
EC2 접속 후 폴더 이동:
```bash
cd infra-assessment
```

## 4. 파이썬 가상환경 구성 (권장)

패키지 충돌 방지를 위해 가상환경을 만듭니다.

```bash
# 가상환경 생성 (.venv 라는 이름으로)
python3 -m venv .venv

# 가상환경 활성화
source .venv/bin/activate
```
*(명령어 실행 후 프롬프트 앞에 `(.venv)`가 표시되면 성공입니다)*

## 5. 의존성 라이브러리 설치

```bash
# pip 업그레이드
pip install --upgrade pip

# 필수 라이브러리 설치
pip install -r requirements.txt
```

## 6. 애플리케이션 설정

`modules/config_store.py` 파일의 기본값은 비어있으므로, **웹 실행 후 설정 페이지**에서 입력하거나 코드에서 직접 수정할 수 있습니다.
(이 단계는 건너뛰고 웹화면에서 설정해도 됩니다.)

## 7. 서버 실행

```bash
# 백그라운드 말고 직접 실행 (로그 확인용)
python3 app.py
```

만약 터미널을 꺼도 계속 실행되게 하려면:
```bash
# nohup으로 백그라운드 실행
nohup python3 app.py > app.log 2>&1 &
```

## 8. 접속 확인

웹 브라우저를 열고 다음 주소로 접속합니다.

```
http://<EC2_PUBLIC_IP>:5000
```

---

### [참고] 문제 해결

1. **접속이 안 될 때**: 
   - AWS 보안 그룹(Security Group)에서 5000번 포트가 열려있는지 다시 확인하세요.
   - 브라우저 주소가 `https://`가 아닌 `http://` 인지 확인하세요.

2. **OpenAI API 에러**: 
   - 웹 접속 후 **[설정] > [LLM API 설정]** 메뉴에서 Endpoint와 API Key가 정확한지 확인하세요.
