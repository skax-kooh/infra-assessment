document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('#content');
    const sidebarCollapse = document.getElementById('sidebarCollapse');

    // Toggle Sidebar
    sidebarCollapse.addEventListener('click', function () {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            sidebar.style.marginLeft = '-250px';
            content.style.width = '100%';
        } else {
            sidebar.style.marginLeft = '0';
            content.style.width = 'calc(100% - 250px)';
        }
    });

    // Submenu Toggle
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

    // Dynamic Content Loading
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const url = this.getAttribute('data-url');

            fetch(url)
                .then(response => response.text())
                .then(html => {
                    const mainContent = document.querySelector('#main-content');
                    mainContent.innerHTML = html;

                    // Re-attach event listeners for newly loaded content
                    attachAssessmentListeners();
                })
                .catch(error => console.error('Error loading content:', error));
        });
    });

    function attachAssessmentListeners() {
        const scanBtn = document.getElementById('start-scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', function () {
                const ipText = document.getElementById('server-ips').value;
                const ips = ipText.split('\n').map(ip => ip.trim()).filter(ip => ip);

                if (ips.length === 0) {
                    alert('IP 주소를 입력해주세요.');
                    return;
                }

                // Show loading state (optional refinement)
                document.getElementById('start-scan-btn').innerText = '진단 중...';

                fetch('/infrastructure/web-server/scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ips: ips }),
                })
                    .then(response => response.json())
                    .then(data => {
                        displayScanResults(data);
                        document.getElementById('start-scan-btn').innerText = '진단 시작';
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('진단 중 오류가 발생했습니다.');
                        document.getElementById('start-scan-btn').innerText = '진단 시작';
                    });
            });
        }
    }

    function displayScanResults(results) {
        const resultContainer = document.getElementById('scan-results');
        const tableContainer = document.getElementById('results-table-container');

        if (!results || results.length === 0) {
            tableContainer.innerHTML = '<p>결과가 없습니다.</p>';
            resultContainer.style.display = 'block';
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>IP Address</th>
                        <th>Server Root</th>
                        <th>Document Root</th>
                        <th>Listen Port</th>
                        <th>Max Clients</th>
                        <th>Keep Alive</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(item => {
            html += `
                <tr>
                    <td>${item.ip}</td>
                    <td>${item.server_root}</td>
                    <td>${item.document_root}</td>
                    <td>${item.listen_port}</td>
                    <td>${item.max_clients}</td>
                    <td>${item.keep_alive}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
        resultContainer.style.display = 'block';
    }
});
