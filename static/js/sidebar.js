/**
 * sidebar.js
 * 사이드바 메뉴 토글 및 동적 페이지 로딩 (SPA 방식)
 */

import { attachAssessmentListeners } from './assessment.js';

/**
 * 사이드바 초기화
 */
export function initSidebar() {
    // 드롭다운 토글
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function (e) {
            e.preventDefault();
            const submenu = this.nextElementSibling;
            if (submenu) {
                submenu.classList.toggle('show');
                submenu.style.display = submenu.classList.contains('show') ? 'block' : 'none';
            }
        });
    });

    // 동적 페이지 로딩 (SPA)
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
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newContentContainer = doc.querySelector('#main-content');
                    const newContent = newContentContainer ? newContentContainer.innerHTML : html;

                    mainContent.innerHTML = newContent;

                    // 페이지별 기능 재연결
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
}
