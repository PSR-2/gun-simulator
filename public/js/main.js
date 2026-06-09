document.addEventListener('DOMContentLoaded', () => {

    const startOverlay = document.getElementById('start-overlay');
    const startBtn     = document.getElementById('start-btn');
    const videoElement = document.getElementById('input_video');
    const pipCanvas    = document.getElementById('pip_canvas');
    const pipCtx       = pipCanvas.getContext('2d');

    // Managers
    const gunManager    = new window.GunManager();
    const effectManager = new window.EffectManager();

    effectManager.updateGunDisplay(gunManager.currentGun);
    effectManager.setStatus('none');

    // ── Boot Three.js + 3D scene (synchronous — Three.js already loaded) ──
    let gunScene = null;
    try {
        window._initGun3D();
        gunScene = window._gunScene;
        if (gunScene) gunScene.loadGun(gunManager.currentGunKey);
    } catch (e) {
        console.error('3D scene init failed:', e);
    }

    // Hide legacy <img> gun — 3D canvas takes over
    const legacyImg = document.getElementById('gun-image');
    if (legacyImg) legacyImg.style.display = 'none';

    let gestureController = null;
    let systemInitialized = false;

    // ── AudioContext unlock (MUST be inside a user-gesture handler) ────────
    let audioCtx = null;
    function unlockAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    // ── Start System ───────────────────────────────────────────────────────
    const initializeSystem = async () => {
        if (systemInitialized) return;
        unlockAudio();

        startBtn.textContent = 'CONNECTING...';
        startBtn.disabled    = true;

        try {
            gestureController = new window.GestureController(
                videoElement, handleFire, handleGestureUpdate
            );
            await gestureController.start();

            systemInitialized = true;
            startOverlay.style.opacity = '0';
            setTimeout(() => { startOverlay.style.display = 'none'; }, 500);

            effectManager.setCameraStatus(true);
            effectManager.setStatus('gesture');

        } catch (err) {
            console.error('Initialization failed:', err);
            startBtn.textContent = 'RETRY';
            startBtn.disabled    = false;
            effectManager.setStatus('error');
            effectManager.setCameraStatus(false);
            alert('Camera access is required. Please allow camera and try again.');
        }
    };

    startBtn.addEventListener('click', initializeSystem);

    // ── Gun Card Selection ─────────────────────────────────────────────────
    document.querySelectorAll('.gun-card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.getAttribute('data-gun');
            if (gunManager.setGun(key)) {
                document.querySelectorAll('.gun-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                effectManager.updateGunDisplay(gunManager.currentGun);
                if (gunScene) gunScene.loadGun(key);
            }
        });
    });

    // ── Fire Handler ───────────────────────────────────────────────────────
    function handleFire() {
        if (gunManager.canFire()) {
            const gun = gunManager.fire();
            if (!gun) return;
            if (gunScene) gunScene.fire();
            effectManager.playFireEffect(gun);
        }
    }

    // ── Per-Frame PIP canvas draw ──────────────────────────────────────────
    function handleGestureUpdate(results) {
        pipCtx.fillStyle = '#0a0b0e';
        pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmarks of results.multiHandLandmarks) {
                const pts = landmarks.map(l => ({
                    x: (1 - l.x) * pipCanvas.width,
                    y: l.y * pipCanvas.height
                }));

                const connections = [
                    [0,1],[1,2],[2,3],[3,4],
                    [0,5],[5,6],[6,7],[7,8],
                    [5,9],[9,10],[10,11],[11,12],
                    [9,13],[13,14],[14,15],[15,16],
                    [13,17],[17,18],[18,19],[19,20],
                    [0,17]
                ];

                pipCtx.save();
                pipCtx.strokeStyle = 'rgba(232,160,32,0.75)';
                pipCtx.lineWidth = 1;
                pipCtx.beginPath();
                for (const [a, b] of connections) {
                    pipCtx.moveTo(pts[a].x, pts[a].y);
                    pipCtx.lineTo(pts[b].x, pts[b].y);
                }
                pipCtx.stroke();

                pts.forEach((p, i) => {
                    pipCtx.fillStyle = i === 8 ? '#ff4d1c' : '#e8a020';
                    pipCtx.beginPath();
                    pipCtx.arc(p.x, p.y, i === 0 ? 2.5 : 1.5, 0, Math.PI * 2);
                    pipCtx.fill();
                });
                pipCtx.restore();
            }

            effectManager.setStatus(
                gestureController && gestureController.isGunGesture ? 'ready' : 'gesture'
            );
        } else {
            effectManager.setStatus('none');
        }
    }
});