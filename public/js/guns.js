// ─────────────────────────────────────────────────────────
//  GUN DATA  (audio objects are created lazily on first use
//  to avoid browser autoplay policy blocking preloaded audio)
// ─────────────────────────────────────────────────────────

const GUN_DATA = {
    'desert-eagle': {
        name:     'Desert Eagle',
        image:    'images/deagle.png',
        sound:    'sounds/deagle.mp3',
        fireRate: 0,      // 0 = semi-auto (uses 250 ms cooldown)
        recoil:   1.0,
        volume:   0.8,
        _audio:   null
    },
    'magnum': {
        name:     'Magnum Revolver',
        image:    'images/magnum.png',
        sound:    'sounds/magnum.mp3',
        fireRate: 500,
        recoil:   1.2,
        volume:   0.9,
        _audio:   null
    },
    'ak-47': {
        name:     'AK-47',
        image:    'images/ak47.png',
        sound:    'sounds/ak47.mp3',
        fireRate: 150,
        recoil:   0.8,
        volume:   0.7,
        _audio:   null
    },
    'ump': {
        name:     'UMP SMG',
        image:    'images/ump.png',
        sound:    'sounds/ump.mp3',
        fireRate: 100,
        recoil:   0.5,
        volume:   0.6,
        _audio:   null
    },
    'spas-12': {
        name:     'SPAS-12 Shotgun',
        image:    'images/shotgun.png',
        sound:    'sounds/shotgun.mp3',
        fireRate: 0,
        recoil:   1.5,
        volume:   1.0,
        _audio:   null
    }
};

// Lazy audio getter
Object.defineProperty(GUN_DATA['desert-eagle'], 'audio', { get() { return this._audio || (this._audio = new Audio(this.sound)); } });
Object.defineProperty(GUN_DATA['magnum'],        'audio', { get() { return this._audio || (this._audio = new Audio(this.sound)); } });
Object.defineProperty(GUN_DATA['ak-47'],         'audio', { get() { return this._audio || (this._audio = new Audio(this.sound)); } });
Object.defineProperty(GUN_DATA['ump'],           'audio', { get() { return this._audio || (this._audio = new Audio(this.sound)); } });
Object.defineProperty(GUN_DATA['spas-12'],       'audio', { get() { return this._audio || (this._audio = new Audio(this.sound)); } });

// ─────────────────────────────────────────────────────────
//  GUN MANAGER
// ─────────────────────────────────────────────────────────

class GunManager {
    constructor() {
        this.currentGunKey = 'desert-eagle';
        this.currentGun    = GUN_DATA[this.currentGunKey];
        this.lastFireTime  = 0;
    }

    setGun(key) {
        if (GUN_DATA[key]) {
            this.currentGunKey = key;
            this.currentGun    = GUN_DATA[key];
            return true;
        }
        return false;
    }

    canFire() {
        const now      = Date.now();
        const cooldown = this.currentGun.fireRate > 0 ? this.currentGun.fireRate : 250;
        return (now - this.lastFireTime) > cooldown;
    }

    fire() {
        this.lastFireTime = Date.now();
        return this.currentGun;
    }
}

window.GunManager = GunManager;
window.GUN_DATA   = GUN_DATA;

// ─────────────────────────────────────────────────────────
//  LANDSCAPE ENFORCEMENT (mobile only)
// ─────────────────────────────────────────────────────────

(function () {
    function checkOrientation() {
        const overlay  = document.getElementById('landscape-overlay');
        if (!overlay) return;

        const isMobile  = window.innerWidth <= 900 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        const isPortrait = window.innerHeight > window.innerWidth;

        overlay.style.display = (isMobile && isPortrait) ? 'flex' : 'none';
    }

    // Run on load and on every resize / orientation change
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkOrientation);
    } else {
        checkOrientation();
    }

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', function () {
        // Small delay so browser finishes rotating before we measure
        setTimeout(checkOrientation, 200);
    });
})();