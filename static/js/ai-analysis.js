/**
 * ai-analysis.js
 * AI 진단 요청 및 결과 렌더링 (인라인 diff/권고안 포함)
 */

/**
 * AI 개선안을 설정 파일 뷰에 인라인으로 렌더링합니다.
 */
function renderRecommendations(recommendations) {
    const panes = document.querySelectorAll('.config-content-pane');
    panes.forEach(pane => {
        const panePath = pane.getAttribute('data-path');
        const serverIp = pane.getAttribute('data-server-ip');
        const fullPanePath = `[${serverIp}] ${panePath}`;
        const fullPanePath2 = `[서버: ${serverIp}] ${panePath}`;

        const recsForPane = recommendations.filter(rec =>
            rec.path === panePath ||
            rec.path === fullPanePath ||
            rec.path === fullPanePath2
        );

        if (recsForPane.length === 0) return;

        const originalText = decodeURIComponent(pane.querySelector('.config-raw-content').innerHTML);

        const escapeHtml = (unsafe) => {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        let enhancedHtml = escapeHtml(originalText);

        recsForPane.forEach(rec => {
            if (!rec.original_match) return;
            const searchStr = escapeHtml(rec.original_match);
            const replacementHtml = escapeHtml(rec.new_content || '');
            const reasonHtml = escapeHtml(rec.reason || '');
            const type = (rec.type || '').toLowerCase();

            let hintHtml = '';
            let styledSearchStr = searchStr;

            if (type === 'delete' || type === '삭제') {
                hintHtml = `<div style="background-color: #ffe6e6; color: #cc0000; padding: 10px; margin: 5px 0; border-left: 4px solid #cc0000; font-family: sans-serif; border-radius: 4px;"><strong>[삭제 권고]</strong> ${reasonHtml}</div>`;
                styledSearchStr = `<span style="background-color: #ffe6e6; color: #cc0000; text-decoration: line-through;">${searchStr}</span>\n${hintHtml}`;
                enhancedHtml = enhancedHtml.replace(searchStr, styledSearchStr);
            } else if (type === 'add' || type === '추가') {
                hintHtml = `<div style="background-color: #e6ffe6; color: #006600; padding: 10px; margin: 5px 0; border-left: 4px solid #006600; font-family: sans-serif; border-radius: 4px;"><strong>[추가 권고]</strong> ${reasonHtml}<br/><pre style="background: #f0fff0; border: 1px dotted #006600; margin-top: 8px; padding: 8px; font-family: monospace;">${replacementHtml}</pre></div>`;
                styledSearchStr = `${searchStr}\n${hintHtml}`;
                enhancedHtml = enhancedHtml.replace(searchStr, styledSearchStr);
            } else {
                hintHtml = `<div style="background-color: #e6ffe6; color: #006600; padding: 10px; margin: 5px 0; border-left: 4px solid #006600; font-family: sans-serif; border-radius: 4px;"><strong>[변경 권고]</strong> ${reasonHtml}<br/><pre style="background: #f0fff0; border: 1px dotted #006600; margin-top: 8px; padding: 8px; font-family: monospace;">${replacementHtml}</pre></div>`;
                styledSearchStr = `<span style="background-color: #ffe6e6; color: #cc0000; text-decoration: line-through;">${searchStr}</span>\n${hintHtml}`;
                enhancedHtml = enhancedHtml.replace(searchStr, styledSearchStr);
            }
        });

        const diffHtml = `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 12px; line-height: 1.5; padding: 15px; margin: 0; background: #f8f8f8; color: #333;">${enhancedHtml}</pre>`;
        const originalPre = pane.querySelector('.config-text');

        if (!pane.querySelector('.diff-container')) {
            const diffContainer = document.createElement('div');
            diffContainer.className = 'diff-container';
            diffContainer.style.display = 'none';
            diffContainer.style.background = '#f8f8f8';
            diffContainer.style.border = '1px solid #ddd';
            diffContainer.style.borderRadius = '6px';
            diffContainer.style.overflowX = 'auto';
            diffContainer.style.maxWidth = '100%';
            diffContainer.innerHTML = diffHtml;
            pane.appendChild(diffContainer);

            const btnGroup = document.createElement('div');
            btnGroup.className = 'diff-toggle-btns';
            btnGroup.style.marginBottom = '10px';
            btnGroup.innerHTML = `
                <button type="button" class="btn-secondary toggle-orig-btn" style="background: #6c757d; font-size:12px;">📄 원본 보기</button>
                <button type="button" class="btn-primary toggle-diff-btn" style="background: #6f42c1; font-size:12px; margin-left:5px;">✨ AI 개선안 보기</button>
            `;
            originalPre.parentNode.insertBefore(btnGroup, originalPre);

            btnGroup.querySelector('.toggle-orig-btn').addEventListener('click', () => {
                originalPre.style.display = 'block';
                diffContainer.style.display = 'none';
            });
            btnGroup.querySelector('.toggle-diff-btn').addEventListener('click', () => {
                originalPre.style.display = 'none';
                diffContainer.style.display = 'block';
            });

            // 왼쪽 파일 목록에 ✨ AI 뱃지 추가
            const container = pane.closest('.config-files-container');
            if (container) {
                container.querySelectorAll('li').forEach(li => {
                    if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(pane.id)) {
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
        }
    });
}

/**
 * 공통 AI 분석 요청 함수
 * @param {Array} configs - 분석할 설정 파일 목록 [{path, content}]
 * @param {HTMLElement} resultDiv - 결과를 표시할 컨테이너
 * @param {HTMLElement} outputElement - 분석 내용을 출력할 요소
 */
export function performAiAnalysis(configs, resultDiv, outputElement) {
    const systemPrompt = document.getElementById('ai-system-prompt').value;
    const userPrompt = document.getElementById('ai-user-prompt').value;

    resultDiv.style.display = 'block';
    outputElement.innerHTML = '분석 중...';
    outputElement.style.color = '#333';

    // 기존 렌더링 초기화
    document.querySelectorAll('.diff-container, .diff-toggle-btns').forEach(el => el.remove());
    document.querySelectorAll('.ai-badge').forEach(el => el.remove());

    fetch('/infrastructure/web-server/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                return;
            }

            const analysisData = data.analysis;
            let reportHtml = analysisData.html_report || '';

            const elapsed = data.elapsed_seconds != null ? `${data.elapsed_seconds}s` : '-';

            // ── 점수 계산 ──────────────────────────────────────────
            let scoreBadgeHtml = '';
            const scoreItems = analysisData.score_items;
            if (Array.isArray(scoreItems) && scoreItems.length > 0) {
                const passedCount = scoreItems.filter(item => item.passed === true).length;
                const totalCount = scoreItems.length;
                const scorePercent = Math.round((passedCount / totalCount) * 100);

                // 점수에 따른 색상 결정
                let scoreColor, scoreBg, scoreLabel;
                if (scorePercent >= 80) {
                    scoreColor = '#155724'; scoreBg = '#d4edda'; scoreLabel = '양호';
                } else if (scorePercent >= 50) {
                    scoreColor = '#856404'; scoreBg = '#fff3cd'; scoreLabel = '보통';
                } else {
                    scoreColor = '#721c24'; scoreBg = '#f8d7da'; scoreLabel = '위험';
                }

                scoreBadgeHtml = `
                    <span style="display:inline-flex; align-items:center; gap:6px; font-size:13px;
                        background:${scoreBg}; color:${scoreColor}; font-weight:700;
                        padding:5px 12px; border-radius:20px; border:1px solid ${scoreColor}33;">
                        📊 진단 점수: ${scorePercent}점
                        <span style="font-size:11px; font-weight:400;">(${passedCount}/${totalCount}) ${scoreLabel}</span>
                    </span>
                `;
            }

            // ── 수행 시간 뱃지 ────────────────────────────────────
            const elapsedBadgeHtml = `
                <span style="display:inline-flex; align-items:center; font-size:11px;
                    background:#e9ecef; color:#495057; font-weight:500;
                    padding:5px 10px; border-radius:20px;">
                    ⏱ ${elapsed}
                </span>
            `;

            // 토큰 정보 (있으면 추가)
            let tokenInfoHtml = '';
            if (data.usage) {
                const total = data.usage.total_tokens || 0;
                const prompt = data.usage.input_tokens || 0;
                const completion = data.usage.output_tokens || 0;
                tokenInfoHtml = `
                    <span style="font-size:11px; color:#6c757d;">
                        Tokens: <strong>${total.toLocaleString()}</strong>
                        (In: ${prompt.toLocaleString()}, Out: ${completion.toLocaleString()})
                    </span>
                `;
            }

            const metaBarHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center;
                    flex-wrap:wrap; gap:8px; margin-bottom:14px; padding-bottom:12px;
                    border-bottom:1px solid #dee2e6;">
                    <div>${scoreBadgeHtml}</div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${tokenInfoHtml}
                        ${elapsedBadgeHtml}
                    </div>
                </div>
            `;

            reportHtml = reportHtml.replace(/```html\n?/ig, '').replace(/```\n?/g, '').trim();
            outputElement.innerHTML = metaBarHtml + reportHtml;
            outputElement.style.color = '#333';

            // AI 개선안 인라인 렌더링
            if (analysisData.recommendations && Array.isArray(analysisData.recommendations)) {
                renderRecommendations(analysisData.recommendations);
            }
        })
        .catch((error) => {
            console.error('분석 오류:', error);
            console.trace(error);
            outputElement.innerHTML = `<p style="color: red;">분석 중 오류가 발생했습니다: ${error.message}</p>`;
        });
}

/**
 * 개별 서버 AI 진단
 * @param {HTMLElement} button - 클릭된 버튼 요소
 * @param {number} index - 서버 인덱스
 */
export function analyzeAllConfigs(button, index) {
    const resultDiv = document.getElementById(`global-analysis-${index}`);
    const analysisContentPre = resultDiv.querySelector('.analysis-content');

    const card = button.closest('.result-card');
    const configPanes = card.querySelectorAll('.config-content-pane');

    const configs = [];
    configPanes.forEach(pane => {
        const path = pane.getAttribute('data-path');
        const serverIp = pane.getAttribute('data-server-ip') || 'Unknown IP';
        const content = decodeURIComponent(pane.querySelector('.config-raw-content').textContent);
        configs.push({ path: `[${serverIp}] ${path}`, content });
    });

    if (configs.length === 0) {
        alert('분석할 설정 파일이 없습니다.');
        return;
    }

    performAiAnalysis(configs, resultDiv, analysisContentPre);
}

/**
 * 모든 서버 통합 AI 진단
 */
export function analyzeAllServers() {
    const resultDiv = document.getElementById('global-all-servers-analysis');
    const analysisContentPre = resultDiv.querySelector('.analysis-content');

    const configPanes = document.querySelectorAll('.config-content-pane');
    const configs = [];

    configPanes.forEach(pane => {
        const path = pane.getAttribute('data-path');
        const serverIp = pane.getAttribute('data-server-ip') || 'Unknown Server';
        const content = decodeURIComponent(pane.querySelector('.config-raw-content').textContent);
        configs.push({ path: `[서버: ${serverIp}] ${path}`, content });
    });

    if (configs.length === 0) {
        alert('분석할 서버 설정 파일이 하나도 없습니다.');
        return;
    }

    performAiAnalysis(configs, resultDiv, analysisContentPre);
}
