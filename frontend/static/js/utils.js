export function formatDurationDisplay(durStr) {
    if (!durStr) return 'N/A';
    if (String(durStr).includes(':')) return durStr;
    const totalSeconds = parseInt(durStr, 10);
    if (isNaN(totalSeconds)) return durStr;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) {
        return h + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    } else {
        return m + ':' + s.toString().padStart(2, '0');
    }
}

export function parseDuration(durStr) {
    if (!durStr) return 0;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return parts[0] || 0;
}

export function isShort(v) {
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
}

export function saveQueueState() {
    localStorage.setItem('yhtvQueueState', JSON.stringify({
        paused: Array.from(window.localQueueState.paused),
        deleted: Array.from(window.localQueueState.deleted)
    }));
}
