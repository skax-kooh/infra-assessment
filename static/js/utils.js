/**
 * utils.js
 * 공통 헬퍼 함수 모음
 */

/**
 * 로그 창에 시간값과 함께 메시지를 한 줄씩 추가합니다.
 */
export function addLog(container, message, color = 'black') {
    const p = document.createElement('p');
    p.style.margin = '2px 0';
    p.style.fontSize = '12px';
    p.style.fontFamily = 'monospace';
    p.style.color = color;

    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    p.textContent = `[${time}] ${message}`;

    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
}
