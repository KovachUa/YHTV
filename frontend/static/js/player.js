document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('main-video-player');
    if (!video) return;

    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const muteBtn = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const progressContainer = document.getElementById('progress-container');
    const progressPlayed = document.getElementById('progress-played');
    const progressBuffered = document.getElementById('progress-buffered');
    const progressThumb = document.getElementById('progress-thumb');
    const videoContainer = document.querySelector('.video-container');

    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        }
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function togglePlay() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('play', () => {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    });

    video.addEventListener('pause', () => {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    });

    video.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(video.duration);
        updateBuffer();
    });

    video.addEventListener('timeupdate', () => {
        currentTimeEl.textContent = formatTime(video.currentTime);
        if (video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressPlayed.style.width = percent + '%';
            progressThumb.style.left = percent + '%';
        }
    });

    video.addEventListener('progress', updateBuffer);
    video.addEventListener('timeupdate', updateBuffer);

    function updateBuffer() {
        if (video.duration > 0 && video.buffered.length > 0) {
            let bufferedEnd = 0;
            for (let i = 0; i < video.buffered.length; i++) {
                if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
                    bufferedEnd = video.buffered.end(i);
                    break;
                }
            }
            if (bufferedEnd === 0 && video.buffered.length > 0) {
                bufferedEnd = video.buffered.end(video.buffered.length - 1);
            }
            const percent = (bufferedEnd / video.duration) * 100;
            progressBuffered.style.width = percent + '%';
        }
    }

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    });

    let isDragging = false;
    progressContainer.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = progressContainer.getBoundingClientRect();
            let pos = (e.clientX - rect.left) / rect.width;
            pos = Math.max(0, Math.min(1, pos));
            video.currentTime = pos * video.duration;
        }
    });

    muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        volumeSlider.value = video.muted ? 0 : video.volume;
    });

    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value;
        video.muted = e.target.value === '0';
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    let hideControlsTimeout;
    videoContainer.addEventListener('mousemove', () => {
        videoContainer.classList.add('active');
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            if (!video.paused) {
                videoContainer.classList.remove('active');
            }
        }, 2500);
    });
    
    videoContainer.addEventListener('mouseleave', () => {
        if (!video.paused) {
            videoContainer.classList.remove('active');
        }
    });
});
