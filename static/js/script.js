document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('#content');

    // ------------------------------------------------------------------------
    // 사이드바 메뉴 토글 기능
    // ------------------------------------------------------------------------
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function (e) {
            e.preventDefault(); // 기본 링크 이동 방지
            const submenu = this.nextElementSibling; // 바로 다음에 있는 요소(서브메뉴) 찾기
            if (submenu) {
                // 'show' 클래스를 껐다 켰다 함 (CSS로 보이기/숨기기 처리)
                submenu.classList.toggle('show');
                submenu.style.display = submenu.classList.contains('show') ? 'block' : 'none';
            }
        });
    });

    // ------------------------------------------------------------------------
    // 동적 페이지 로딩 (SPA 처럼 작동)
    // 왼쪽 메뉴를 클릭하면 페이지 전체를 새로고침하지 않고 내용만 가져옵니다.
    // ------------------------------------------------------------------------
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const url = this.getAttribute('data-url');
            console.log('페이지 이동:', url);

            fetch(url)
                .then(response => response.text())
                .then(html => {
                    const mainContent = document.querySelector('#main-content');

                    // 가져온 HTML 텍스트를 분석기(Parser)를 통해 DOM으로 만듭니다.
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // 가져온 페이지에서 '#main-content' 부분만 찾습니다.
                    const newContentContainer = doc.querySelector('#main-content');

                    // 찾았으면 그 내용을, 못 찾았으면 전체 HTML을 사용합니다.
                    const newContent = newContentContainer ? newContentContainer.innerHTML : html;

                    // 현재 페이지의 메인 컨텐츠 영역을 교체합니다.
                    mainContent.innerHTML = newContent;

                    // 페이지별로 필요한 추가 스크립트 기능(이벤트 리스너 등)을 다시 연결합니다.
                    if (url.includes('/infrastructure/web-server')) {
                        console.log('웹서버 진단 페이지 기능 활성화');
                        attachAssessmentListeners();
                    } else if (url.includes('/settings/llm')) {
                        console.log('LLM 설정 페이지 로드됨');
                    }
                })
                .catch(error => console.error('페이지 로딩 실패:', error));
        });
    });

    // ------------------------------------------------------------------------
    // 이벤트 위임 (동적으로 로드된 요소들의 클릭 이벤트 처리)
    // "LLM 설정" 페이지의 버튼들은 나중에 생기므로 document에 이벤트를 걸어둡니다.
    // ------------------------------------------------------------------------
    document.addEventListener('click', function (e) {
        // 클릭된 요소가 해당 버튼이거나 그 버튼의 자식인지 확인
        const toggleBtn = e.target.closest('#toggle-key-visibility'); // API 키 보기/숨기기
        const testBtn = e.target.closest('#test-connection-btn');     // 연결 테스트
        const saveBtn = e.target.closest('#save-settings-btn');       // 설정 저장

        // 1. API 키 보기/숨기기 버튼 처리
        if (toggleBtn) {
            const keyInput = document.getElementById('llm-api-key');
            if (keyInput.type === 'password') {
                keyInput.type = 'text'; // 보이게
                toggleBtn.textContent = 'Show'; // 아이콘 변경
            } else {
                keyInput.type = 'password'; // 숨기게
                toggleBtn.textContent = 'Hide';
            }
        }

        // 2. 연결 테스트 버튼 처리
        if (testBtn) {
            e.preventDefault();
            e.stopPropagation(); // 이벤트 전파 중단
            console.log('연결 테스트 시작');

            const endpoint = document.getElementById('llm-endpoint').value.trim();
            const apiKey = document.getElementById('llm-api-key').value.trim();
            const statusDiv = document.getElementById('connection-status');
            const logContainer = document.getElementById('connection-logs');

            // 상태 표시줄 초기화
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = '#e7f3fe'; // 파란색 (대기 중)
            statusDiv.style.color = '#31708f';
            statusDiv.textContent = '연결 테스트 중...';

            // 로그 창이 있으면 초기화하고 로그 기록 시작
            if (logContainer) {
                logContainer.style.display = 'block';
                logContainer.innerHTML = '';
                addLog(logContainer, '테스트 시작...');
                addLog(logContainer, `엔드포인트: ${endpoint}`);
                addLog(logContainer, '백엔드로 요청 전송 중...');
            }

            // 서버에 테스트 요청
            fetch('/settings/llm/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: endpoint, api_key: apiKey })
            })
                .then(response => response.json())
                .then(data => {
                    console.log('테스트 결과:', data);
                    if (data.status === 'success') {
                        // 성공 시 녹색
                        statusDiv.style.backgroundColor = '#dff0d8';
                        statusDiv.style.color = '#3c763d';
                        statusDiv.textContent = data.message;
                        if (logContainer) addLog(logContainer, '성공: ' + data.message, 'green');
                    } else {
                        // 실패 시 빨간색
                        statusDiv.style.backgroundColor = '#f2dede';
                        statusDiv.style.color = '#a94442';
                        statusDiv.textContent = data.message;
                        if (logContainer) addLog(logContainer, '실패: ' + data.message, 'red');
                    }
                })
                .catch(error => {
                    console.error('테스트 에러:', error);
                    statusDiv.style.backgroundColor = '#f2dede';
                    statusDiv.style.color = '#a94442';
                    statusDiv.textContent = '오류: ' + error;
                    if (logContainer) addLog(logContainer, '오류: ' + error, 'red');
                });
        }

        // 3. 설정 저장 버튼 처리
        if (saveBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('설정 저장 버튼 클릭됨');

            const endpoint = document.getElementById('llm-endpoint').value.trim();
            const apiKey = document.getElementById('llm-api-key').value.trim();

            fetch('/settings/llm/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: endpoint, api_key: apiKey })
            })
                .then(response => response.json())
                .then(data => {
                    console.log('저장 결과:', data);
                    // 상태 메시지 표시
                    const statusDiv = document.getElementById('connection-status');
                    if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.style.backgroundColor = '#dff0d8'; // 녹색
                        statusDiv.style.color = '#3c763d';
                        statusDiv.textContent = data.message;

                        // 3초 뒤에 메시지 숨김
                        setTimeout(() => {
                            statusDiv.style.display = 'none';
                        }, 3000);
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('저장 중 오류:', error);
                    const statusDiv = document.getElementById('connection-status');
                    if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.style.backgroundColor = '#f2dede'; // 빨간색
                        statusDiv.style.color = '#a94442';
                        statusDiv.textContent = '저장 실패: ' + error;
                    } else {
                        alert('저장 실패');
                    }
                });
        }
    });

    // ------------------------------------------------------------------------
    // 로그 출력 헬퍼 함수
    // 작은 로그 창에 시간값과 함께 메시지를 한 줄씩 추가합니다.
    // ------------------------------------------------------------------------
    function addLog(container, message, color = 'black') {
        const p = document.createElement('p');
        p.style.margin = '2px 0';
        p.style.fontSize = '12px';
        p.style.fontFamily = 'monospace'; // 고정폭 글꼴 (코딩용 폰트)
        p.style.color = color;

        // 현재 시간 (시:분:초)
        const now = new Date();
        const time = now.toTimeString().split(' ')[0];
        p.textContent = `[${time}] ${message}`;

        container.appendChild(p);
        // 스크롤을 항상 맨 아래로 내림
        container.scrollTop = container.scrollHeight;
    }

    // ------------------------------------------------------------------------
    // 웹서버 진단 페이지 기능 연결 함수
    // 페이지가 로드될 때마다 필요한 이벤트 리스너(클릭 동작 등)를 다시 연결해줍니다.
    // ------------------------------------------------------------------------
    function attachAssessmentListeners() {
        const scanBtn = document.getElementById('start-check-btn');
        const addServerBtn = document.getElementById('add-server-btn');
        const serverList = document.getElementById('server-list');
        const template = document.getElementById('server-tile-template');


        // 초기 화면: 서버 목록이 비어있으면 기본값으로 하나 추가해줍니다.
        if (serverList && serverList.children.length === 0 && template) {
            addServerTile('192.9.5.19', 'webwas', 'dlatl!00');
        }

        // [서버 추가] 버튼
        if (addServerBtn) {
            addServerBtn.addEventListener('click', function () {
                addServerTile();
            });
        }

        // 서버 입력 타일(박스) 추가 함수
        function addServerTile(ip = '', user = '', pass = '') {
            if (!template) return;

            // 템플릿 복사해서 새로운 요소 생성
            const clone = template.content.cloneNode(true);

            // 값이 있으면 채워줍니다.
            if (ip) clone.querySelector('.server-ip').value = ip;
            if (user) clone.querySelector('.server-user').value = user;
            if (pass) clone.querySelector('.server-pass').value = pass;

            // [삭제] 버튼 기능 연결
            const removeBtn = clone.querySelector('.remove-server-btn');
            removeBtn.addEventListener('click', function (e) {
                // 버튼이 포함된 가장 가까운 타일(.server-tile)을 찾아서 삭제
                e.target.closest('.server-tile').remove();
            });

            serverList.appendChild(clone);
        }

        // [진단 시작] 버튼
        if (scanBtn) {
            scanBtn.addEventListener('click', function (e) {
                e.preventDefault();

                // 입력된 서버 정보 수집
                const tiles = document.querySelectorAll('.server-tile');
                const servers = [];
                let validationError = false;
                const statusDiv = document.getElementById('scan-status');

                // 상태 메시지 보여주기 헬퍼
                const showStatus = (msg, isError = true) => {
                    if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.style.backgroundColor = isError ? '#f2dede' : '#dff0d8';
                        statusDiv.style.color = isError ? '#a94442' : '#3c763d';
                        statusDiv.textContent = msg;
                    } else {
                        alert(msg);
                    }
                };

                if (statusDiv) statusDiv.style.display = 'none';

                // 각 타일에서 정보 읽기
                tiles.forEach(tile => {
                    const ip = tile.querySelector('.server-ip').value.trim();
                    const user = tile.querySelector('.server-user').value.trim();
                    const password = tile.querySelector('.server-pass').value;

                    if (!ip) {
                        tile.querySelector('.server-ip').style.borderColor = 'red';
                        validationError = true;
                    } else {
                        tile.querySelector('.server-ip').style.borderColor = '#ccc';
                    }

                    if (ip) {
                        servers.push({
                            ip: ip,
                            username: user || 'root', // 비어있으면 root가 기본
                            password: password
                        });
                    }
                });

                if (servers.length === 0) {
                    showStatus('최소 하나의 서버 정보를 입력해주세요.');
                    return;
                }

                if (validationError) {
                    showStatus('IP 주소를 입력해주세요.');
                    return;
                }

                // 로딩 상태 표시 (버튼 비활성화)
                const originalText = scanBtn.innerText;
                scanBtn.innerText = '조회 중...';
                scanBtn.disabled = true;
                if (statusDiv) {
                    statusDiv.style.display = 'block';
                    statusDiv.style.backgroundColor = '#e7f3fe';
                    statusDiv.style.color = '#31708f';
                    statusDiv.textContent = '서버에 접속하여 설정 정보를 조회 중입니다...';
                }

                // 백엔드로 진단 요청 전송
                fetch('/infrastructure/web-server/scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ servers: servers }),
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => { throw new Error(text || '서버 오류'); });
                        }
                        return response.json();
                    })
                    .then(data => {
                        // 결과 화면에 표시
                        displayScanResults(data);

                        // 버튼 원상복구
                        scanBtn.innerText = originalText;
                        scanBtn.disabled = false;
                        if (statusDiv) statusDiv.style.display = 'none'; // 성공하면 상태메시지 숨김
                    })
                    .catch(error => {
                        console.error('에러:', error);
                        showStatus('진단 중 오류가 발생했습니다: ' + error.message);
                        scanBtn.innerText = originalText;
                        scanBtn.disabled = false;
                    });
            });
        }
    }

    // ------------------------------------------------------------------------
    // 진단 결과 표시
    // 서버에서 받은 JSON 데이터를 HTML로 예쁘게 그려줍니다.
    // ------------------------------------------------------------------------
    function displayScanResults(results) {
        const resultContainer = document.getElementById('scan-results');
        const tableContainer = document.getElementById('results-table-container');

        if (!results || results.length === 0) {
            tableContainer.innerHTML = '<p>결과가 없습니다.</p>';
            resultContainer.style.display = 'block';
            return;
        }

        let html = '';

        // --------------------------------------------------------------------
        // 전체 서버 통합 AI 진단 버튼
        // --------------------------------------------------------------------
        html += `
            <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #333;">AI 진단</h3>
                <p style="color: #666; margin-bottom: 15px;">조회된 모든 서버의 설정 파일들을 AI가 종합적으로 분석합니다.</p>
                
                <button class="btn-primary" 
                    id="analyze-all-servers-btn"
                    onclick="analyzeAllServers()" 
                    style="width: 100%; padding: 15px; background: #28a745; font-weight: bold; font-size: 1.1em;">
                    진단 실행
                </button>
                
                <!-- 전체 분석 결과 표시 영역 -->
                <div id="global-all-servers-analysis" style="display: none; margin-top: 20px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #d0bfff;">
                    <h4 style="color: #28a745; margin-top: 0;">진단 결과</h4>
                    <div class="analysis-content" style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;"></div>
                </div>
            </div>
        `;

        results.forEach((item, index) => {
            const statusColor = item.status === 'success' ? 'green' : 'red';
            const statusText = item.status === 'success' ? '성공' : '실패';

            html += `
                <div class="result-card" style="border: 1px solid #ddd; margin-bottom: 20px; border-radius: 8px; overflow: hidden;" data-server-ip="${item.ip}">
                    <div style="background: #f2f2f2; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <strong>${item.ip}</strong>
                        <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                    </div>
                    <div style="padding: 15px;">
            `;

            if (item.status === 'success') {
                html += `
                    <p><strong>메인 설정파일:</strong> ${item.main_config_file} (루트: ${item.server_root})</p>
                    <p><strong>발견된 파일 수:</strong> ${item.config_count}</p>
                    
                    <!-- 설정 파일 목록 (접기/펼치기 가능) -->
                    <details style="margin-top: 15px; border: 1px solid #ccc; border-radius: 4px;">
                        <summary style="padding: 10px; background-color: #eee; cursor: pointer; font-weight: bold;">
                            설정 파일 목록 및 내용 확인 (클릭하여 펼치기)
                        </summary>
                        
                        <div class="config-files-container" style="display: flex; height: 400px; border-top: 1px solid #ccc;">
                            <!-- 왼쪽: 파일 목록 -->
                            <div class="file-list" style="width: 30%; overflow-y: auto; border-right: 1px solid #ccc;">
                                <ul style="list-style: none; padding: 0; margin: 0;">
                `;

                // 각 설정 파일 목록 생성
                if (item.configs && item.configs.length > 0) {
                    item.configs.forEach((config, idx) => {
                        html += `
                            <li style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;" 
                                onclick="showConfigContent(this, 'content-${index}-${idx}')"
                                class="${idx === 0 ? 'active-file' : ''}">
                                ${config.path.split('/').pop()} <!-- 파일명만 추출 -->
                                <div style="font-size: 0.8em; color: #666;">${config.path}</div>
                            </li>
                        `;
                    });
                }

                html += `       </ul>
                            </div>
                            <!-- 오른쪽: 파일 내용 -->
                            <div class="file-content" style="width: 70%; overflow-y: auto; padding: 10px; background: #f9f9f9;">
                `;

                if (item.configs && item.configs.length > 0) {
                    item.configs.forEach((config, idx) => {
                        const style = idx === 0 ? 'display: block;' : 'display: none;';
                        // HTML 태그가 그대로 렌더링되지 않도록 안전하게 변환 (Escaping)
                        const safeContent = config.content.replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;");

                        html += `
                            <div id="content-${index}-${idx}" class="config-content-pane" style="${style}" data-path="${config.path}" data-server-ip="${item.ip}">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <h4 style="margin: 0;">${config.path}</h4>
                                </div>
                                <!-- 원본 내용은 숨겨두고 나중에 꺼내씁니다 (인코딩하여 깨짐 방지) -->
                                <div class="config-raw-content" style="display:none;">${encodeURIComponent(config.content)}</div>
                                <pre class="config-text" style="white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 12px; background: #fff; padding: 10px; border: 1px solid #eee;">${safeContent}</pre>
                            </div>
                        `;
                    });
                }

                html += `
                            </div>
                        </div>
                    </details>
                `;

                // 개별 서버 진단 버튼
                if (item.configs && item.configs.length > 0) {
                    html += `
                        <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 20px;">
                            <button class="btn-secondary" 
                                onclick="analyzeAllConfigs(this, ${index})" 
                                style="width: 100%; padding: 10px; margin-bottom: 10px; background: #6c757d; color: white; border: none; border-radius: 4px;">
                                이 서버만 AI 진단 수행 (${item.ip})
                            </button>
                            <!-- AI 분석 결과가 표시될 곳 (처음엔 숨김) -->
                            <div id="global-analysis-${index}" style="display: none; background: #f3f0ff; padding: 20px; border-radius: 8px; border: 1px solid #d0bfff; margin-bottom: 20px;">
                                <h4 style="color: #6f42c1; margin-top: 0;">개별 서버 진단 결과 (${item.ip})</h4>
                                <div class="analysis-content" style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;"></div>
                            </div>
                        </div>
                    `;
                }

            } else {
                html += `<p style="color: red;">오류: ${item.message}</p>`;
            }

            html += `
                    </div>
                </div>
            `;
        });

        tableContainer.innerHTML = html;
        resultContainer.style.display = 'block';

        // --------------------------------------------------------------------
        // 전역 헬퍼 함수 정의
        // --------------------------------------------------------------------

        // 파일 클릭 시 내용 보여주는 함수
        if (!window.showConfigContent) {
            window.showConfigContent = function (element, contentId) {
                // 부모 컨테이너 찾기
                const container = element.closest('.config-files-container');

                // 모든 항목의 배경색을 투명하게 (선택 해제 느낌)
                container.querySelectorAll('li').forEach(li => li.style.background = 'transparent');
                // 클릭된 항목만 배경색 칠하기
                element.style.background = '#e0e0e0';

                // 모든 파일 내용 숨기기
                container.querySelectorAll('.config-content-pane').forEach(div => div.style.display = 'none');

                // 선택된 파일 내용만 보이기
                const contentDiv = document.getElementById(contentId);
                if (contentDiv) contentDiv.style.display = 'block';
            }
        }

        // 개별 서버 AI 진단 함수
        if (!window.analyzeAllConfigs) {
            window.analyzeAllConfigs = function (button, index) {
                const resultDiv = document.getElementById(`global-analysis-${index}`);
                const analysisContentPre = resultDiv.querySelector('.analysis-content');

                // 1. 해당 서버의 모든 설정 파일 내용 수집
                const card = button.closest('.result-card');
                const configPanes = card.querySelectorAll('.config-content-pane');

                const configs = [];
                configPanes.forEach(pane => {
                    const path = pane.getAttribute('data-path');
                    const serverIp = pane.getAttribute('data-server-ip') || 'Unknown IP';
                    // 숨겨둔 원본 내용 가져오기
                    const rawContentDiv = pane.querySelector('.config-raw-content');
                    const content = decodeURIComponent(rawContentDiv.textContent);

                    configs.push({
                        path: `[${serverIp}] ${path}`, // 파일 경로 앞에 IP 추가
                        content: content
                    });
                });

                if (configs.length === 0) {
                    alert('분석할 설정 파일이 없습니다.');
                    return;
                }

                // 2. AI 분석 요청 실행
                performAiAnalysis(configs, resultDiv, analysisContentPre);
            }
        }

        // --------------------------------------------------------------------
        // 모든 서버 통합 AI 진단
        // --------------------------------------------------------------------
        if (!window.analyzeAllServers) {
            window.analyzeAllServers = function () {
                const resultDiv = document.getElementById('global-all-servers-analysis');
                const analysisContentPre = resultDiv.querySelector('.analysis-content');

                // 1. 화면에 있는 모든 설정 파일 수집
                const configPanes = document.querySelectorAll('.config-content-pane');
                const configs = [];

                configPanes.forEach(pane => {
                    const path = pane.getAttribute('data-path');
                    // 서버 IP 정보도 같이 가져옴 (파일명 구분을 위해)
                    const serverIp = pane.getAttribute('data-server-ip') || 'Unknown Server';

                    const rawContentDiv = pane.querySelector('.config-raw-content');
                    const content = decodeURIComponent(rawContentDiv.textContent);

                    configs.push({
                        path: `[서버: ${serverIp}] ${path}`, // 경로에 서버 IP 명시
                        content: content
                    });
                });

                if (configs.length === 0) {
                    alert('분석할 서버 설정 파일이 하나도 없습니다.');
                    return;
                }

                // 2. AI 분석 요청 실행
                performAiAnalysis(configs, resultDiv, analysisContentPre);
            }
        }

        // 공통 AI 분석 요청 함수
        function performAiAnalysis(configs, resultDiv, outputElement) {
            // 화면에 있는 프롬프트 설정값 가져오기
            const systemPrompt = document.getElementById('ai-system-prompt').value;
            const userPrompt = document.getElementById('ai-user-prompt').value;

            // 로딩 상태 표시
            resultDiv.style.display = 'block';
            outputElement.innerHTML = '분석 중...';
            outputElement.style.color = '#333';

            // 기존에 렌더링 된 Diff나 뱃지 등 초기화
            document.querySelectorAll('.diff-container, .diff-toggle-btns').forEach(el => el.remove());
            document.querySelectorAll('.ai-badge').forEach(el => el.remove());

            // 백엔드로 요청
            fetch('/infrastructure/web-server/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    configs: configs,
                    system_prompt: systemPrompt,
                    user_prompt: userPrompt
                }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        outputElement.innerHTML = '<p style="color: red;">오류: ' + data.error + '</p>';
                    } else {
                        // data.analysis는 이제 JSON 객체입니다 ({ html_report, modified_configs })
                        const analysisData = data.analysis;
                        let reportHtml = analysisData.html_report || "";

                        // [수정] 토큰 사용량 표시
                        if (data.usage) {
                            const total = data.usage.total_tokens || 0;
                            const prompt = data.usage.input_tokens || 0;
                            const completion = data.usage.output_tokens || 0;

                            const tokenBadge = `
                                <div style="float: right; font-size: 11px; background: #e9ecef; padding: 4px 8px; border-radius: 12px; color: #495057; font-weight: 500; margin-bottom: 10px;">
                                    Tokens: <strong>${total.toLocaleString()}</strong> 
                                    (Input: ${prompt.toLocaleString()}, Output: ${completion.toLocaleString()})
                                </div>
                                <div style="clear: both;"></div>
                            `;
                            // AI가 부분적으로 마크다운 블록으로 감쌌을 경우 제거
                            reportHtml = reportHtml.replace(/```html\n?/ig, '').replace(/```\n?/g, '').trim();
                            outputElement.innerHTML = tokenBadge + reportHtml;
                        } else {
                            reportHtml = reportHtml.replace(/```html\n?/ig, '').replace(/```\n?/g, '').trim();
                            outputElement.innerHTML = reportHtml;
                        }
                        outputElement.style.color = '#333';

                        // ----------------------------------------------------
                        // ✨ AI 개선안 (Diff) 처리 로직
                        // ----------------------------------------------------
                        if (analysisData.modified_configs && Array.isArray(analysisData.modified_configs)) {
                            analysisData.modified_configs.forEach(modConfig => {
                                // 클라이언트 측에서 만든 path 형식("[서버 IP] /경로")과 매칭해야 함
                                // 혹은 서버 IP 문자열이 포함되어 있는지 여부로 느슨하게 매칭 가능
                                
                                // 화면의 모든 pane 찾기
                                const panes = document.querySelectorAll('.config-content-pane');
                                panes.forEach(pane => {
                                    const panePath = pane.getAttribute('data-path');
                                    const serverIp = pane.getAttribute('data-server-ip');
                                    const fullPanePath = `[${serverIp}] ${panePath}`;
                                    const fullPanePath2 = `[서버: ${serverIp}] ${panePath}`;
                                    
                                    // AI가 응답한 경로와 현재 pane의 경로가 일치하면 Diff 생성
                                    if (modConfig.path === panePath || 
                                        modConfig.path === fullPanePath || 
                                        modConfig.path === fullPanePath2) {
                                        
                                        // 원본 텍스트
                                        const originalText = decodeURIComponent(pane.querySelector('.config-raw-content').innerHTML);
                                        const newText = modConfig.modified_content;

                                        // 1. jsdiff를 이용해 라인별 차이(Diff) 생성
                                        const diff = Diff.diffLines(originalText, newText);
                                        
                                        // 2. 간단한 HTML 생성 (삭제는 빨간색, 추가는 초록색)
                                        let diffHtml = '<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 13px; line-height: 1.5; padding: 15px; margin: 0; background: #2b2b2b; color: #f8f8f2;">';
                                        
                                        diff.forEach(part => {
                                            // 삭제된 라인은 붉은색 바탕 (- 표시)
                                            // 추가된 라인은 녹색 바탕 (+ 표시)
                                            // 일반 라인은 투명
                                            let bgColor = part.added ? '#1e3a1e' : part.removed ? '#3a1e1e' : 'transparent';
                                            let textColor = part.added ? '#4CAF50' : part.removed ? '#ff4444' : '#f8f8f2';
                                            let prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
                                            
                                            // HTML 이스케이프 함수
                                            const escapeHtml = (unsafe) => {
                                                if(!unsafe) return '';
                                                return unsafe
                                                     .replace(/&/g, "&amp;")
                                                     .replace(/</g, "&lt;")
                                                     .replace(/>/g, "&gt;")
                                                     .replace(/"/g, "&quot;")
                                                     .replace(/'/g, "&#039;");
                                            };
                                            
                                            // 라인별로 처리하여 prefix를 붙여줌
                                            let lines = part.value.split('\n');
                                            // 마지막 빈 줄 제거 (split 특성상 끝에 빈 문자열이 생김)
                                            if (lines[lines.length - 1] === '') {
                                                lines.pop();
                                            }
                                            
                                            lines.forEach(line => {
                                                diffHtml += `<div style="background-color: ${bgColor}; color: ${textColor}; padding: 0 5px;">${prefix}${escapeHtml(line)}</div>`;
                                            });
                                        });
                                        
                                        diffHtml += '</pre>';

                                        // 3. 기존 화면(original 뷰)을 감싸기
                                        const originalPre = pane.querySelector('.config-text');
                                        
                                        // 토글 버튼과 Diff 컨테이너 생성
                                        if (!pane.querySelector('.diff-container')) {
                                            const diffContainer = document.createElement('div');
                                            diffContainer.className = 'diff-container';
                                            diffContainer.style.display = 'none';
                                            diffContainer.style.background = '#2b2b2b';
                                            diffContainer.style.border = '1px solid #444';
                                            diffContainer.style.borderRadius = '6px';
                                            diffContainer.style.marginTop = '10px';
                                            diffContainer.style.overflowX = 'auto';
                                            diffContainer.style.maxWidth = '100%';
                                            diffContainer.innerHTML = diffHtml;
                                            pane.appendChild(diffContainer);

                                            // 토글 버튼 삽입
                                            const btnGroup = document.createElement('div');
                                            btnGroup.className = 'diff-toggle-btns';
                                            btnGroup.style.marginBottom = '10px';
                                            btnGroup.innerHTML = `
                                                <button type="button" class="btn-secondary toggle-orig-btn" style="background: #6c757d; font-size:12px;">📄 원본 보기</button>
                                                <button type="button" class="btn-primary toggle-diff-btn" style="background: #6f42c1; font-size:12px; margin-left:5px;">✨ AI 개선안 보기 (Diff)</button>
                                            `;
                                            // 헤더 다음 위치에 버튼 넣기
                                            originalPre.parentNode.insertBefore(btnGroup, originalPre);
                                            
                                            // 이벤트 리스너
                                            btnGroup.querySelector('.toggle-orig-btn').addEventListener('click', () => {
                                                originalPre.style.display = 'block';
                                                diffContainer.style.display = 'none';
                                            });
                                            btnGroup.querySelector('.toggle-diff-btn').addEventListener('click', () => {
                                                originalPre.style.display = 'none';
                                                diffContainer.style.display = 'block';
                                            });
                                            
                                            // 4. 왼쪽 메뉴(li 파일 목록)에 ✨ AI 뱃지 추가
                                            // li 요소들을 모두 뒤져서 이 pane과 매칭되는 것을 찾음
                                            const container = pane.closest('.config-files-container');
                                            if (container) {
                                                const lis = container.querySelectorAll('li');
                                                lis.forEach(li => {
                                                    // onclick 텍스트로 contentId 찾기
                                                    if (li.getAttribute('onclick').includes(pane.id)) {
                                                        // 뱃지를 붙임
                                                        if (!li.querySelector('.ai-badge')) {
                                                            const badge = document.createElement('span');
                                                            badge.className = 'ai-badge';
                                                            badge.style.cssText = 'font-size: 10px; background: #6f42c1; color: white; padding: 2px 4px; border-radius: 4px; margin-left: 5px; vertical-align: middle;';
                                                            badge.textContent = '✨ AI';
                                                            li.appendChild(badge);
                                                        }
                                                    }
                                                });
                                            }
                                        } else { // Added missing else block
                                            // If diff container already exists, ensure original view is shown by default
                                            pane.querySelector('.config-text').style.display = 'block';
                                            pane.querySelector('.diff-container').style.display = 'none';
                                        }
                                    }
                                });
                            });
                        }
                    }
                })
                .catch((error) => {
                    console.error('분석 오류:', error);
                    // 콘솔에 명확하게 에러 스택을 찍도록 추가
                    console.trace(error);
                    outputElement.innerHTML = `<p style="color: red;">분석 중 오류가 발생했습니다: ${error.message}</p>`;
                });
        }
    }
});
