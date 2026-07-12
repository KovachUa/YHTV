// Global state for optimistic UI (persisted in localStorage)
let savedState = { paused: [], deleted: [] };
try {
    const raw = localStorage.getItem('yhtvQueueState');
    if (raw) savedState = JSON.parse(raw);
} catch (e) {}

window.localQueueState = {
    paused: new Set(savedState.paused),
    deleted: new Set(savedState.deleted)
};

function saveQueueState() {
    localStorage.setItem('yhtvQueueState', JSON.stringify({
        paused: Array.from(window.localQueueState.paused),
        deleted: Array.from(window.localQueueState.deleted)
    }));
}

// Helper to determine if a video is a Short
window.isShort = function(v) {
    if (!v.duration) return false;
    let parts = String(v.duration).split(':');
    if (parts.length === 1) {
        // Just seconds
        return parseInt(parts[0]) < 120;
    } else if (parts.length === 2) {
        // Minutes:Seconds
        return parseInt(parts[0]) < 2;
    }
    return false; // Hours:Minutes:Seconds is definitely not a short
};

document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const addBtn = document.getElementById('add-video-btn');
    const modal = document.getElementById('add-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const cancelBtn2 = document.getElementById('cancel-btn-2');
    const urlInput = document.querySelector('.url-input');

    // Відкрити модальне вікно
    addBtn.addEventListener('click', () => {
        modal.classList.add('active');
        // Фокус на інпуті через невелику затримку для анімації
        setTimeout(() => urlInput.focus(), 100);
    });

    const closeModal = () => {
        modal.classList.remove('active');
        urlInput.value = '';
    };

    // Закрити модальне вікно кнопкою
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (cancelBtn2) cancelBtn2.addEventListener('click', closeModal);

    // Закрити при кліку на фон (оверлей)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Закрити при натисканні Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Відправка URL на сервер
    const addChannelOnlyBtn = document.getElementById('add-channel-only-btn');
    if (addChannelOnlyBtn) {
        addChannelOnlyBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert('Please enter a URL');
                return;
            }
            
            const origText = addChannelOnlyBtn.textContent;
            addChannelOnlyBtn.textContent = 'Adding...';
            addChannelOnlyBtn.disabled = true;

            try {
                const res = await fetch('/api/channels/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                if (res.ok) {
                    closeModal();
                    const navChannels = document.getElementById('nav-channels');
                    if (navChannels) navChannels.click();
                } else {
                    const errText = await res.text();
                    alert('Error adding channel: ' + errText);
                }
            } catch (err) {
                console.error(err);
                alert('Network error');
            } finally {
                addChannelOnlyBtn.textContent = origText;
                addChannelOnlyBtn.disabled = false;
            }
        });
    }

    const addSubmitBtn = document.getElementById('add-submit-btn');
    if (addSubmitBtn) {
        addSubmitBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert('Please enter a URL');
                return;
            }
            
            const origText = addSubmitBtn.textContent;
            addSubmitBtn.textContent = 'Adding...';
            addSubmitBtn.disabled = true;

            try {
                const res = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log('Task queued:', data);
                    closeModal();
                    
                    if (data.status === 'Already downloaded') {
                        const currentLang = localStorage.getItem('yhtvLang') || 'en';
                        alert(currentLang === 'uk' ? 'Це відео вже є у вашій медіатеці!' : 'This video is already in your library!');
                        // Redirect to library (media view)
                        const navMedia = document.getElementById('nav-media');
                        if (navMedia) navMedia.click();
                    } else {
                        // Redirect to queue view
                        const navQueue = document.getElementById('nav-queue');
                        if (navQueue) navQueue.click();
                    }
                } else {
                    const errText = await res.text();
                    alert('Error adding task: ' + errText);
                }
            } catch (err) {
                console.error(err);
                alert('Network error');
            } finally {
                addSubmitBtn.textContent = origText;
                addSubmitBtn.disabled = false;
            }
        });
    }

    // Логіка для перемикання вигляду (Grid / List)
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const channelsContainer = document.getElementById('channels-container');

    if (gridViewBtn && listViewBtn && channelsContainer) {
        gridViewBtn.addEventListener('click', () => {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            channelsContainer.classList.remove('list-view');
        });

        listViewBtn.addEventListener('click', () => {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            channelsContainer.classList.add('list-view');
        });
    }

    // Логіка для фільтру "Show subscribed only"
    const subscribedToggle = document.getElementById('subscribed-toggle');
    const cards = document.querySelectorAll('.card');

    if (subscribedToggle) {
        subscribedToggle.addEventListener('change', (e) => {
            const showOnlySubscribed = e.target.checked;
            cards.forEach(card => {
                const isSubscribed = card.getAttribute('data-subscribed') === 'true';
                if (showOnlySubscribed && !isSubscribed) {
                    card.classList.add('hidden');
                } else {
                    card.classList.remove('hidden');
                }
            });
        });
    }

    // Логіка навігації між списком каналів та конкретним каналом
    const channelsView = document.getElementById('channels-view');
    const singleChannelView = document.getElementById('single-channel-view');
    const backToChannelsBtn = document.getElementById('back-to-channels');

    if (channelsView && singleChannelView) {
        document.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            if (card && channelsView && !channelsView.classList.contains('hidden')) {
                if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) {
                    return;
                }
                const channelId = card.dataset.channelId;
                window.currentChannelId = channelId;
                localStorage.setItem('yhtvCurrentChannelId', channelId);

                const avatarSrc = card.querySelector('.card-avatar img').src;
                const channelName = card.querySelector('.card-title').textContent;
                const bannerSrc = card.dataset.banner;
                const desc = card.dataset.description;
                
                const bannerDiv = singleChannelView.querySelector('.channel-banner-large');
                if (bannerSrc) {
                    bannerDiv.style.backgroundImage = `url('${bannerSrc}')`;
                } else {
                    bannerDiv.style.backgroundImage = 'none';
                    bannerDiv.style.backgroundColor = '#333';
                }

                singleChannelView.querySelector('.channel-avatar-large').src = avatarSrc;
                singleChannelView.querySelector('.channel-details-large h2').textContent = channelName;
                
                let descContainer = singleChannelView.querySelector('.channel-desc-container');
                if (!descContainer) {
                    descContainer = document.createElement('div');
                    descContainer.className = 'channel-desc-container';
                    descContainer.style.marginTop = '10px';
                    descContainer.style.maxWidth = '800px';

                    const descEl = document.createElement('p');
                    descEl.className = 'channel-desc';
                    descEl.style.color = 'var(--text-secondary)';
                    descEl.style.fontSize = '0.9rem';
                    descEl.style.whiteSpace = 'pre-wrap';
                    descEl.style.display = '-webkit-box';
                    descEl.style.webkitLineClamp = '3';
                    descEl.style.webkitBoxOrient = 'vertical';
                    descEl.style.overflow = 'hidden';

                    const toggleBtn = document.createElement('button');
                    toggleBtn.style.marginTop = '5px';
                    toggleBtn.style.padding = '2px 8px';
                    toggleBtn.style.fontSize = '0.8rem';
                    toggleBtn.style.backgroundColor = 'transparent';
                    toggleBtn.style.border = '1px solid var(--border-color)';
                    toggleBtn.style.color = 'var(--text-primary)';
                    toggleBtn.style.cursor = 'pointer';
                    toggleBtn.style.borderRadius = '4px';
                    toggleBtn.textContent = 'Більше';

                    toggleBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (descEl.style.webkitLineClamp === '3') {
                            descEl.style.webkitLineClamp = 'unset';
                            toggleBtn.textContent = 'Менше';
                        } else {
                            descEl.style.webkitLineClamp = '3';
                            toggleBtn.textContent = 'Більше';
                        }
                    };

                    descContainer.appendChild(descEl);
                    descContainer.appendChild(toggleBtn);
                    singleChannelView.querySelector('.channel-details-large').appendChild(descContainer);
                }

                const descP = descContainer.querySelector('.channel-desc');
                const tBtn = descContainer.querySelector('button');
                descP.textContent = desc || 'Немає опису.';
                descP.style.webkitLineClamp = '3';
                tBtn.textContent = 'Більше';

                setTimeout(() => {
                    if (descP.scrollHeight > descP.clientHeight) {
                        tBtn.style.display = 'inline-block';
                    } else {
                        tBtn.style.display = 'none';
                    }
                }, 10);

                channelsView.classList.add('hidden');
                singleChannelView.classList.remove('hidden');
                window.scrollTo(0, 0);

                const res = await fetch('/api/videos');
                if (res.ok) {
                    const allVideos = await res.json();
                    const channelVideos = allVideos.filter(v => v.channel_id === channelId);

                    const renderLocalCard = (v) => `
                        <div class="video-card ${v.watched ? 'watched' : ''}" data-video-id="${v.id}" data-file-path="${v.file_path || ''}" data-progress="${v.progress || 0}" data-watched="${v.watched || false}">
                            <div class="video-thumbnail" style="background-image: url('${v.thumbnail || ''}');">
                                <span class="video-duration">${v.duration || 'N/A'}</span>
                                <div class="watched-badge" style="position:absolute; top:5px; left:5px; background:var(--bg-surface); color:var(--text-primary); padding:2px 6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Downloaded</div>
                                ${v.watched ? '<div class="watched-badge" style="position:absolute; top:5px; right:5px; background:var(--btn-danger); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Переглянуто</div>' : ''}
                                ${!v.watched && v.progress > 0 ? `<div class="progress-bar-container" style="position:absolute; bottom:0; left:0; width:100%; height:4px; background:rgba(255,255,255,0.3);"><div style="height:100%; background:var(--btn-danger); width:${(v.progress / (v.duration ? parseInt(v.duration.split(':').reduce((acc,time) => (60 * acc) + +time)) : 1)) * 100}%;"></div></div>` : ''}
                            </div>
                            <div class="video-info">
                                <h4 class="video-title">${v.title || 'Unknown Title'}</h4>
                                <p class="video-meta">${v.resolution || ''} • ${v.filesize || ''}</p>
                            </div>
                            <button class="icon-btn delete-btn" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>`;

                    const localVideosHtml = channelVideos.filter(v => !isShort(v)).map(renderLocalCard).join('');
                    const localShortsHtml = channelVideos.filter(v => isShort(v)).map(renderLocalCard).join('');

                    
                    const loadingIndicator = document.getElementById('channel-loading-indicator');
                    
                    const remoteContainers = {
                        videos: document.getElementById('remote-videos-container'),
                        shorts: document.getElementById('remote-shorts-container'),
                        streams: document.getElementById('remote-streams-container')
                    };
                    
                    if (loadingIndicator) {
                        for (const key in remoteContainers) {
                            if (remoteContainers[key]) {
                                if (key === 'videos') remoteContainers[key].innerHTML = localVideosHtml;
                                else if (key === 'shorts') remoteContainers[key].innerHTML = localShortsHtml;
                                else remoteContainers[key].innerHTML = '';
                            }
                        }
                        loadingIndicator.classList.remove('hidden');
                        
                        try {
                            const browseRes = await fetch('/api/channels/' + channelId + '/browse');
                            loadingIndicator.classList.add('hidden');
                            if (browseRes.ok) {
                                const data = await browseRes.json();
                                if (data.status === 'success') {
                                    const downloadedIds = new Set(allVideos.map(v => v.id));
                                    
                                    for (const type of ['videos', 'shorts', 'streams']) {
                                        const container = remoteContainers[type];
                                        if (!container || !data[type]) continue;
                                        
                                        const available = data[type].filter(v => !downloadedIds.has(v.id));
                                        
                                        let html = type === 'videos' ? localVideosHtml : (type === 'shorts' ? localShortsHtml : '');
                                        
                                        if (available.length > 0) {
                                            html += available.map(v => {
                                                const h = v.duration ? Math.floor(v.duration / 3600) : 0;
                                                const m = v.duration ? Math.floor((v.duration % 3600) / 60) : 0;
                                                const s = v.duration ? Math.floor(v.duration % 60) : 0;
                                                const durMinutes = v.duration ? (h > 0 ? h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0') : m + ':' + s.toString().padStart(2, '0')) : 'N/A';
                                                return `
                                                <div class="video-card">
                                                    <div class="video-thumbnail" style="background-image: url('${v.thumbnail || ''}');">
                                                        <span class="video-duration">${durMinutes}</span>
                                                    </div>
                                                    <div class="video-info" style="padding-bottom: 0;">
                                                        <h4 class="video-title">${v.title || 'Unknown Title'}</h4>
                                                        <p class="video-meta">${v.view_count ? v.view_count.toLocaleString() + ' views' : ''}</p>
                                                    </div>
                                                    <div style="padding: 10px; display: flex; gap: 5px;">
                                                        <button class="btn btn-primary download-available-btn" data-url="${v.url}" style="flex: 1; border-radius: 4px; padding: 6px;">Завантажити</button>
                                                    </div>
                                                </div>`;
                                            }).join('');
                                        }
                                        
                                        if (!html) {
                                            container.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">No items found.</p>';
                                        } else {
                                            container.innerHTML = html;
                                        }
                                    }
                                }
                            } else {
                                if (remoteContainers.videos) remoteContainers.videos.innerHTML = '<p style="padding: 20px; color: var(--danger-color);">Failed to load data.</p>';
                            }
                        } catch(err) {
                            loadingIndicator.classList.add('hidden');
                            if (remoteContainers.videos) remoteContainers.videos.innerHTML = '<p style="padding: 20px; color: var(--danger-color);">Error connecting to server.</p>';
                        }
                    }
                }
            }
        });

        if (backToChannelsBtn) {
            backToChannelsBtn.addEventListener('click', () => {
                singleChannelView.classList.add('hidden');
                channelsView.classList.remove('hidden');
                localStorage.removeItem('yhtvCurrentChannelId');
            });
        }
        
        const channelSettingsBtn = document.getElementById('channel-settings-btn');
        const channelSettingsModal = document.getElementById('channel-settings-modal');
        const closeChannelSettingsBtn = document.getElementById('close-channel-settings-btn');
        const saveChannelSettingsBtn = document.getElementById('save-channel-settings-btn');
        const channelSettingsForm = document.getElementById('channel-settings-form');

        if (channelSettingsBtn && channelSettingsModal) {
            channelSettingsBtn.addEventListener('click', async () => {
                channelSettingsModal.classList.add('active');
                channelSettingsForm.reset();
                if (window.currentChannelId) {
                    try {
                        const res = await fetch('/api/channels/' + window.currentChannelId + '/settings');
                        if (res.ok) {
                            const settings = await res.json();
                            for (const key in settings) {
                                const input = channelSettingsForm.elements[key];
                                if (input) {
                                    if (input.type === 'checkbox') {
                                        input.checked = settings[key];
                                    } else {
                                        input.value = settings[key];
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            });

            const closeSettings = () => channelSettingsModal.classList.remove('active');
            if (closeChannelSettingsBtn) closeChannelSettingsBtn.addEventListener('click', closeSettings);
            channelSettingsModal.addEventListener('click', (e) => {
                if (e.target === channelSettingsModal) closeSettings();
            });

            if (saveChannelSettingsBtn) {
                saveChannelSettingsBtn.addEventListener('click', async () => {
                    if (!window.currentChannelId) return;
                    saveChannelSettingsBtn.textContent = 'Saving...';
                    
                    const formData = new FormData(channelSettingsForm);
                    const data = {};
                    for (let [key, value] of formData.entries()) {
                        if (value !== '') {
                            if (value === 'true') data[key] = true;
                            else if (value === 'false') data[key] = false;
                            else data[key] = value;
                        }
                    }
                    
                    try {
                        const res = await fetch('/api/channels/' + window.currentChannelId + '/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        if (res.ok) {
                            closeSettings();
                        } else {
                            alert('Failed to save channel settings');
                        }
                    } catch (e) {
                        alert('Network error');
                    }
                    saveChannelSettingsBtn.textContent = 'Save';
                });
            }
        }
    }

    // Логіка для кнопок підписки / відписки
    document.addEventListener('click', async (e) => {
        // Download all buttons
        if (e.target.id === 'download-all-videos-btn' || e.target.id === 'download-all-shorts-btn' || e.target.id === 'download-all-streams-btn') {
            const btn = e.target;
            const containerId = btn.id.replace('download-all-', 'remote-').replace('-btn', '-container');
            const availableBtns = document.querySelectorAll(`#${containerId} .download-available-btn:not([disabled])`);
            
            if (availableBtns.length > 0) {
                const currentLang = localStorage.getItem('yhtvLang') || 'en';
                const origText = btn.textContent;
                btn.textContent = currentLang === 'uk' ? 'Додаються...' : 'Queuing...';
                btn.disabled = true;
                
                (async () => {
                    for (const vBtn of availableBtns) {
                        vBtn.click();
                        await new Promise(r => setTimeout(r, 100)); // Stagger requests slightly
                    }
                    btn.textContent = currentLang === 'uk' ? 'Додано' : 'Done';
                    setTimeout(() => {
                        btn.textContent = origText;
                        btn.disabled = false;
                    }, 3000);
                })();
            }
        }

        // Download available video
        if (e.target.closest('.download-available-btn')) {
            const btn = e.target.closest('.download-available-btn');
            const url = btn.dataset.url;
            if (url) {
                const currentLang = localStorage.getItem('yhtvLang') || 'en';
                const origText = btn.textContent;
                btn.textContent = currentLang === 'uk' ? 'Додається...' : 'Queuing...';
                btn.disabled = true;
                try {
                    const res = await fetch('/api/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type: 'video', channel_id: window.currentChannelId })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'Already downloaded') {
                            btn.textContent = currentLang === 'uk' ? 'Вже завантажено' : 'Downloaded';
                        } else {
                            btn.textContent = currentLang === 'uk' ? 'В черзі' : 'Queued';
                            const navQueue = document.getElementById('nav-queue');
                            if (navQueue) navQueue.style.transform = 'scale(1.1)';
                            setTimeout(() => { if (navQueue) navQueue.style.transform = 'none'; }, 200);
                        }
                        btn.style.background = 'var(--bg-surface)';
                        btn.style.color = 'var(--text-secondary)';
                        btn.style.border = '1px solid var(--border-color)';
                    } else {
                        btn.textContent = 'Error';
                        btn.disabled = false;
                    }
                } catch(err) {
                    btn.textContent = origText;
                    btn.disabled = false;
                }
            }
            return;
        }

        if (e.target.classList.contains('btn-subscribe') || e.target.classList.contains('btn-unsubscribe')) {
            const btn = e.target;
            const isSubscribed = btn.classList.contains('btn-unsubscribe');
            
            const parentCard = btn.closest('.card');
            if (parentCard) {
                const channelId = parentCard.dataset.channelId;
                if (!channelId) return;
                
                btn.disabled = true;
                const origText = btn.textContent;
                btn.textContent = 'Updating...';

                try {
                    const res = await fetch('/api/channels/' + channelId + '/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subscribed: !isSubscribed })
                    });
                    
                    if (res.ok) {
                        if (isSubscribed) {
                            btn.classList.remove('btn-unsubscribe');
                            btn.classList.add('btn-subscribe');
                            btn.textContent = 'Subscribe';
                        } else {
                            btn.classList.remove('btn-subscribe');
                            btn.classList.add('btn-unsubscribe');
                            btn.textContent = 'Unsubscribe';
                        }
                        
                        parentCard.setAttribute('data-subscribed', (!isSubscribed).toString());
                        
                        const subscribedToggle = document.getElementById('subscribed-toggle');
                        if (subscribedToggle && subscribedToggle.checked && isSubscribed) {
                            parentCard.classList.add('hidden');
                        }
                    } else {
                        btn.textContent = 'Error';
                        setTimeout(() => btn.textContent = origText, 2000);
                    }
                } catch (err) {
                    btn.textContent = 'Network Error';
                    setTimeout(() => btn.textContent = origText, 2000);
                } finally {
                    btn.disabled = false;
                }
            }
        }
    });

    const exportDataBtn = document.getElementById('export-db-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            window.location.href = '/api/export';
        });
    }

    const importDataFile = document.getElementById('import-data-file');
    if (importDataFile) {
        importDataFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (confirm('Увага! Відновлення бази даних об\'єднає поточні дані з даними з бекапу. Ви впевнені?')) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const res = await fetch('/api/import', {
                            method: 'POST',
                            body: event.target.result,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (res.ok) {
                            alert('Базу даних успішно відновлено! Сторінка буде перезавантажена.');
                            window.location.reload();
                        } else {
                            alert('Помилка при відновленні бази даних.');
                        }
                    } catch (err) {
                        alert('Помилка мережі при відновленні.');
                    }
                };
                reader.readAsText(file);
            }
            e.target.value = ''; // Reset
        });
    }

    // Логіка видалення
    const deleteIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    const allCardsAndVideos = document.querySelectorAll('.card, .video-card');
    
    allCardsAndVideos.forEach(item => {
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn delete-btn';
        delBtn.title = 'Delete';
        delBtn.innerHTML = deleteIconSVG;
        item.appendChild(delBtn);
    });

    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const cancelDeleteIcon = document.getElementById('cancel-delete-icon');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let itemToDelete = null;

    const closeDeleteModal = () => {
        if (deleteModal) deleteModal.classList.remove('active');
        itemToDelete = null;
    };

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (cancelDeleteIcon) cancelDeleteIcon.addEventListener('click', closeDeleteModal);
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (itemToDelete) {
                const el = itemToDelete; // Зберігаємо посилання до того, як itemToDelete стане null
                
                if (el.classList) {
                    if (el.classList.contains('video-card') && el.dataset.videoId) {
                        fetch('/api/videos/' + el.dataset.videoId, { method: 'DELETE' });
                    } else if (el.classList.contains('card') && el.dataset.channelId) {
                        fetch('/api/channels/' + el.dataset.channelId, { method: 'DELETE' });
                    } else if (el.classList.contains('queue-item') && el.dataset.taskId) {
                        fetch('/api/queue/' + el.dataset.taskId, { method: 'DELETE' });
                    }
                }

                if (el.id === 'single-channel-view') {
                    // Якщо видаляємо весь відкритий канал
                    document.getElementById('nav-channels').click();
                } else if (el.id === 'all-queue-items') {
                    fetch('/api/queue', { method: 'DELETE' }).then(() => {
                        const allItems = document.querySelectorAll('.queue-item');
                        allItems.forEach(item => {
                            if(item.dataset.taskId) window.localQueueState.deleted.add(item.dataset.taskId);
                            item.style.transition = 'all 0.3s ease';
                            item.style.opacity = '0';
                            item.style.transform = 'scale(0.8)';
                            setTimeout(() => {
                                item.style.height = '0';
                                item.style.margin = '0';
                                item.style.padding = '0';
                                item.style.border = '0';
                                item.style.overflow = 'hidden';
                                setTimeout(() => item.remove(), 300);
                            }, 150);
                        });
                        saveQueueState();
                    });
                } else {
                    if (el.classList.contains('queue-item') && el.dataset.taskId) {
                        window.localQueueState.deleted.add(el.dataset.taskId);
                        saveQueueState();
                    }
                    // Анімація зникнення
                    el.style.transition = 'all 0.3s ease';
                    el.style.opacity = '0';
                    el.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        // Робимо display: none, щоб сітка Grid миттєво перебудувалася
                        el.style.display = 'none'; 
                        el.remove();
                    }, 300);
                }
                closeDeleteModal();
            }
        });
    }

    let vjsPlayer = null;

    document.addEventListener('click', (e) => {
        // Close Video Player Modal
        const closePlayerBtn = e.target.closest('#close-player-btn');
        const isPlayerOverlayClick = e.target.id === 'player-modal';
        if (closePlayerBtn || isPlayerOverlayClick) {
            const playerModal = document.getElementById('player-modal');
            if(playerModal) playerModal.classList.remove('active');
            
            if (vjsPlayer) {
                // Final progress sync is handled by timeupdate, but we can send one last
                if (window.currentVideoId && vjsPlayer.currentTime() > 0) {
                    fetch('/api/videos/' + window.currentVideoId + '/progress', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({progress: vjsPlayer.currentTime(), duration: vjsPlayer.duration() || 0})
                    }).catch(e => console.error(e));
                }
                vjsPlayer.dispose();
                vjsPlayer = null;
            }
            window.currentVideoPath = null;
            return;
        }

        // Open Video Player Modal
        const videoCard = e.target.closest('.video-card') || e.target.closest('.queue-item.completed');
        if (videoCard && !e.target.closest('.delete-btn') && !e.target.closest('button')) {
            const titleEl = videoCard.querySelector('.video-title') || videoCard.querySelector('.queue-title');
            const playerModal = document.getElementById('player-modal');
            const playerTitle = document.getElementById('player-title');
            
            if (playerModal && titleEl) {
                const filePath = videoCard.getAttribute('data-file-path');
                if (!filePath) return;

                playerTitle.textContent = titleEl.textContent;
                
                let type = 'video/mp4';
                if (filePath.toLowerCase().endsWith('.webm')) type = 'video/webm';
                else if (filePath.toLowerCase().endsWith('.mkv')) type = 'video/mp4'; // vjs fallback
                
                window.currentVideoPath = filePath;
                window.currentVideoId = videoCard.dataset.videoId;
                
                // Read progress from dataset
                const savedPos = videoCard.dataset.progress;
                const timeToSet = savedPos ? parseFloat(savedPos) : 0;
                
                // Recreate video tag container
                const videoContainer = playerModal.querySelector('.video-container');
                videoContainer.innerHTML = '';
                const videoTag = document.createElement('video');
                videoTag.id = 'main-video-player';
                videoTag.className = 'video-js vjs-default-skin vjs-big-play-centered';
                videoTag.controls = true;
                videoTag.preload = 'auto';
                videoTag.style.width = '100%';
                videoTag.style.minHeight = '400px';
                videoTag.style.maxHeight = '80vh';
                videoTag.style.outline = 'none';
                videoTag.style.borderRadius = '12px 12px 0 0';
                videoTag.style.background = '#000';
                videoTag.style.cursor = 'pointer';
                videoContainer.appendChild(videoTag);

                setTimeout(() => {
                    vjsPlayer = videojs(videoTag, {
                        controls: true,
                        fluid: false,
                        playbackRates: [0.5, 1, 1.25, 1.5, 2]
                    });
                    


                    // YouTube style time toggle
                    let showingRemaining = false;
                    const timeContainer = document.createElement('div');
                    timeContainer.className = 'vjs-time-control vjs-control custom-time-display';
                    timeContainer.style.cursor = 'pointer';
                    timeContainer.style.display = 'flex';
                    timeContainer.style.alignItems = 'center';
                    timeContainer.style.userSelect = 'none';
                    timeContainer.style.padding = '0 10px';
                    
                    const formatTime = (seconds) => {
                        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
                        seconds = Math.max(0, Math.floor(seconds));
                        const h = Math.floor(seconds / 3600);
                        const m = Math.floor((seconds % 3600) / 60);
                        const s = seconds % 60;
                        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
                        return `${m}:${s < 10 ? '0' : ''}${s}`;
                    };
                    
                    let lastProgressSync = 0;
                    const updateTimeDisplay = () => {
                        const current = vjsPlayer.currentTime() || 0;
                        const duration = vjsPlayer.duration() || 0;
                        
                        if (showingRemaining && duration > 0) {
                            timeContainer.innerHTML = `<span class="vjs-control-text">Remaining Time </span>-${formatTime(duration - current)}`;
                        } else {
                            timeContainer.innerHTML = `<span class="vjs-control-text">Current Time </span>${formatTime(current)}<span style="margin: 0 4px; color: var(--text-secondary)">/</span>${formatTime(duration)}`;
                        }
                        
                        // Sync progress to backend every 5 seconds
                        if (window.currentVideoId && duration > 0 && Math.abs(current - lastProgressSync) > 5) {
                            lastProgressSync = current;
                            fetch('/api/videos/' + window.currentVideoId + '/progress', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({progress: current, duration: duration})
                            }).then(r => r.json()).then(data => {
                                const cards = document.querySelectorAll(`.video-card[data-video-id="${window.currentVideoId}"]`);
                                cards.forEach(card => {
                                    card.dataset.progress = current;
                                    let pb = card.querySelector('.progress-bar-container > div');
                                    if (pb) {
                                        pb.style.width = (current / duration) * 100 + '%';
                                    } else if (current > 0) {
                                        const thumb = card.querySelector('.video-thumbnail');
                                        if (thumb && !card.classList.contains('watched')) {
                                            thumb.insertAdjacentHTML('beforeend', `<div class="progress-bar-container" style="position:absolute; bottom:0; left:0; width:100%; height:4px; background:rgba(255,255,255,0.3);"><div style="height:100%; background:var(--btn-danger); width:${(current / duration) * 100}%;"></div></div>`);
                                        }
                                    }
                                    if (data.watched && !card.classList.contains('watched')) {
                                        card.classList.add('watched');
                                        card.dataset.watched = "true";
                                        const thumb = card.querySelector('.video-thumbnail');
                                        if (thumb && !thumb.querySelector('.watched-badge')) {
                                            thumb.insertAdjacentHTML('beforeend', '<div class="watched-badge" style="position:absolute; top:5px; left:5px; background:var(--primary-color); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Переглянуто</div>');
                                        }
                                        const pbc = card.querySelector('.progress-bar-container');
                                        if (pbc) pbc.remove();
                                    }
                                });
                            }).catch(e => console.error('Sync progress error:', e));
                        }
                    };

                    timeContainer.addEventListener('click', () => {
                        showingRemaining = !showingRemaining;
                        updateTimeDisplay();
                    });

                    vjsPlayer.on('timeupdate', updateTimeDisplay);
                    vjsPlayer.on('durationchange', updateTimeDisplay);
                    vjsPlayer.on('loadedmetadata', updateTimeDisplay);
                    
                    if (vjsPlayer.controlBar) {
                        const hide = (name) => {
                            const c = vjsPlayer.controlBar.getChild(name);
                            if (c) c.hide();
                        };
                        hide('currentTimeDisplay');
                        hide('timeDivider');
                        hide('durationDisplay');
                        hide('remainingTimeDisplay');
                        
                        const refChild = vjsPlayer.controlBar.getChild('currentTimeDisplay');
                        if (refChild) {
                            vjsPlayer.controlBar.el().insertBefore(timeContainer, refChild.el());
                        } else {
                            vjsPlayer.controlBar.el().appendChild(timeContainer);
                        }
                    }

                    // Add a download button safely if it doesn't exist
                    if (vjsPlayer.controlBar && !vjsPlayer.controlBar.getChild('DownloadBtn')) {
                        const downloadBtn = vjsPlayer.controlBar.addChild('button', {}, vjsPlayer.controlBar.children_.length - 1);
                        downloadBtn.name_ = 'DownloadBtn';
                        downloadBtn.el().innerHTML = '<span class="vjs-icon-placeholder" style="font-size: 1.5em; line-height: 2;">⬇</span>';
                        downloadBtn.el().title = 'Download Video';
                        downloadBtn.on('click', function() {
                            const a = document.createElement('a');
                            a.href = window.currentVideoPath;
                            a.download = window.currentVideoPath.split('/').pop();
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        });
                    }

                    const cacheBustedPath = filePath + "?t=" + new Date().getTime();
                    vjsPlayer.src({ type: type, src: cacheBustedPath });
                    
                    const startVideo = () => {
                        if (timeToSet > 0 && timeToSet < vjsPlayer.duration()) {
                            vjsPlayer.currentTime(timeToSet);
                        }
                        vjsPlayer.play().catch(e => console.log("Autoplay blocked", e));
                    };

                    vjsPlayer.ready(function() {
                        if (vjsPlayer.readyState() >= 1) {
                            startVideo();
                        } else {
                            vjsPlayer.one('loadedmetadata', startVideo);
                        }
                    });
                }, 50);

                playerModal.classList.add('active');
                
                const videoId = videoCard.dataset.videoId || videoCard.dataset.taskId; // fallback for queue items
                
                const refreshBtn = document.getElementById('refresh-meta-btn');
                if (refreshBtn) {
                    refreshBtn.dataset.videoId = videoId;
                    refreshBtn.disabled = !videoId;
                    refreshBtn.textContent = 'Refresh Metadata';
                }
                
                const descEl = document.getElementById('player-desc-content');
                const commEl = document.getElementById('player-comments-content');
                if (descEl) descEl.textContent = 'Loading description...';
                if (commEl) commEl.textContent = 'Loading comments...';
                
                if (videoId) {
                    fetch('/api/videos/' + videoId + '/metadata')
                        .then(r => r.json())
                        .then(data => {
                            if (descEl) descEl.textContent = data.description || 'No description available.';
                            if (commEl) {
                                if (data.comments && data.comments.length > 0) {
                                    commEl.innerHTML = data.comments.map(c => `
                                        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                                            <strong>${c.author || 'Unknown'}</strong> 
                                            <span style="color: var(--text-secondary); font-size: 0.8em; margin-left: 8px;">${c.time_text || ''}</span>
                                            <div style="margin-top: 4px;">${c.text || ''}</div>
                                        </div>
                                    `).join('');
                                } else {
                                    commEl.textContent = 'No comments available.';
                                }
                            }
                        })
                        .catch(err => {
                            if (descEl) descEl.textContent = 'Error loading metadata.';
                            if (commEl) commEl.textContent = 'Error loading metadata.';
                        });
                } else {
                    if (descEl) descEl.textContent = 'Metadata not available for this item.';
                    if (commEl) commEl.textContent = 'Metadata not available for this item.';
                }
                
                playerModal.classList.add('active');
            }
        }

        // Кнопка видалення каналу всередині Single View
        const deleteChanBtn = e.target.closest('.delete-channel-btn');
        if (deleteChanBtn) {
            e.stopPropagation();
            itemToDelete = document.getElementById('single-channel-view');
            if (deleteModal) deleteModal.classList.add('active');
            return;
        }

        const refreshMetaBtn = e.target.closest('#refresh-meta-btn');
        if (refreshMetaBtn && refreshMetaBtn.dataset.videoId) {
            e.stopPropagation();
            const vId = refreshMetaBtn.dataset.videoId;
            refreshMetaBtn.disabled = true;
            refreshMetaBtn.textContent = 'Refreshing...';
            fetch('/api/videos/' + vId + '/refresh-metadata', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    refreshMetaBtn.textContent = 'Завантаження (до 10с)...';
                    
                    setTimeout(() => {
                        fetch('/api/videos/' + vId + '/metadata')
                            .then(r => r.json())
                            .then(metaData => {
                                refreshMetaBtn.textContent = 'Оновлено!';
                                setTimeout(() => {
                                    refreshMetaBtn.disabled = false;
                                    refreshMetaBtn.textContent = 'Refresh Metadata';
                                }, 3000);
                                
                                const descEl = document.getElementById('player-desc-content');
                                const commEl = document.getElementById('player-comments-content');
                                if (descEl) descEl.textContent = metaData.description || 'No description available.';
                                if (commEl) {
                                    if (metaData.comments && metaData.comments.length > 0) {
                                        commEl.innerHTML = metaData.comments.map(c => `
                                            <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                                                <strong>${c.author || 'Unknown'}</strong> 
                                                <span style="color: var(--text-secondary); font-size: 0.8em; margin-left: 8px;">${c.time_text || ''}</span>
                                                <div style="margin-top: 4px;">${c.text || ''}</div>
                                            </div>
                                        `).join('');
                                    } else {
                                        commEl.textContent = 'Немає коментарів.';
                                    }
                                }
                            });
                    }, 6000);
                })
                .catch(err => {
                    alert('Error starting refresh');
                    refreshMetaBtn.disabled = false;
                    refreshMetaBtn.textContent = 'Refresh Metadata';
                });
            return;
        }

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            itemToDelete = deleteBtn.closest('.card, .video-card, .queue-item');
            if (itemToDelete && deleteModal) {
                deleteModal.classList.add('active');
            }
        }
    });

    // Навігація по головним вкладкам (Tabs)
    const navAll = document.getElementById('nav-all');
    const navChannels = document.getElementById('nav-channels');
    const navQueue = document.getElementById('nav-queue');
    const navConfig = document.getElementById('nav-config');
    const allVideosView = document.getElementById('all-videos-view');
    const queueView = document.getElementById('queue-view');
    const configView = document.getElementById('config-view');

    if (navAll && navChannels && navQueue && navConfig && queueView && channelsView && allVideosView && configView) {
        const hideAllViews = () => {
            allVideosView.classList.add('hidden');
            channelsView.classList.add('hidden');
            queueView.classList.add('hidden');
            singleChannelView.classList.add('hidden');
            configView.classList.add('hidden');
            navAll.classList.remove('active');
            navChannels.classList.remove('active');
            navQueue.classList.remove('active');
            navConfig.classList.remove('active');
        };

        navAll.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            localStorage.setItem('yhtvActiveTab', 'nav-all');
            hideAllViews();
            navAll.classList.add('active');
            allVideosView.classList.remove('hidden');
        });


        navChannels.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            localStorage.setItem('yhtvActiveTab', 'nav-channels');
            if (e && e.isTrusted) {
                localStorage.removeItem('yhtvCurrentChannelId');
            }
            hideAllViews();
            navChannels.classList.add('active');
            channelsView.classList.remove('hidden');
        });
        
        navQueue.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            localStorage.setItem('yhtvActiveTab', 'nav-queue');
            hideAllViews();
            navQueue.classList.add('active');
            queueView.classList.remove('hidden');
        });

        navConfig.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            localStorage.setItem('yhtvActiveTab', 'nav-config');
            hideAllViews();
            navConfig.classList.add('active');
            configView.classList.remove('hidden');
        });

        // Відновлення вкладки після оновлення сторінки
        const activeTabId = localStorage.getItem('yhtvActiveTab') || 'nav-all';
        const tabMap = {
            'nav-all': navAll,

            'nav-channels': navChannels,
            'nav-queue': navQueue,
            'nav-config': navConfig
        };
        if (tabMap[activeTabId]) {
            tabMap[activeTabId].click();
        } else {
            navAll.click();
        }
    }

    // Логіка кнопок сторінки Queue
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/queue?status=completed', { method: 'DELETE' });
                if (res.ok) {
                    const completedItems = document.querySelectorAll('.queue-item.completed');
                    completedItems.forEach(item => {
                        if(item.dataset.taskId) window.localQueueState.deleted.add(item.dataset.taskId);
                        item.style.transition = 'all 0.3s ease';
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            item.style.height = '0';
                            item.style.margin = '0';
                            item.style.padding = '0';
                            item.style.border = '0';
                            item.style.overflow = 'hidden';
                            setTimeout(() => item.remove(), 300);
                        }, 150);
                    });
                    saveQueueState();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    const pauseAllBtn = document.getElementById('pause-all-btn');
    const stopAllBtn = document.getElementById('stop-all-btn');
    if (stopAllBtn) {
        stopAllBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to stop all active downloads?')) {
                try {
                    await fetch('/api/queue?status=downloading', { method: 'DELETE' });
                    await fetch('/api/queue?status=queued', { method: 'DELETE' });
                    fetchQueue(); // Refresh visually
                } catch(err) {
                    console.error(err);
                }
            }
        });
    }

    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            itemToDelete = { id: 'all-queue-items' }; // Mock об'єкт для глобального видалення
            if (deleteModal) {
                deleteModal.classList.add('active');
            }
        });
    }

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('retry-btn') || e.target.closest('.retry-btn')) {
            const btn = e.target.classList.contains('retry-btn') ? e.target : e.target.closest('.retry-btn');
            const parentItem = btn.closest('.queue-item');
            if (parentItem) {
                const taskId = parentItem.dataset.taskId;
                if (!taskId) return;
                
                btn.disabled = true;
                const origIcon = btn.innerHTML;
                btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`;
                
                try {
                    const res = await fetch('/api/queue/' + taskId + '/retry', { method: 'POST' });
                    if (res.ok) {
                        parentItem.classList.remove('error');
                        parentItem.classList.add('queued');
                        const iconContainer = parentItem.querySelector('.queue-status-icon');
                        if (iconContainer) {
                            iconContainer.classList.remove('danger');
                            iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
                        }
                        const metaText = parentItem.querySelector('.queue-meta');
                        if (metaText) {
                            metaText.classList.remove('danger-text');
                            metaText.textContent = 'Waiting in queue...';
                        }
                        btn.style.display = 'none';
                    } else {
                        btn.innerHTML = origIcon;
                        btn.disabled = false;
                        alert('Failed to retry task.');
                    }
                } catch(err) {
                    btn.innerHTML = origIcon;
                    btn.disabled = false;
                }
            }
        }
    });

    // Навігація по вкладках налаштувань
    const configTabs = document.querySelectorAll('.config-tab');
    const configTabContents = document.querySelectorAll('.config-tab-content');

    configTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');
            
            // Зняти active з усіх кнопок та приховати всі вкладки
            configTabs.forEach(t => t.classList.remove('active'));
            configTabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none'; // щоб вони не займали місце в layout
            });
            
            // Додати active обраній кнопці та показати її вміст
            tab.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'flex'; // forma u nas flex column
            }
        });
    });
    
    // Навігація по вкладках каналу (з підтримкою декількох контейнерів вкладок)
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('.channel-tab');
        if (tab) {
            const container = tab.closest('.channel-tabs').parentElement;
            const targetId = tab.getAttribute('data-target');
            
            const siblingTabs = container.querySelectorAll('.channel-tab');
            const siblingContents = container.querySelectorAll('.channel-tab-content');
            
            siblingTabs.forEach(t => t.classList.remove('active'));
            siblingContents.forEach(c => {
                c.classList.remove('active');
                c.classList.add('hidden');
            });
            
            tab.classList.add('active');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.classList.remove('hidden');
            }
        }
    });

    // Ініціалізація першої вкладки каналу
    const firstChannelTab = document.querySelector('.channel-tab.active');
    if (firstChannelTab) firstChannelTab.click();

    // Ініціалізація першої вкладки конфігурації
    const firstTab = document.querySelector('.config-tab.active');
    if (firstTab) firstTab.click();
});

    // --- NAVIGATION LOGIC ---
    const navAll = document.getElementById('nav-all');
    const navChannels = document.getElementById('nav-channels');
    const navQueue = document.getElementById('nav-queue');
    // const navConfig = document.getElementById('nav-config'); // if exists
    const settingsBtn = document.getElementById('settings-btn');
    
    const views = {
        'all': document.getElementById('all-videos-view'),
        'channels': document.getElementById('channels-view'),
        'queue': document.getElementById('queue-view'),
        'config': document.getElementById('config-view'),
        'single-channel': document.getElementById('single-channel-view')
    };

    function switchView(viewName) {
        // Hide all views
        Object.values(views).forEach(v => {
            if (v) v.classList.add('hidden');
        });
        
        // Show target view
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }

        // Update nav links active state
        document.querySelectorAll('.nav-links .nav-item').forEach(el => el.classList.remove('active'));
        
        if (viewName === 'all' && navAll) navAll.classList.add('active');
        if (viewName === 'channels' && navChannels) navChannels.classList.add('active');
        if (viewName === 'queue' && navQueue) navQueue.classList.add('active');
    }

    if (navAll) navAll.addEventListener('click', (e) => { e.preventDefault(); switchView('all'); });
    if (navChannels) navChannels.addEventListener('click', (e) => { e.preventDefault(); switchView('channels'); });
    if (navQueue) navQueue.addEventListener('click', (e) => { e.preventDefault(); switchView('queue'); });
    
    const navConfig = document.getElementById('nav-config');
    if (navConfig) navConfig.addEventListener('click', (e) => { e.preventDefault(); switchView('config'); navConfig.classList.add('active'); });

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            switchView('config');
        });
    }

    // --- CONFIG API LOGIC ---
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


// Helper for duration parsing
function parseDuration(durStr) {
    if (!durStr) return 0;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return parts[0] || 0;
}

window.currentSearchTerm = '';

// Dynamic Data Fetching
async function fetchVideos() {
    const res = await fetch('/api/videos');
    if(res.ok) {
        let videos = await res.json();
        
        try {
            // Filter out shorts from the main home page
            videos = videos.filter(v => !isShort(v));

            if (window.currentSearchTerm) {
                videos = videos.filter(v => (v.title || '').toLowerCase().includes(window.currentSearchTerm));
            }

            const sortSelect = document.getElementById('video-sort-select');
            if (sortSelect) {
                const val = sortSelect.value;
                if (val === 'Oldest first') {
                    videos.reverse();
                } else if (val === 'Longest') {
                    videos.sort((a, b) => parseDuration(b.duration) - parseDuration(a.duration));
                }
            }

            const container = document.getElementById('all-videos-container');
            if (container) {
                if (videos.length === 0) {
                    container.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">No videos available</p>';
                } else {
                    container.innerHTML = videos.map(v => {
                        const safeTitle = (v.title || 'Unknown Title').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const safePath = (v.file_path || '').replace(/"/g, '&quot;');
                        const safeThumb = (v.thumbnail || '').replace(/'/g, '%27');
                        
                        return `
                            <div class="video-card ${v.watched ? 'watched' : ''}" data-video-id="${v.id}" data-file-path="${safePath}" data-progress="${v.progress || 0}" data-watched="${v.watched || false}">
                                <div class="video-thumbnail" style="background-image: url('${safeThumb}');">
                                    <span class="video-duration">${v.duration || 'N/A'}</span>
                                    ${v.watched ? '<div class="watched-badge" style="position:absolute; top:5px; left:5px; background:var(--btn-danger); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Переглянуто</div>' : ''}
                                    ${!v.watched && v.progress > 0 ? `<div class="progress-bar-container" style="position:absolute; bottom:0; left:0; width:100%; height:4px; background:rgba(255,255,255,0.3);"><div style="height:100%; background:var(--btn-danger); width:${(v.progress / (v.duration ? parseInt(v.duration.split(':').reduce((acc,time) => (60 * acc) + +time)) : 1)) * 100}%;"></div></div>` : ''}
                                </div>
                                <div class="video-info">
                                    <h4 class="video-title" title="${safeTitle}">${safeTitle}</h4>
                                    <p class="video-meta">${v.resolution || ''} • ${v.filesize || ''}</p>
                                </div>
                                <button class="icon-btn delete-btn" title="Delete">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (e) {
            console.error('Error rendering videos:', e);
        }
    }
}


async function fetchChannels() {
    const res = await fetch('/api/channels');
    if(res.ok) {
        let channels = await res.json();
        
        if (window.currentSearchTerm) {
            channels = channels.filter(c => (c.name || '').toLowerCase().includes(window.currentSearchTerm));
        }

        const container = document.getElementById('channels-container');
        if(container) {
            container.innerHTML = channels.map(c => `
                <div class="card" data-channel-id="${c.id}" data-subscribed="${c.subscribed}" data-banner="${c.banner || ''}" data-description="${(c.description || '').replace(/"/g, '&quot;')}">
                    <div class="card-banner" style="${c.banner ? 'background-image: url('+c.banner+')' : 'background-color: #333;'}"></div>
                    <div class="card-content">
                        <div class="card-avatar">
                            <img src="${c.avatar || 'data:image/svg+xml;utf8,<svg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'150\\\' height=\\\'150\\\'><rect width=\\\'150\\\' height=\\\'150\\\' fill=\\\'%23555\\\'/></svg>'}" alt="Avatar">
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">${c.name}</h3>
                        </div>
                    </div>
                    <button class="icon-btn delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>`).join('');
            
            // Auto-open saved channel if exists (only on initial load)
            if (!window.yhtvInitialLoadDone) {
                window.yhtvInitialLoadDone = true;
                const savedChannelId = localStorage.getItem('yhtvCurrentChannelId');
                if (savedChannelId) {
                    const cardToClick = document.querySelector(`.card[data-channel-id="${savedChannelId}"]`);
                    if (cardToClick) {
                        cardToClick.click();
                    }
                }
            }
        }
    }
}

async function fetchQueue() {
    const res = await fetch('/api/queue');
    if(res.ok) {
        let tasks = await res.json();
        
        // Filter out deleted items locally for optimistic UI
        if (window.localQueueState) {
            tasks = tasks.filter(t => !window.localQueueState.deleted.has(t.task_id));
        }

        // Update badge count (only count active tasks)
        const badge = document.querySelector('#nav-queue .badge');
        if (badge) {
            const activeTasksCount = tasks.filter(t => ['QUEUED', 'DOWNLOADING', 'PROGRESS'].includes(t.status)).length;
            badge.textContent = activeTasksCount;
            badge.style.display = activeTasksCount > 0 ? 'inline-block' : 'none';
        }

        const container = document.getElementById('queue-list-container');
        if(container) {
            container.innerHTML = tasks.map(t => {
                let statusClass = 'queued';
                let icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
                let metaText = 'Waiting in queue...';
                let isPaused = window.localQueueState && window.localQueueState.paused.has(t.task_id);
                
                if(t.status === 'DOWNLOADING') {
                    statusClass = 'downloading';
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';
                    let prog = (t.progress || 0).toFixed(1);
                    metaText = `Downloading... ${prog}% (${t.speed || 'N/A'}) - ETA ${t.eta || 'N/A'}`;
                } else if(t.status === 'COMPLETED') {
                    statusClass = 'completed';
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
                    metaText = `Completed - ${t.title || ''}`;
                } else if(t.status === 'ERROR') {
                    statusClass = 'error';
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
                    metaText = `Error: ${t.error_message || 'Unknown'}`;
                }

                const currentLang = localStorage.getItem('yhtvLang') || 'en';
                if (currentLang === 'uk' && typeof translations !== 'undefined') {
                    if (t.status === 'DOWNLOADING') {
                        let prog = (t.progress || 0).toFixed(1);
                        metaText = `${translations['Downloading...']} ${prog}% (${t.speed || 'N/A'}) - ETA ${t.eta || 'N/A'}`;
                    } else if (t.status === 'COMPLETED') {
                        metaText = `${translations['Completed - ']}${t.title || ''}`;
                    } else if (t.status === 'ERROR') {
                        metaText = `${translations['Error:']} ${t.error_message || 'Unknown'}`;
                    } else if (t.status === 'QUEUED') {
                        metaText = translations['Waiting in queue...'];
                    }
                }

                let actionBtns = '';
                if (t.status === 'ERROR') {
                    actionBtns += `<button class="icon-btn retry-btn" title="Retry"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>`;
                }
                actionBtns += `<button class="icon-btn delete-btn" title="Cancel/Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;

                return `
                <div class="queue-item ${statusClass}" data-task-id="${t.task_id || ''}">
                    <div class="queue-status-icon ${statusClass === 'completed' ? 'success' : statusClass === 'error' ? 'danger' : ''}">
                        ${icon}
                    </div>
                    <div class="queue-details">
                        <h4 class="queue-title">${t.title || t.url}</h4>
                        ${t.status === 'DOWNLOADING' ? `<div class="progress-bar-container"><div class="progress-bar" style="width: ${t.progress}%;"></div></div>` : ''}
                        <p class="queue-meta ${statusClass === 'error' ? 'danger-text' : ''}">${metaText}</p>
                    </div>
                    <div class="queue-actions" style="display:flex; align-items:center; gap:8px; margin-left:auto;">
                        ${actionBtns}
                    </div>
                </div>`;
            }).join('');
        }
    }
}

// Attach fetchers to nav clicks
document.getElementById('nav-all')?.addEventListener('click', fetchVideos);
document.getElementById('nav-channels')?.addEventListener('click', fetchChannels);
document.getElementById('nav-queue')?.addEventListener('click', fetchQueue);

// Attach sorting change listener
document.getElementById('video-sort-select')?.addEventListener('change', fetchVideos);
document.getElementById('shorts-sort-select')?.addEventListener('change', fetchShorts);

// Global search button
document.getElementById('global-search-btn')?.addEventListener('click', () => {
    const term = prompt('Enter search term (leave empty to clear):', window.currentSearchTerm);
    if (term !== null) {
        window.currentSearchTerm = term.trim().toLowerCase();
        const activeTab = document.querySelector('.nav-item.active');
        if(activeTab?.id === 'nav-all') fetchVideos();

        if(activeTab?.id === 'nav-channels') fetchChannels();
    }
});

// Periodically fetch queue to update badge and list
setInterval(() => {
    fetchQueue();
}, 3000);

// Initial fetch on load
setTimeout(() => {
    const activeTab = document.querySelector('.nav-item.active');
    if(activeTab?.id === 'nav-all') fetchVideos();

    if(activeTab?.id === 'nav-channels') fetchChannels();
    if(activeTab?.id === 'nav-queue') fetchQueue();
}, 500);

// Global keyboard controls for video player in modal
document.addEventListener('keydown', (e) => {
    const playerModal = document.getElementById('player-modal');
    if (playerModal && playerModal.classList.contains('active')) {
        if (typeof vjsPlayer !== 'undefined' && vjsPlayer && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            switch(e.key.toLowerCase()) {
                case 'arrowright':
                    e.preventDefault();
                    vjsPlayer.currentTime(vjsPlayer.currentTime() + 5);
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    vjsPlayer.currentTime(vjsPlayer.currentTime() - 5);
                    break;
                case 'l':
                    e.preventDefault();
                    vjsPlayer.currentTime(vjsPlayer.currentTime() + 10);
                    break;
                case 'j':
                    e.preventDefault();
                    vjsPlayer.currentTime(vjsPlayer.currentTime() - 10);
                    break;
                case 'k':
                case ' ':
                    e.preventDefault();
                    if (vjsPlayer.paused()) vjsPlayer.play();
                    else vjsPlayer.pause();
                    break;
                case 'f':
                    e.preventDefault();
                    if (vjsPlayer.isFullscreen()) {
                        vjsPlayer.exitFullscreen();
                    } else {
                        vjsPlayer.requestFullscreen();
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    vjsPlayer.muted(!vjsPlayer.muted());
                    break;
                case 'arrowup':
                    e.preventDefault();
                    vjsPlayer.volume(Math.min(1, vjsPlayer.volume() + 0.05));
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    vjsPlayer.volume(Math.max(0, vjsPlayer.volume() - 0.05));
                    break;
            }
        }
    }
});

// Manual cleanup logic
document.getElementById('manual-cleanup-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('manual-cleanup-btn');
    const status = document.getElementById('cleanup-status');
    btn.disabled = true;
    status.textContent = 'Очищення...';
    try {
        const res = await fetch('/api/cleanup', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            status.textContent = `Готово! Видалено файлів/папок: ${data.deleted_count}`;
            status.style.color = 'var(--primary-color)';
        } else {
            status.textContent = 'Помилка очищення';
            status.style.color = 'var(--danger-color)';
        }
    } catch(e) {
        status.textContent = 'Помилка мережі';
        status.style.color = 'var(--danger-color)';
    }
    setTimeout(() => {
        btn.disabled = false;
        setTimeout(() => status.textContent = '', 5000);
    }, 1000);
});

