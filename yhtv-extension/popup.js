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

    downloadBtn.addEventListener('click', () => {
        let serverUrl = serverUrlInput.value.trim();
        if (!serverUrl) {
            settingsPanel.style.display = 'block';
            showStatus('Введіть посилання на сервер!', 'error');
            return;
        }
        
        // Remove trailing slash if present
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }

        // Get current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            const currentTab = tabs[0];
            const videoUrl = currentTab.url;

            if (!videoUrl.includes('youtube.com/') && !videoUrl.includes('youtu.be/')) {
                showStatus('Це не YouTube відео', 'error');
                return;
            }

            // Determine if it's a channel or a video
            const isChannel = videoUrl.includes('/@') || videoUrl.includes('/channel/') || videoUrl.includes('/c/');
            const apiEndpoint = isChannel ? '/api/channels/add' : '/api/download';
            const actionText = isChannel ? 'Канал додано!' : 'Додано в чергу!';

            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Відправка...';
            showStatus('', '');

            // Send to YHTV API
            fetch(`${serverUrl}${apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: videoUrl })
            })
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                showStatus(`Успішно! ${actionText}`, 'success');
                downloadBtn.textContent = 'Готово ✔';
                setTimeout(() => window.close(), 1500);
            })
            .catch(error => {
                showStatus('Помилка з\'єднання із сервером', 'error');
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
