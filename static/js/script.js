document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('#content');

    // Sidebar toggle logic removed as per request


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
        const addServerBtn = document.getElementById('add-server-btn');
        const serverList = document.getElementById('server-list');
        const template = document.getElementById('server-tile-template');

        // Initial Tile with Defaults
        if (serverList && serverList.children.length === 0 && template) {
            addServerTile('3.39.231.141', 'webwas', 'dlatl!00');
        }

        if (addServerBtn) {
            addServerBtn.addEventListener('click', function () {
                addServerTile();
            });
        }

        function addServerTile(ip = '', user = '', pass = '') {
            if (!template) return;
            const clone = template.content.cloneNode(true);

            // Set values if provided
            if (ip) clone.querySelector('.server-ip').value = ip;
            if (user) clone.querySelector('.server-user').value = user;
            if (pass) clone.querySelector('.server-pass').value = pass;

            // Remove button logic
            const removeBtn = clone.querySelector('.remove-server-btn');
            removeBtn.addEventListener('click', function (e) {
                e.target.closest('.server-tile').remove();
            });

            serverList.appendChild(clone);
        }

        if (scanBtn) {
            scanBtn.addEventListener('click', function () {
                const tiles = document.querySelectorAll('.server-tile');
                const servers = [];
                let validationError = false;

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
                            username: user || 'root', // Default to root if empty
                            password: password
                        });
                    }
                });

                if (servers.length === 0) {
                    alert('최소 하나의 서버 정보를 입력해주세요.');
                    return;
                }

                if (validationError) {
                    alert('IP 주소를 입력해주세요.');
                    return;
                }

                // Show loading state
                scanBtn.innerText = '진단 중...';
                scanBtn.disabled = true;

                fetch('/infrastructure/web-server/scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ servers: servers }),
                })
                    .then(response => response.json())
                    .then(data => {
                        displayScanResults(data);
                        scanBtn.innerText = '진단 시작';
                        scanBtn.disabled = false;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('진단 중 오류가 발생했습니다.');
                        scanBtn.innerText = '진단 시작';
                        scanBtn.disabled = false;
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

        let html = '';

        results.forEach((item, index) => {
            const statusColor = item.status === 'success' ? 'green' : 'red';
            const statusText = item.status === 'success' ? 'Success' : 'Failed';

            html += `
                <div class="result-card" style="border: 1px solid #ddd; margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
                    <div style="background: #f2f2f2; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <strong>${item.ip}</strong>
                        <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                    </div>
                    <div style="padding: 15px;">
            `;

            if (item.status === 'success') {
                html += `
                    <p><strong>Main Config:</strong> ${item.main_config_file} (Root: ${item.server_root})</p>
                    <p><strong>Files Found:</strong> ${item.config_count}</p>
                    
                    <div class="config-files-container" style="display: flex; height: 400px; border: 1px solid #ccc; margin-top: 10px;">
                        <div class="file-list" style="width: 30%; overflow-y: auto; border-right: 1px solid #ccc;">
                            <ul style="list-style: none; padding: 0; margin: 0;">
                `;

                if (item.configs && item.configs.length > 0) {
                    item.configs.forEach((config, idx) => {
                        html += `
                            <li style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;" 
                                onclick="showConfigContent(this, 'content-${index}-${idx}')"
                                class="${idx === 0 ? 'active-file' : ''}">
                                ${config.path.split('/').pop()}
                                <div style="font-size: 0.8em; color: #666;">${config.path}</div>
                            </li>
                        `;
                    });
                }

                html += `   </ul>
                        </div>
                        <div class="file-content" style="width: 70%; overflow-y: auto; padding: 10px; background: #f9f9f9;">
                `;

                if (item.configs && item.configs.length > 0) {
                    item.configs.forEach((config, idx) => {
                        const style = idx === 0 ? 'display: block;' : 'display: none;';
                        // Handle HTML escaping
                        const safeContent = config.content.replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;");

                        html += `
                            <div id="content-${index}-${idx}" class="config-content-pane" style="${style}">
                                <h4>${config.path}</h4>
                                <pre style="white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 12px;">${safeContent}</pre>
                            </div>
                        `;
                    });
                }

                html += `
                        </div>
                    </div>
                `;
            } else {
                html += `<p style="color: red;">Error: ${item.message}</p>`;
            }

            html += `
                    </div>
                </div>
            `;
        });

        tableContainer.innerHTML = html;
        resultContainer.style.display = 'block';

        // Add global helper if not exists
        if (!window.showConfigContent) {
            window.showConfigContent = function (element, contentId) {
                // Find parent container
                const container = element.closest('.config-files-container');

                // Remove active class from lists
                container.querySelectorAll('li').forEach(li => li.style.background = 'transparent');
                element.style.background = '#e0e0e0';

                // Hide all contents
                container.querySelectorAll('.config-content-pane').forEach(div => div.style.display = 'none');

                // Show target content
                const contentDiv = document.getElementById(contentId);
                if (contentDiv) contentDiv.style.display = 'block';
            }
        }
    }
});
