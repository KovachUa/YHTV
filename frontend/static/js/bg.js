document.addEventListener('DOMContentLoaded', () => {
    // Dynamically create canvas so it goes to the very back
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-100'; // Force it behind everything
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width, height;
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        // Scale down resolution for ARM CPU performance (faster drawing, soft look)
        canvas.width = width / 2;
        canvas.height = height / 2;
    }
    window.addEventListener('resize', resize);
    resize();

    // Time of day logic
    const hour = new Date().getHours();
    let basePalette;
    if (hour >= 6 && hour < 12) {
        basePalette = [[20, 25, 40], [60, 70, 100], [80, 50, 90]]; // Morning
    } else if (hour >= 12 && hour < 18) {
        basePalette = [[15, 20, 50], [40, 50, 120], [60, 40, 110]]; // Day
    } else if (hour >= 18 && hour < 22) {
        basePalette = [[30, 10, 35], [80, 30, 70], [100, 50, 50]]; // Evening
    } else {
        basePalette = [[10, 10, 15], [30, 30, 60], [45, 25, 60]]; // Night
    }

    let palette = JSON.parse(JSON.stringify(basePalette));

    // Dynamic shift based on the first video on the page
    function updatePaletteFromVideo() {
        // Try to find the first video title (either in grid or queue)
        const firstVideo = document.querySelector('.video-title, .queue-title');
        if (firstVideo) {
            const text = firstVideo.textContent;
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                hash = text.charCodeAt(i) + ((hash << 5) - hash);
            }
            // Generate a color shift based on the hash (-20 to +20)
            const rShift = (hash % 40) - 20;
            const gShift = ((hash >> 8) % 40) - 20;
            const bShift = ((hash >> 16) % 40) - 20;

            palette = basePalette.map(color => [
                Math.max(0, Math.min(255, color[0] + rShift)),
                Math.max(0, Math.min(255, color[1] + gShift)),
                Math.max(0, Math.min(255, color[2] + bShift))
            ]);
        } else {
            palette = JSON.parse(JSON.stringify(basePalette));
        }
    }
    
    // Periodically check if the user switched tabs to a different first video
    setInterval(updatePaletteFromVideo, 2000);
    updatePaletteFromVideo();

    // Pre-generate static noise pattern for performance
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 128;
    noiseCanvas.height = 128;
    const nCtx = noiseCanvas.getContext('2d');
    const nImg = nCtx.createImageData(128, 128);
    const nData = nImg.data;
    for (let i = 0; i < nData.length; i += 4) {
        const val = Math.random() * 255;
        nData[i] = val;
        nData[i+1] = val;
        nData[i+2] = val;
        nData[i+3] = 12; // Very low alpha for subtle grain
    }
    nCtx.putImageData(nImg, 0, 0);

    let startTime = Date.now();

    function render() {
        const t = (Date.now() - startTime) / 1000.0;
        
        // Base background color
        ctx.fillStyle = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'screen';

        // Draw mathematical floating orbs (Demoscene math style)
        for (let i = 1; i <= 3; i++) {
            // Complex math paths for uniqueness
            const cx = canvas.width / 2 + Math.sin(t * 0.4 * i) * (canvas.width / 2.5);
            const cy = canvas.height / 2 + Math.cos(t * 0.3 * i + i) * (canvas.height / 2.5);
            const r = canvas.width * 0.5 + Math.sin(t * 0.2 + i) * canvas.width * 0.15;
            
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            const color = palette[i % palette.length];
            grad.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`);
            grad.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
            
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.globalCompositeOperation = 'source-over';

        // Add subtle noise tiled and slowly panning
        const pat = ctx.createPattern(noiseCanvas, 'repeat');
        ctx.fillStyle = pat;
        ctx.save();
        ctx.translate((t * 15) % 128, (t * 15) % 128);
        ctx.fillRect(-128, -128, canvas.width + 256, canvas.height + 256);
        ctx.restore();

        // 24 FPS limit for maximum ARM CPU performance while staying smooth
        setTimeout(() => requestAnimationFrame(render), 1000 / 24);
    }
    render();
});
