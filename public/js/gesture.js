class GestureController {
    constructor(videoElement, onFire, onGestureUpdate) {
        this.videoElement    = videoElement;
        this.onFire          = onFire;
        this.onGestureUpdate = onGestureUpdate;

        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        this.hands.setOptions({
            maxNumHands:            1,
            modelComplexity:        1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence:  0.5
        });
        this.hands.onResults(this.onResults.bind(this));

        this.lastX          = null;
        this.lastY          = null;
        this.shakeThreshold = 0.04;
        this.fireCooldown   = false;
        this.fireCooldownMs = 200;
        this.isGunGesture   = false;
    }

    _isExtended(lm, tip, pip) {
        return lm[tip].y < lm[pip].y;
    }

    _isCurled(lm, tip, mcp) {
        return lm[tip].y > lm[mcp].y;
    }

    // Finger-gun: index extended, thumb out, middle+ring+pinky curled
    _isFingerGun(lm) {
        const indexUp    = this._isExtended(lm, 8, 6);
        const middleDown = this._isCurled(lm, 12, 9);
        const ringDown   = this._isCurled(lm, 16, 13);
        const pinkyDown  = this._isCurled(lm, 20, 17);
        // Thumb spread sideways from index MCP
        const thumbSpread = Math.abs(lm[4].x - lm[5].x) > 0.06;

        return indexUp && middleDown && ringDown && pinkyDown && thumbSpread;
    }

    onResults(results) {
        this.onGestureUpdate(results);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const lm = results.multiHandLandmarks[0];
            this.isGunGesture = this._isFingerGun(lm);

            if (this.isGunGesture) {
                const currentX = lm[8].x; // track index fingertip
                const currentY = lm[8].y;

                if (this.lastX === null) {
                    this.lastX = currentX;
                    this.lastY = currentY;
                    return;
                }

                const deltaX = currentX - this.lastX;
                const deltaY = currentY - this.lastY;
                const fast   = Math.abs(deltaX) > this.shakeThreshold
                            || Math.abs(deltaY) > this.shakeThreshold;

                if (fast && !this.fireCooldown) {
                    this.onFire();
                    this.fireCooldown = true;
                    setTimeout(() => { this.fireCooldown = false; }, this.fireCooldownMs);
                }

                this.lastX = currentX;
                this.lastY = currentY;
            } else {
                this._resetTracking();
            }
        } else {
            this.isGunGesture = false;
            this._resetTracking();
        }
    }

    _resetTracking() {
        this.lastX = null;
        this.lastY = null;
    }

    async start() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });
        this.videoElement.srcObject = stream;

        const camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 640, height: 480
        });
        return camera.start();
    }
}

window.GestureController = GestureController;