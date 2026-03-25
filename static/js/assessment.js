/**
 * assessment.js
 * 웹서버 진단 페이지 기능 (서버 타일 관리, 스캔 로직)
 */

import { displayScanResults } from './results.js';

/**
 * 웹서버 진단 페이지에 필요한 이벤트 리스너를 연결합니다.
 * 동적으로 페이지가 로드될 때마다 호출됩니다.
 */
export function attachAssessmentListeners() {
    const scanBtn = document.getElementById('start-check-btn');
    const addServerBtn = document.getElementById('add-server-btn');
    const serverList = document.getElementById('server-list');
    const template = document.getElementById('server-tile-template');

    // 초기 화면: 서버 목록이 비어있으면 기본값으로 추가
    if (serverList && serverList.children.length === 0 && template) {
        addServerTile('192.9.133.56', 'webwas', 'dlatl!00');
        addServerTile('192.9.5.19', 'webwas', 'dlatl!00');
    }

    // [서버 추가] 버튼
    if (addServerBtn) {
        addServerBtn.addEventListener('click', function () {
            addServerTile();
        });
    }

    /**
     * 서버 입력 타일(박스)을 추가합니다.
     */
    function addServerTile(ip = '', user = '', pass = '') {
        if (!template) return;

        const clone = template.content.cloneNode(true);

        if (ip) clone.querySelector('.server-ip').value = ip;
        if (user) clone.querySelector('.server-user').value = user;
        if (pass) clone.querySelector('.server-pass').value = pass;

        const removeBtn = clone.querySelector('.remove-server-btn');
        removeBtn.addEventListener('click', function (e) {
            e.target.closest('.server-tile').remove();
        });

        serverList.appendChild(clone);
    }

    // [진단 시작] 버튼
    if (scanBtn) {
        scanBtn.addEventListener('click', function (e) {
            e.preventDefault();

            const tiles = document.querySelectorAll('.server-tile');
            const servers = [];
            let validationError = false;
            const statusDiv = document.getElementById('scan-status');

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

            // 각 타일에서 서버 정보 수집
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
                    servers.push({ ip, username: user || 'root', password });
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

            // 로딩 상태 표시
            const originalText = scanBtn.innerText;
            scanBtn.innerText = '조회 중...';
            scanBtn.disabled = true;
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.backgroundColor = '#e7f3fe';
                statusDiv.style.color = '#31708f';
                statusDiv.textContent = '서버에 접속하여 설정 정보를 조회 중입니다...';
            }

            // 백엔드로 진단 요청
            fetch('/infrastructure/web-server/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ servers }),
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { throw new Error(text || '서버 오류'); });
                    }
                    return response.json();
                })
                .then(data => {
                    displayScanResults(data);
                    scanBtn.innerText = originalText;
                    scanBtn.disabled = false;
                    if (statusDiv) statusDiv.style.display = 'none';
                })
                .catch(error => {
                    console.error('에러:', error);
                    showStatus('진단 중 오류가 발생했습니다: ' + error.message);
                    scanBtn.innerText = originalText;
                    scanBtn.disabled = false;
                });
        });
    }

    // -------------------------------------------------------------------------
    // AI 프롬프트 생성/개선 기능 (MCP 서버 연동)
    // -------------------------------------------------------------------------

    /** 상태 메시지 표시 헬퍼 */
    function showPromptStatus(el, msg, isError = false) {
        el.style.display = 'block';
        el.style.color = isError ? '#cc0000' : '#1565c0';
        el.textContent = msg;
    }

    // [✨ 생성] 버튼 - MCP generate_prompt 호출
    const generateBtn = document.getElementById('generate-prompt-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            const intentInput = document.getElementById('prompt-intent-input');
            const statusEl = document.getElementById('generate-prompt-status');
            const intent = intentInput ? intentInput.value.trim() : '';

            if (!intent) {
                showPromptStatus(statusEl, '진단 의도를 입력해주세요.', true);
                return;
            }

            generateBtn.disabled = true;
            generateBtn.textContent = '생성 중...';
            showPromptStatus(statusEl, 'MCP 서버에 요청 중...', false);

            fetch('/settings/prompt/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intent })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        const d = data.data;
                        if (d.system_prompt) {
                            document.getElementById('ai-system-prompt').value = d.system_prompt;
                        }
                        if (d.user_prompt) {
                            document.getElementById('ai-user-prompt').value = d.user_prompt;
                        }
                        showPromptStatus(statusEl, '✅ 프롬프트가 생성되었습니다!', false);
                    } else {
                        showPromptStatus(statusEl, '❌ ' + data.message, true);
                    }
                })
                .catch(err => showPromptStatus(statusEl, '❌ 오류: ' + err.message, true))
                .finally(() => {
                    generateBtn.disabled = false;
                    generateBtn.textContent = '✨ 생성';
                });
        });
    }

    // [🔧 AI 개선] 버튼들 - 개선 패널 열기
    const improveBtns = document.querySelectorAll('.improve-prompt-btn');
    const improvePanel = document.getElementById('improve-prompt-panel');
    const improveTargetInput = document.getElementById('improve-target-type');

    improveBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            if (!improvePanel) return;
            improveTargetInput.value = this.dataset.target;  // "system" or "user"
            improvePanel.style.display = 'block';
            document.getElementById('improve-feedback-input').focus();
        });
    });

    // [취소] 버튼
    const cancelImproveBtn = document.getElementById('cancel-improve-btn');
    if (cancelImproveBtn && improvePanel) {
        cancelImproveBtn.addEventListener('click', () => {
            improvePanel.style.display = 'none';
        });
    }

    // [개선 실행] 버튼 - MCP improve_prompt 호출
    const doImproveBtn = document.getElementById('do-improve-prompt-btn');
    if (doImproveBtn) {
        doImproveBtn.addEventListener('click', function () {
            const statusEl = document.getElementById('improve-prompt-status');
            const promptType = improveTargetInput ? improveTargetInput.value : 'system';
            const textareaId = promptType === 'system' ? 'ai-system-prompt' : 'ai-user-prompt';
            const currentPrompt = document.getElementById(textareaId)?.value.trim() || '';
            const feedback = document.getElementById('improve-feedback-input')?.value.trim() || '';

            if (!currentPrompt || !feedback) {
                showPromptStatus(statusEl, '현재 프롬프트와 개선 요청사항을 입력해주세요.', true);
                return;
            }

            doImproveBtn.disabled = true;
            doImproveBtn.textContent = '개선 중...';
            showPromptStatus(statusEl, 'MCP 서버에 요청 중...', false);

            fetch('/settings/prompt/improve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_prompt: currentPrompt, feedback, prompt_type: promptType })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        document.getElementById(textareaId).value = data.data.improved_prompt;
                        showPromptStatus(statusEl, `✅ ${data.data.changes_summary || '개선 완료!'}`, false);
                        setTimeout(() => { if (improvePanel) improvePanel.style.display = 'none'; }, 2000);
                    } else {
                        showPromptStatus(statusEl, '❌ ' + data.message, true);
                    }
                })
                .catch(err => showPromptStatus(statusEl, '❌ 오류: ' + err.message, true))
                .finally(() => {
                    doImproveBtn.disabled = false;
                    doImproveBtn.textContent = '개선 실행';
                });
        });
    }
}
