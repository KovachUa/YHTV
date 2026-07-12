document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-100'; 
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width, height;
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        // Keep resolution low for huge blurred performance
        canvas.width = width / 4;
        canvas.height = height / 4;
    }
    window.addEventListener('resize', resize);
    resize();

    // Sleek premium dark Aurora palette (very subtle, modern)
    const orbs = [
        { color: [20, 24, 36], xFreq: 0.1, yFreq: 0.15, size: 0.8 },   // Deep navy
        { color: [43, 20, 56], xFreq: 0.12, yFreq: 0.08, size: 0.9 },  // Deep purple
        { color: [15, 35, 35], xFreq: 0.08, yFreq: 0.11, size: 0.7 }   // Deep teal
    ];

    let startTime = Date.now();

    function render() {
        const t = (Date.now() - startTime) / 1000.0;
        
        // Base premium dark background
        ctx.fillStyle = '#0f111a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'screen';

        orbs.forEach((orb, i) => {
            const cx = canvas.width / 2 + Math.sin(t * orb.xFreq + i) * (canvas.width * 0.4);
            const cy = canvas.height / 2 + Math.cos(t * orb.yFreq + i) * (canvas.height * 0.4);
            const r = canvas.width * orb.size;
            
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, `rgba(${orb.color[0]}, ${orb.color[1]}, ${orb.color[2]}, 0.8)`);
            grad.addColorStop(1, `rgba(${orb.color[0]}, ${orb.color[1]}, ${orb.color[2]}, 0)`);
            
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });

        ctx.globalCompositeOperation = 'source-over';

        // Add extreme subtle premium noise
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 6; // Very subtle noise
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);

        setTimeout(() => requestAnimationFrame(render), 1000 / 20); // 20 FPS is enough for slow Aurora
    }
    render();
});
