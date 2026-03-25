/**
 * results.js
 * 스캔 결과 HTML 렌더링
 */

/**
 * 파일 목록 클릭 시 해당 파일 내용을 보여줍니다.
 * (onclick 속성에서 전역으로 호출되므로 window에 등록됨)
 */
export function showConfigContent(element, contentId) {
    const container = element.closest('.config-files-container');

    // 모든 항목 선택 해제
    container.querySelectorAll('li').forEach(li => li.style.background = 'transparent');
    element.style.background = '#e0e0e0';

    // 모든 파일 내용 숨기기
    container.querySelectorAll('.config-content-pane').forEach(div => div.style.display = 'none');

    // 선택된 파일만 표시
    const contentDiv = document.getElementById(contentId);
    if (contentDiv) contentDiv.style.display = 'block';
}

/**
 * 서버 스캔 결과를 HTML로 렌더링합니다.
 * - 서버별 설정파일 타일은 '진단 대상 서버' 카드 내부(#config-results-container)에 렌더링
 * - AI 진단 타일은 'AI Prompt Settings' 카드 아래(#ai-diagnosis-container)에 렌더링
 * @param {Array} results - 백엔드에서 받은 스캔 결과 배열
 */
export function displayScanResults(results) {
    // 서버별 설정파일 컨테이너 (진단 대상 서버 카드 내부)
    const configResultsContainer = document.getElementById('config-results-container');
    const configTableContainer = document.getElementById('config-results-table-container');

    // AI 진단 컨테이너 (AI Prompt Settings 카드 아래)
    const aiDiagnosisContainer = document.getElementById('ai-diagnosis-container');
    const aiDiagnosisTableContainer = document.getElementById('ai-diagnosis-table-container');

    if (!results || results.length === 0) {
        if (configTableContainer) configTableContainer.innerHTML = '<p>결과가 없습니다.</p>';
        if (configResultsContainer) configResultsContainer.style.display = 'block';
        return;
    }

    let configHtml = '';
    let aiHtml = '';

    // AI 진단 타일 (전체 서버 통합)
    aiHtml += `
        <div class="card" style="margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333;">AI 진단</h3>
            <p style="color: #666; margin-bottom: 15px;">조회된 모든 서버의 설정 항목들을 AI가 생성한 프롬프트로 분석합니다.</p>
            <button class="btn-primary"
                id="analyze-all-servers-btn"
                onclick="analyzeAllServers()"
                style="width: 100%; padding: 15px; background: #28a745; font-weight: bold; font-size: 1.1em;">
                진단 실행
            </button>
            <div id="global-all-servers-analysis" style="display: none; margin-top: 20px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #d0bfff;">
                <h4 style="color: #28a745; margin-top: 0;">진단 결과</h4>
                <div class="analysis-content" style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;"></div>
            </div>
        </div>
    `;

    // 서버별 설정파일 타일 + 개별 AI 진단 버튼
    results.forEach((item, index) => {
        const statusColor = item.status === 'success' ? 'green' : 'red';
        const statusText = item.status === 'success' ? '성공' : '실패';

        configHtml += `
            <div class="result-card" style="border: 1px solid #ddd; margin-bottom: 20px; border-radius: 8px; overflow: hidden;" data-server-ip="${item.ip}">
                <div style="background: #f2f2f2; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <strong>${item.ip}</strong>
                    <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                </div>
                <div style="padding: 15px;">
        `;

        if (item.status === 'success') {
            configHtml += `
                <p><strong>메인 설정파일:</strong> ${item.main_config_file} (루트: ${item.server_root})</p>
                <p><strong>발견된 파일 수:</strong> ${item.config_count}</p>

                <details style="margin-top: 15px; border: 1px solid #ccc; border-radius: 4px;">
                    <summary style="padding: 10px; background-color: #eee; cursor: pointer; font-weight: bold;">
                        설정 파일 목록 및 내용 확인 (클릭하여 펼치기)
                    </summary>
                    <div class="config-files-container" style="display: flex; height: 400px; border-top: 1px solid #ccc;">
                        <div class="file-list" style="width: 30%; overflow-y: auto; border-right: 1px solid #ccc;">
                            <ul style="list-style: none; padding: 0; margin: 0;">
            `;

            if (item.configs && item.configs.length > 0) {
                item.configs.forEach((config, idx) => {
                    configHtml += `
                        <li style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;"
                            onclick="showConfigContent(this, 'content-${index}-${idx}')"
                            class="${idx === 0 ? 'active-file' : ''}">
                            ${config.path.split('/').pop()}
                            <div style="font-size: 0.8em; color: #666;">${config.path}</div>
                        </li>
                    `;
                });
            }

            configHtml += `
                            </ul>
                        </div>
                        <div class="file-content" style="width: 70%; overflow-y: auto; padding: 10px; background: #f9f9f9;">
            `;

            if (item.configs && item.configs.length > 0) {
                item.configs.forEach((config, idx) => {
                    const style = idx === 0 ? 'display: block;' : 'display: none;';
                    const safeContent = config.content
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

                    configHtml += `
                        <div id="content-${index}-${idx}" class="config-content-pane" style="${style}" data-path="${config.path}" data-server-ip="${item.ip}">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h4 style="margin: 0;">${config.path}</h4>
                            </div>
                            <div class="config-raw-content" style="display:none;">${encodeURIComponent(config.content)}</div>
                            <pre class="config-text" style="white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 12px; background: #fff; padding: 10px; border: 1px solid #eee;">${safeContent}</pre>
                        </div>
                    `;
                });
            }

            configHtml += `
                        </div>
                    </div>
                </details>
            `;


        } else {
            configHtml += `<p style="color: red;">오류: ${item.message}</p>`;
        }

        configHtml += `
                </div>
            </div>
        `;
    });

    // 서버별 설정파일 타일 → 진단 대상 서버 카드 내부에 렌더링
    if (configTableContainer) configTableContainer.innerHTML = configHtml;
    if (configResultsContainer) configResultsContainer.style.display = 'block';

    // AI 진단 타일 → AI Prompt Settings 카드 아래에 렌더링
    if (aiDiagnosisTableContainer) aiDiagnosisTableContainer.innerHTML = aiHtml;
    if (aiDiagnosisContainer) aiDiagnosisContainer.style.display = 'block';
}
