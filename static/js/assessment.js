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
        addServerTile('192.9.5.19', 'webwas', 'dlatl!00');
        addServerTile('192.9.133.56', 'webwas', 'dlatl!00');
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
}
