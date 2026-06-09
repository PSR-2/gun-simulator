/**
 * gun3d.js — Three.js 3D gun renderer using GLB models
 * Requires Three.js 0.128.0 + GLTFLoader 0.128.0 loaded in index.html before this file.
 * GLTFLoader at 0.128.0 attaches to THREE.GLTFLoader via the examples/js build.
 */

(function () {
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class GunScene {
    constructor(container) {
        this.container  = container;
        this.scene      = null;
        this.camera     = null;
        this.renderer   = null;
        this.gunRoot    = null;
        this.clock      = new THREE.Clock();
        this.firing     = false;
        this.fireTimer  = 0;
        this.currentKey = null;
        this.loader     = null;
        this.isLoading  = false;

        this._configs = {
            'desert-eagle': {
                file: 'deagle.glb',
                scale: 1.2,
                modelRot:  [0, 0, 0],
                pos:   [0.05, -0.22, 0.0],
                rot:   [0.05, 0.0, -0.04],
                recoilRot:  0.22,
                recoilLift: 0.065
            },
            'magnum': {
                file: 'magnum.glb',
                scale: 1.2,
                modelRot:  [0, 0, 0],
                pos:   [0.05, -0.22, 0.0],
                rot:   [0.05, 0.0, -0.04],
                recoilRot:  0.26,
                recoilLift: 0.075
            },
            'ak-47': {
                file: 'ak47.glb',
                scale: 1.2,
                modelRot:  [0, Math.PI, 0],
                pos:   [0.0, -0.20, 0.0],
                rot:   [0.03, 0.0, -0.02],
                recoilRot:  0.10,
                recoilLift: 0.030
            },
            'ump': {
                file: 'ump.glb',
                scale: 1.2,
                modelRot:  [0, 0, 0],
                pos:   [0.0, -0.22, 0.0],
                rot:   [0.03, 0.0, -0.02],
                recoilRot:  0.09,
                recoilLift: 0.022
            },
            'spas-12': {
                file: 'spas12.glb',
                scale: 1.2,
                modelRot:  [0, 0, 0],
                pos:   [0.0, -0.20, 0.0],
                rot:   [0.03, 0.0, -0.02],
                recoilRot:  0.28,
                recoilLift: 0.090
            }
        };

        this._basePos = null;
        this._baseRot = null;
    }

    init() {
        const W = this.container.clientWidth  || 640;
        const H = this.container.clientHeight || 480;

        this.scene = new THREE.Scene();
        this.scene.background = null;

        this.camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 100);
        this.camera.position.set(0, 0, 2.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(W, H);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.6;

        const canvas = this.renderer.domElement;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;';
        this.container.appendChild(canvas);

        // Studio lighting
        this.scene.add(new THREE.AmbientLight(0x8899bb, 0.5));

        const key = new THREE.DirectionalLight(0xfff8f0, 3.5);
        key.position.set(-2, 4, 3);
        key.castShadow = true;
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0xc8deff, 1.0);
        fill.position.set(4, 1, 2);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 2.0);
        rim.position.set(2, 3, -4);
        this.scene.add(rim);

        const bounce = new THREE.DirectionalLight(0x5577cc, 0.4);
        bounce.position.set(0, -3, 2);
        this.scene.add(bounce);

        const front = new THREE.DirectionalLight(0xddeeff, 0.5);
        front.position.set(0, 0, 5);
        this.scene.add(front);

        this.loader = new THREE.GLTFLoader();

        // Resize: handles both window resize and orientation change
        window.addEventListener('resize', () => this._onResize());
        window.addEventListener('orientationchange', () => {
            // Small delay to let browser finish rotating before measuring
            setTimeout(() => this._onResize(), 200);
        });

        this._animate();
    }

    loadGun(key) {
        if (this.currentKey === key || this.isLoading) return;
        this.currentKey = key;

        const cfg = this._configs[key];
        if (!cfg) return;

        this.isLoading = true;
        this._showLoader(true);

        if (this.gunRoot) {
            this.scene.remove(this.gunRoot);
            this.gunRoot.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
                    else o.material.dispose();
                }
            });
            this.gunRoot = null;
        }

        const modelPath = `/models/${cfg.file}`;

        this.loader.load(
            modelPath,
            (gltf) => {
                const model = gltf.scene;

                model.traverse(o => {
                    if (o.isMesh) {
                        o.castShadow    = true;
                        o.receiveShadow = true;
                        if (o.material) {
                            const mats = Array.isArray(o.material) ? o.material : [o.material];
                            mats.forEach(mat => {
                                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                                    mat.envMapIntensity = 1.2;
                                    mat.needsUpdate = true;
                                }
                            });
                        }
                    }
                });

                model.rotation.set(0, 0, 0);
                model.scale.setScalar(1);
                model.position.set(0, 0, 0);
                model.updateMatrixWorld(true);

                const rawBox  = new THREE.Box3().setFromObject(model);
                const rawSize = new THREE.Vector3();
                rawBox.getSize(rawSize);

                const ax = rawSize.x, ay = rawSize.y, az = rawSize.z;
                const longest = Math.max(ax, ay, az);

                if (longest === ay) {
                    model.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
                } else if (longest === az) {
                    model.rotation.set(0, Math.PI / 2, 0);
                } else {
                    model.rotation.set(0, Math.PI, 0);
                }

                model.rotation.x += cfg.modelRot[0];
                model.rotation.y += cfg.modelRot[1];
                model.rotation.z += cfg.modelRot[2];

                model.updateMatrixWorld(true);

                const box3 = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box3.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const autoScale = (1.0 / maxDim) * cfg.scale;
                model.scale.setScalar(autoScale);

                box3.setFromObject(model);
                const center = new THREE.Vector3();
                box3.getCenter(center);
                model.position.sub(center);

                model.position.x += cfg.pos[0];
                model.position.y += cfg.pos[1];
                model.position.z += cfg.pos[2];

                model.rotation.x += cfg.rot[0];
                model.rotation.z += cfg.rot[2];

                this._basePos = { x: model.position.x, y: model.position.y, z: model.position.z };
                this._baseRot = { x: model.rotation.x, y: model.rotation.y, z: model.rotation.z };

                this.gunRoot  = model;
                this.scene.add(model);
                this.isLoading = false;
                this._showLoader(false);
            },
            undefined,
            (error) => {
                console.error(`gun3d: Failed to load ${cfg.file}`, error);
                this.isLoading = false;
                this._showLoader(false);
            }
        );
    }

    fire() {
        if (!this.firing) {
            this.firing    = true;
            this.fireTimer = 0;
        }
    }

    _showLoader(show) {
        let el = document.getElementById('gun3d-loader');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gun3d-loader';
            el.style.cssText = `
                position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
                color:#ff9900; font-family:Orbitron,monospace; font-size:12px;
                letter-spacing:2px; z-index:20; pointer-events:none;
                text-shadow: 0 0 8px #ff9900;
            `;
            el.textContent = 'LOADING WEAPON...';
            this.container.appendChild(el);
        }
        el.style.display = show ? 'block' : 'none';
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        const dt = this.clock.getDelta();
        const t  = this.clock.getElapsedTime();

        if (!this.gunRoot) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Idle sway
        this.gunRoot.position.y = this._basePos.y + Math.sin(t * 1.1) * 0.0015;
        this.gunRoot.position.x = this._basePos.x + Math.sin(t * 0.7) * 0.0008;

        if (this.firing) {
            this.fireTimer += dt;
            const p    = Math.min(this.fireTimer / 0.12, 1.0);
            const kick = Math.sin(p * Math.PI);
            const cfg  = this._configs[this.currentKey];

            this.gunRoot.rotation.z = this._baseRot.z - kick * cfg.recoilRot;
            this.gunRoot.position.y = this._basePos.y + kick * cfg.recoilLift;
            this.gunRoot.position.x = this._basePos.x + kick * 0.012;

            if (this.fireTimer >= 0.22) {
                this.firing    = false;
                this.fireTimer = 0;
                this.gunRoot.rotation.set(this._baseRot.x, this._baseRot.y, this._baseRot.z);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        const W = this.container.clientWidth;
        const H = this.container.clientHeight;
        if (W === 0 || H === 0) return;
        this.camera.aspect = W / H;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(W, H);
    }
}

window.GunScene = GunScene;

window._initGun3D = function () {
    if (typeof THREE === 'undefined') {
        console.error('gun3d: THREE not defined — check script order in index.html');
        return;
    }
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('gun3d: GLTFLoader not loaded — add GLTFLoader script in index.html');
        return;
    }
    const container = document.getElementById('game-container');
    if (!container) {
        console.error('gun3d: #game-container not found');
        return;
    }
    const scene = new GunScene(container);
    scene.init();
    window._gunScene = scene;
};

})();