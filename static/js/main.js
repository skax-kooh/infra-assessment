/**
 * main.js
 * 애플리케이션 진입점 (ES Module)
 *
 * 각 모듈을 초기화하고, onclick 속성에서 호출되는 함수를 전역(window)에 등록합니다.
 */

import { initSidebar } from './sidebar.js';
import { initSettings } from './settings.js';
import { showConfigContent } from './results.js';
import { analyzeAllServers } from './ai-analysis.js';

document.addEventListener('DOMContentLoaded', function () {
    // 사이드바 및 동적 페이지 로딩 초기화
    initSidebar();

    // LLM 설정 페이지 이벤트 핸들러 초기화
    initSettings();

    // 동적으로 생성되는 HTML의 onclick 속성에서 호출되므로 전역에 등록
    window.showConfigContent = showConfigContent;

    window.analyzeAllServers = analyzeAllServers;

    // 사이드바 토글 버튼 동작 설정
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.toggle('collapsed');
            document.getElementById('content').classList.toggle('active');
        });
    }
});
