/**
 * settings.js
 * LLM 설정 페이지 이벤트 핸들러
 */

import { addLog } from './utils.js';

/**
 * 이벤트 위임으로 설정 페이지 버튼들을 처리합니다.
 * (동적으로 로드되는 요소이므로 document 레벨에 이벤트를 등록)
 */
export function initSettings() {
    document.addEventListener('click', function (e) {
        const toggleBtn = e.target.closest('#toggle-key-visibility');
        const testBtn = e.target.closest('#test-connection-btn');
        const saveBtn = e.target.closest('#save-settings-btn');

        // 1. API 키 보기/숨기기
        if (toggleBtn) {
            const keyInput = document.getElementById('llm-api-key');
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                toggleBtn.textContent = 'Show';
            } else {
                keyInput.type = 'password';
                toggleBtn.textContent = 'Hide';
            }
        }

        // 2. 연결 테스트
        if (testBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('연결 테스트 시작');

            const endpoint = document.getElementById('llm-endpoint').value.trim();
            const apiKey = document.getElementById('llm-api-key').value.trim();
            const statusDiv = document.getElementById('connection-status');
            const logContainer = document.getElementById('connection-logs');

            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = '#e7f3fe';
            statusDiv.style.color = '#31708f';
            statusDiv.textContent = '연결 테스트 중...';

            if (logContainer) {
                logContainer.style.display = 'block';
                logContainer.innerHTML = '';
                addLog(logContainer, '테스트 시작...');
                addLog(logContainer, `엔드포인트: ${endpoint}`);
                addLog(logContainer, '백엔드로 요청 전송 중...');
            }

            fetch('/settings/llm/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: endpoint, api_key: apiKey })
            })
                .then(response => response.json())
                .then(data => {
                    console.log('테스트 결과:', data);
                    if (data.status === 'success') {
                        statusDiv.style.backgroundColor = '#dff0d8';
                        statusDiv.style.color = '#3c763d';
                        statusDiv.textContent = data.message;
                        if (logContainer) addLog(logContainer, '성공: ' + data.message, 'green');
                    } else {
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

        // 3. 설정 저장
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
                    const statusDiv = document.getElementById('connection-status');
                    if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.style.backgroundColor = '#dff0d8';
                        statusDiv.style.color = '#3c763d';
                        statusDiv.textContent = data.message;
                        setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
                    } else {
                        alert(data.message);
                    }
                })
                .catch(error => {
                    console.error('저장 중 오류:', error);
                    const statusDiv = document.getElementById('connection-status');
                    if (statusDiv) {
                        statusDiv.style.display = 'block';
                        statusDiv.style.backgroundColor = '#f2dede';
                        statusDiv.style.color = '#a94442';
                        statusDiv.textContent = '저장 실패: ' + error;
                    } else {
                        alert('저장 실패');
                    }
                });
        }
    });
}
