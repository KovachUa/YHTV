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

    const addThumbBtn = document.getElementById('add-thumb-btn');
    if (addThumbBtn) {
        addThumbBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                alert('Please enter a URL');
                return;
            }
            
            const origText = addThumbBtn.textContent;
            addThumbBtn.textContent = 'Adding...';
            addThumbBtn.disabled = true;

            try {
                const res = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, type: 'thumbnail' })
                });

                if (res.ok) {
                    closeModal();
                    const navQueue = document.getElementById('nav-queue');
                    if (navQueue) navQueue.click();
                } else {
                    const errText = await res.text();
                    alert('Error adding task: ' + errText);
                }
            } catch (err) {
                console.error(err);
                alert('Network error');
            } finally {
                addThumbBtn.textContent = origText;
                addThumbBtn.disabled = false;
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
                    // Redirect to queue view
                    const navQueue = document.getElementById('nav-queue');
                    if (navQueue) navQueue.click();
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

                const avatarSrc = card.querySelector('.card-avatar img').src;
                const channelName = card.querySelector('.card-title').textContent;
                const bannerSrc = card.dataset.banner;
                const desc = card.dataset.description;
                
                const bannerDiv = singleChannelView.querySelector('.channel-banner-large');
                if (bannerSrc) {
                    bannerDiv.style.backgroundImage = `url('${bannerSrc}')`;
                } else {
                    bannerDiv.style.backgroundImage = `url('https://images.unsplash.com/photo-1506744626753-140285396207?q=80&w=1200&auto=format&fit=crop')`;
                }

                singleChannelView.querySelector('.channel-avatar-large').src = avatarSrc;
                singleChannelView.querySelector('.channel-details-large h2').textContent = channelName;
                
                let descEl = singleChannelView.querySelector('.channel-details-large .channel-desc');
                if (!descEl) {
                    descEl = document.createElement('p');
                    descEl.className = 'channel-desc';
                    descEl.style.color = 'var(--text-secondary)';
                    descEl.style.fontSize = '0.9rem';
                    descEl.style.marginTop = '10px';
                    descEl.style.maxWidth = '800px';
                    singleChannelView.querySelector('.channel-details-large').appendChild(descEl);
                }
                descEl.textContent = desc ? (desc.length > 200 ? desc.substring(0, 200) + '...' : desc) : 'No description available.';

                channelsView.classList.add('hidden');
                singleChannelView.classList.remove('hidden');
                window.scrollTo(0, 0);

                const res = await fetch('/api/videos');
                if (res.ok) {
                    const allVideos = await res.json();
                    const channelVideos = allVideos.filter(v => v.channel_id === channelId);
                    const container = document.getElementById('single-channel-videos-container');
                    if (container) {
                        if (channelVideos.length === 0) {
                            container.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">No videos downloaded yet.</p>';
                        } else {
                            container.innerHTML = channelVideos.map(v => `
                                <div class="video-card" data-video-id="${v.id}" data-file-path="${v.file_path || ''}">
                                    <div class="video-thumbnail" style="background-image: url('${v.thumbnail || ''}');">
                                        <span class="video-duration">${v.duration || 'N/A'}</span>
                                    </div>
                                    <div class="video-info">
                                        <h4 class="video-title">${v.title || 'Unknown Title'}</h4>
                                        <p class="video-meta">${v.resolution || ''} • ${v.filesize || ''}</p>
                                    </div>
                                    <button class="icon-btn delete-btn" title="Delete">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>`).join('');
                        }
                    }
                    
                    const availableContainer = document.getElementById('single-channel-available-container');
                    const loadingIndicator = document.getElementById('channel-loading-indicator');
                    if (availableContainer && loadingIndicator) {
                        availableContainer.innerHTML = '';
                        loadingIndicator.classList.remove('hidden');
                        try {
                            const browseRes = await fetch('/api/channels/' + channelId + '/browse');
                            loadingIndicator.classList.add('hidden');
                            if (browseRes.ok) {
                                const data = await browseRes.json();
                                if (data.status === 'success' && data.videos) {
                                    const downloadedIds = new Set(channelVideos.map(v => v.id));
                                    const availableVideos = data.videos.filter(v => !downloadedIds.has(v.id));

                                    if (availableVideos.length === 0) {
                                        availableContainer.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">No new videos found.</p>';
                                    } else {
                                        availableContainer.innerHTML = availableVideos.map(v => {
                                            const durMinutes = v.duration ? Math.floor(v.duration / 60) + ':' + (v.duration % 60).toString().padStart(2, '0') : 'N/A';
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
                                                    <button class="btn btn-primary download-available-btn" data-url="${v.url}" style="flex: 1; border-radius: 4px; padding: 6px;">Video</button>
                                                    <button class="btn btn-secondary download-available-thumb-btn" data-url="${v.url}" style="flex: 1; border-radius: 4px; padding: 6px;">Thumb</button>
                                                </div>
                                            </div>`;
                                        }).join('');
                                    }
                                }
                            } else {
                                availableContainer.innerHTML = '<p style="padding: 20px; color: var(--danger-color);">Failed to load available videos.</p>';
                            }
                        } catch(err) {
                            loadingIndicator.classList.add('hidden');
                            availableContainer.innerHTML = '<p style="padding: 20px; color: var(--danger-color);">Error connecting to server.</p>';
                        }
                    }
                }
            }
        });

        if (backToChannelsBtn) {
            backToChannelsBtn.addEventListener('click', () => {
                singleChannelView.classList.add('hidden');
                channelsView.classList.remove('hidden');
            });
        }
    }

    // Логіка для кнопок підписки / відписки
    document.addEventListener('click', async (e) => {
        // Download available video or thumbnail
        if (e.target.closest('.download-available-btn') || e.target.closest('.download-available-thumb-btn')) {
            const btn = e.target.closest('.download-available-btn') || e.target.closest('.download-available-thumb-btn');
            const isThumb = btn.classList.contains('download-available-thumb-btn');
            const url = btn.dataset.url;
            if (url) {
                const origText = btn.textContent;
                btn.textContent = 'Queuing...';
                btn.disabled = true;
                try {
                    const res = await fetch('/api/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, type: isThumb ? 'thumbnail' : 'video' })
                    });
                    if (res.ok) {
                        btn.textContent = 'Queued';
                        btn.style.background = 'var(--bg-surface)';
                        btn.style.color = 'var(--text-secondary)';
                        btn.style.border = '1px solid var(--border-color)';
                        const navQueue = document.getElementById('nav-queue');
                        if (navQueue) navQueue.style.transform = 'scale(1.1)';
                        setTimeout(() => { if (navQueue) navQueue.style.transform = 'none'; }, 200);
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

    document.addEventListener('click', (e) => {
        // Close Video Player Modal
        const closePlayerBtn = e.target.closest('#close-player-btn');
        if (closePlayerBtn) {
            const playerModal = document.getElementById('player-modal');
            const mainVideoPlayer = document.getElementById('main-video-player');
            if(playerModal) playerModal.classList.remove('active');
            if(mainVideoPlayer) {
                if (window.videojs) {
                    videojs('main-video-player').pause();
                } else {
                    mainVideoPlayer.pause();
                }
            }
            return;
        }

        // Open Video Player Modal
        const videoCard = e.target.closest('.video-card') || e.target.closest('.queue-item.completed');
        if (videoCard && !e.target.closest('.delete-btn') && !e.target.closest('button')) {
            const titleEl = videoCard.querySelector('.video-title') || videoCard.querySelector('.queue-title');
            const playerModal = document.getElementById('player-modal');
            const mainVideoPlayer = document.getElementById('main-video-player');
            const playerTitle = document.getElementById('player-title');
            
            if (playerModal && mainVideoPlayer && titleEl) {
                playerTitle.textContent = titleEl.textContent;
                
                const filePath = videoCard.getAttribute('data-file-path');
                if (filePath && window.videojs) {
                    let type = 'video/mp4';
                    if (filePath.toLowerCase().endsWith('.webm')) type = 'video/webm';
                    else if (filePath.toLowerCase().endsWith('.mkv')) type = 'video/x-matroska';
                    
                    const player = videojs('main-video-player');
                    // Ensure the URL matches our nginx route for downloads
                    player.src({ src: filePath, type: type });
                    player.play();
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
        const savedTab = localStorage.getItem('yhtvActiveTab');
        if (savedTab === 'nav-queue') {
            navQueue.click();
        } else if (savedTab === 'nav-channels') {
            navChannels.click();
        } else if (savedTab === 'nav-config') {
            navConfig.click();
        } else {
            // За замовчуванням All Videos
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
    
    // Ініціалізація першої вкладки
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
                            <div class="video-card" data-video-id="${v.id}" data-file-path="${safePath}">
                                <div class="video-thumbnail" style="background-image: url('${safeThumb}');">
                                    <span class="video-duration">${v.duration || 'N/A'}</span>
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
                            <img src="${c.avatar || 'https://i.pravatar.cc/150?u='+c.id}" alt="Avatar">
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">${c.name}</h3>
                        </div>
                    </div>
                    <button class="icon-btn delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>`).join('');
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

        // Update badge count
        const badge = document.querySelector('#nav-queue .badge');
        if (badge) {
            badge.textContent = tasks.length;
            badge.style.display = tasks.length > 0 ? 'inline-block' : 'none';
        }

        const container = document.getElementById('queue-list-container');
        if(container) {
            container.innerHTML = tasks.map(t => {
                let statusClass = 'queued';
                let icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
                let metaText = t.status;
                let isPaused = window.localQueueState && window.localQueueState.paused.has(t.task_id);
                
                if(t.status === 'DOWNLOADING') {
                    statusClass = 'downloading';
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';
                    metaText = `Downloading... ${t.progress.toFixed(1)}% (${t.speed || 'N/A'}) - ETA ${t.eta || 'N/A'}`;
                } else if(t.status === 'COMPLETED') {
                    statusClass = 'completed';
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
                } else if(t.status === 'ERROR') {
                    statusClass = 'error';
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
                    metaText = `Error: ${t.error_message}`;
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

// Periodically fetch queue if queue tab is active
setInterval(() => {
    if(document.getElementById('nav-queue')?.classList.contains('active')) {
        fetchQueue();
    }
}, 2000);

// Initial fetch on load
setTimeout(() => {
    const activeTab = document.querySelector('.nav-item.active');
    if(activeTab?.id === 'nav-all') fetchVideos();
    if(activeTab?.id === 'nav-channels') fetchChannels();
    if(activeTab?.id === 'nav-queue') fetchQueue();
}, 500);
