document.addEventListener('DOMContentLoaded', () => {
    const serverUrlInput = document.getElementById('server-url');
    const downloadBtn = document.getElementById('download-btn');
    const statusDiv = document.getElementById('status');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');

    // Load saved server URL
    chrome.storage.local.get(['yhtvServerUrl'], (result) => {
        if (result.yhtvServerUrl) {
            serverUrlInput.value = result.yhtvServerUrl;
            settingsPanel.style.display = 'none'; // Hide if already configured
        } else {
            settingsPanel.style.display = 'block'; // Show if first time
        }
    });

    // Toggle settings panel
    settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });

    // Save server URL when changed
    serverUrlInput.addEventListener('input', () => {
        chrome.storage.local.set({ yhtvServerUrl: serverUrlInput.value.trim() });
    });

    // Validate server URL format
    function isValidServerUrl(url) {
        return /^https?:\/\/.+/.test(url);
    }

    // Strict YouTube URL validation
    function isValidYouTubeUrl(url) {
        if (!url) return { valid: false };

        // Valid video patterns
        const videoPatterns = [
            /youtube\.com\/watch\?.*v=[0-9A-Za-z_-]{11}/,
            /youtu\.be\/[0-9A-Za-z_-]{11}/,
            /youtube\.com\/shorts\/[0-9A-Za-z_-]{11}/,
            /youtube\.com\/embed\/[0-9A-Za-z_-]{11}/,
        ];

        // Valid channel patterns
        const channelPatterns = [
            /youtube\.com\/@[\w.-]+/,
            /youtube\.com\/channel\/UC[\w-]+/,
            /youtube\.com\/c\/[\w.-]+/,
        ];

        // Reject non-content URLs
        const rejectPatterns = [
            /youtube\.com\/feed\//,
            /youtube\.com\/watch_later/,
            /youtube\.com\/playlist\?/,
            /youtube\.com\/results\?/,
            /youtube\.com\/account/,
            /youtube\.com\/premium/,
        ];

        for (const pattern of rejectPatterns) {
            if (pattern.test(url)) return { valid: false };
        }

        for (const pattern of videoPatterns) {
            if (pattern.test(url)) return { valid: true, type: 'video' };
        }

        for (const pattern of channelPatterns) {
            if (pattern.test(url)) return { valid: true, type: 'channel' };
        }

        return { valid: false };
    }

    downloadBtn.addEventListener('click', () => {
        let serverUrl = serverUrlInput.value.trim();
        if (!serverUrl) {
            settingsPanel.style.display = 'block';
            showStatus('Введіть посилання на сервер!', 'error');
            return;
        }

        // Validate server URL format
        if (!isValidServerUrl(serverUrl)) {
            settingsPanel.style.display = 'block';
            showStatus('URL сервера має починатися з http:// або https://', 'error');
            return;
        }
        
        // Remove trailing slash if present
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }

        // Get current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Null-check for tab
            if (!tabs || tabs.length === 0) {
                showStatus('Не вдалося отримати активну вкладку', 'error');
                return;
            }

            const currentTab = tabs[0];
            if (!currentTab || !currentTab.url) {
                showStatus('Не вдалося отримати URL вкладки', 'error');
                return;
            }

            const videoUrl = currentTab.url;

            // Strict YouTube URL validation
            const urlCheck = isValidYouTubeUrl(videoUrl);
            if (!urlCheck.valid) {
                showStatus('Це не YouTube відео або канал', 'error');
                return;
            }

            // Determine API endpoint based on URL type
            const isChannel = urlCheck.type === 'channel';
            const apiEndpoint = isChannel ? '/api/channels/add' : '/api/download';
            const actionText = isChannel ? 'Канал додано!' : 'Додано в чергу!';

            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Відправка...';
            showStatus('', '');

            // AbortController with 15-second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            // Send to YHTV API
            fetch(`${serverUrl}${apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: videoUrl }),
                signal: controller.signal
            })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                showStatus(`Успішно! ${actionText}`, 'success');
                downloadBtn.textContent = 'Готово ✔';
                setTimeout(() => window.close(), 1500);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                const message = error.name === 'AbortError'
                    ? 'Таймаут з\'єднання (15с). Перевірте адресу сервера.'
                    : 'Помилка з\'єднання із сервером';
                showStatus(message, 'error');
                console.error(error);
                downloadBtn.disabled = false;
                downloadBtn.textContent = 'Send to YHTV';
                settingsPanel.style.display = 'block'; // Show panel if error so they can fix URL
            });
        });
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
    }
});
