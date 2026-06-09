class EffectManager {
    constructor() {
        this.muzzleFlash   = document.getElementById('muzzle-flash');
        this.gameContainer = document.getElementById('game-container');
        this.shotCounter   = document.getElementById('shot-counter');
        this.statusPip     = document.querySelector('.status-pip');
        this.statusText    = document.getElementById('status-text');
        this.camDot        = document.getElementById('cam-status-dot');
        this.camLabel      = document.getElementById('cam-status-label');
        this.hudRecoil     = document.getElementById('hud-recoil');
        this.hudFirerate   = document.getElementById('hud-firerate');
        this.hitOverlay    = document.getElementById('hit-overlay');
        this.totalShots    = 0;
    }

    playFireEffect(gun) {
        // 1. Muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.classList.remove('flash-active');
            void this.muzzleFlash.offsetWidth;
            this.muzzleFlash.classList.add('flash-active');
        }

        // 2. Hit overlay flash
        if (this.hitOverlay) {
            this.hitOverlay.classList.remove('hit-flash');
            void this.hitOverlay.offsetWidth;
            this.hitOverlay.classList.add('hit-flash');
        }

        // 3. Screen shake
        if (this.gameContainer) {
            this.gameContainer.classList.remove('screen-shake');
            void this.gameContainer.offsetWidth;
            this.gameContainer.classList.add('screen-shake');
        }

        // 4. Sound — lazy Audio creation (safe, we're past the user gesture)
        try {
            const base  = gun.audio;                 // lazy getter
            const clone = base.cloneNode();
            clone.volume = gun.volume ?? 0.8;
            clone.currentTime = 0;
            const p = clone.play();
            if (p) p.catch(e => console.warn('Audio:', e));
        } catch (e) {
            console.warn('Sound error:', e);
        }

        // 5. Counter
        this.totalShots++;
        if (this.shotCounter) {
            this.shotCounter.textContent = String(this.totalShots).padStart(3, '0');
        }
    }

    // Called when switching guns (updates HUD only — 3D model switch handled in main.js)
    updateGunDisplay(gun) {
        const nameEl = document.getElementById('current-gun-name');
        if (nameEl) nameEl.textContent = gun.name.toUpperCase();

        if (this.hudRecoil)   this.hudRecoil.textContent = gun.recoil.toFixed(1) + 'x';
        if (this.hudFirerate) {
            this.hudFirerate.textContent = gun.fireRate > 0
                ? Math.round(60000 / gun.fireRate) + ' RPM'
                : 'SEMI';
        }
    }

    setStatus(state) {
        if (!this.statusPip || !this.statusText) return;
        this.statusPip.className = 'status-pip';
        switch (state) {
            case 'ready':
                this.statusPip.classList.add('ready');
                this.statusText.textContent = 'READY TO FIRE';
                this.statusText.style.color = 'var(--green)';
                break;
            case 'gesture':
                this.statusPip.classList.add('gesture');
                this.statusText.textContent = 'FORM A GUN GESTURE';
                this.statusText.style.color = 'var(--accent)';
                break;
            case 'error':
                this.statusPip.classList.add('error');
                this.statusText.textContent = 'CAMERA ERROR';
                this.statusText.style.color = 'var(--red)';
                break;
            default:
                this.statusText.textContent = 'HAND NOT DETECTED';
                this.statusText.style.color = 'var(--text-dim)';
        }
    }

    setCameraStatus(live) {
        if (!this.camDot || !this.camLabel) return;
        if (live) {
            this.camDot.className     = 'status-dot live';
            this.camLabel.textContent = 'CAMERA LIVE';
        } else {
            this.camDot.className     = 'status-dot error';
            this.camLabel.textContent = 'CAMERA ERROR';
        }
    }
}

window.EffectManager = EffectManager;