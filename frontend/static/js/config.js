export function initConfig() {
    const configForm = document.getElementById('yt-dlp-config-form');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const resetConfigBtn = document.getElementById('reset-config-btn');

    // Populate form with data
    function populateConfigForm(data) {
        if (!configForm) return;
        for (const key in data) {
            const input = configForm.elements[key];
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[key];
                } else {
                    input.value = data[key];
                }
            }
        }
    }

    // Gather data from form
    function gatherConfigForm() {
        if (!configForm) return {};
        const data = {};
        const formData = new FormData(configForm);
        // Text inputs
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        // Checkboxes (FormData omits unchecked checkboxes)
        configForm.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            data[cb.name] = cb.checked;
        });
        return data;
    }

    // Load configuration on startup
    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                populateConfigForm(data);
            }
        } catch (err) {
            console.error('Failed to load config:', err);
        }
    }

    // Save configuration
    async function saveConfig() {
        const data = gatherConfigForm();
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                // Show success feedback
                const origText = saveConfigBtn.textContent;
                saveConfigBtn.textContent = 'Saved!';
                saveConfigBtn.style.backgroundColor = 'var(--accent)';
                setTimeout(() => {
                    saveConfigBtn.textContent = origText;
                    saveConfigBtn.style.backgroundColor = '';
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to save config:', err);
        }
    }

    // Reset configuration to defaults
    async function resetConfig() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
        try {
            const res = await fetch('/api/config/default');
            if (res.ok) {
                const data = await res.json();
                populateConfigForm(data);
                // Also save it to the server automatically
                await saveConfig();
            }
        } catch (err) {
            console.error('Failed to load default config:', err);
        }
    }

    if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);
    if (resetConfigBtn) resetConfigBtn.addEventListener('click', resetConfig);

    // Profiles
    const profiles = {
        'max': {
            'format': 'bestvideo+bestaudio/best',
            'extract-audio': false,
            'write-description': true,
            'write-info-json': true,
            'write-comments': true,
            'embed-subs': true,
            'embed-thumbnail': true,
            'embed-chapters': true
        },
        'optimal': {
            'format': 'bestvideo[height<=1080]+bestaudio/best',
            'extract-audio': false,
            'write-description': false,
            'write-info-json': false,
            'write-comments': false,
            'embed-subs': false,
            'embed-thumbnail': false,
            'embed-chapters': false
        },
        'fast': {
            'format': 'bestvideo[height<=720]+bestaudio/best',
            'extract-audio': false,
            'write-description': false,
            'write-info-json': false,
            'write-comments': false,
            'embed-subs': false,
            'embed-thumbnail': false,
            'embed-chapters': false
        },
        'audio': {
            'extract-audio': true,
            'audio-format': 'mp3',
            'audio-quality': '0',
            'format': 'bestaudio/best',
            'embed-thumbnail': true
        }
    };

    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const profileKey = e.target.dataset.profile;
            const changes = profiles[profileKey];
            if (!changes) return;
            
            for (const [k, v] of Object.entries(changes)) {
                const el = configForm.elements[k];
                if (el) {
                    if (el.type === 'checkbox') el.checked = v;
                    else el.value = v;
                }
            }
            
            const origText = e.target.textContent;
            e.target.textContent = 'Застосовано!';
            setTimeout(() => e.target.textContent = origText, 1500);
            
            await saveConfig();
        });
    });

    // Call loadConfig initially
    loadConfig();
}
