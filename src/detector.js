/**
 * Brightness detection engine using Screen Capture API.
 * Samples the player region and recommends optimal filter mode + intensity
 * to hold perceived brightness near the user's target.
 */

const SAMPLE_SIZE = 8;
const ATTACK_ALPHA = 0.15;       // EMA factor when luminance increases (smooth tracking)
const DECAY_ALPHA = 0.05;        // EMA factor when luminance decreases (slow release)
const MODE_CHANGE_COOLDOWN = 15; // ~500ms cooldown on mode transitions
const MAX_INTENSITY_STEP = 3;    // Cap intensity change per recommendation cycle

/**
 * Check if the Screen Capture API is available.
 * @returns {boolean}
 */
export function isDetectorSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

/**
 * Initialize the brightness detector.
 * @param {{ onFilterRecommend: Function, onError: Function, onStatusChange: Function, threshold?: number }} callbacks
 * @returns {{ start: Function, stop: Function, isActive: Function, destroy: Function, setThreshold: Function }}
 */
export function initDetector({ onFilterRecommend, onError, onStatusChange, threshold: initialThreshold = 50 }) {
  let stream = null;
  let captureVideo = null;
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let active = false;
  let destroyed = false;
  let lastFrameTime = -1;
  let cooldown = 0;

  // Configurable target brightness
  let threshold = initialThreshold;

  // EMA state
  let smoothLuminance = -1;
  let lastRecommendation = null;

  function cleanup() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (captureVideo) {
      captureVideo.srcObject = null;
      captureVideo.remove();
      captureVideo = null;
    }
    canvas = null;
    ctx = null;
    active = false;
    smoothLuminance = -1;
    lastRecommendation = null;
    lastFrameTime = -1;
    cooldown = 0;
  }

  /**
   * Detect capture type from stream dimensions and compute the player region
   * coordinates within the capture frame.
   *
   * - Tab capture: capture ≈ viewport size → direct mapping
   * - Window capture (Firefox/PipeWire): capture ≈ window outer size → offset by browser chrome
   * - Screen capture: capture ≈ screen size → offset by window position + chrome
   */
  function getPlayerRegion(captureW, captureH) {
    const wrapper = document.getElementById('player-wrapper');
    if (!wrapper) return null;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const outerW = window.outerWidth;
    const outerH = window.outerHeight;
    const chromeH = outerH - viewportH; // browser toolbar height
    const chromeW = outerW - viewportW; // side chrome (usually 0)

    // Heuristic: compare capture dimensions to known references
    // Allow ±100px tolerance for rounding and scrollbar differences
    const TOL = 100;
    const capMatchesViewport =
      Math.abs(captureW - viewportW * dpr) < TOL &&
      Math.abs(captureH - viewportH * dpr) < TOL;
    const capMatchesWindow =
      Math.abs(captureW - outerW * dpr) < TOL &&
      Math.abs(captureH - outerH * dpr) < TOL;
    const capMatchesScreen =
      Math.abs(captureW - screen.width * dpr) < TOL &&
      Math.abs(captureH - screen.height * dpr) < TOL;

    let sx, sy, sw, sh;

    if (capMatchesViewport) {
      // Tab capture — viewport maps 1:1 to capture frame
      sx = rect.left / viewportW * captureW;
      sy = rect.top / viewportH * captureH;
      sw = rect.width / viewportW * captureW;
      sh = rect.height / viewportH * captureH;
    } else if (capMatchesWindow) {
      // Window capture (Firefox/PipeWire) — need to offset for browser chrome
      const contentX = chromeW / 2; // side chrome, usually 0
      const contentY = chromeH;     // toolbar height at top
      sx = (contentX + rect.left) / outerW * captureW;
      sy = (contentY + rect.top) / outerH * captureH;
      sw = rect.width / outerW * captureW;
      sh = rect.height / outerH * captureH;
    } else if (capMatchesScreen) {
      // Screen capture — offset by window position on screen + chrome
      const winX = window.screenX;
      const winY = window.screenY;
      sx = (winX + chromeW / 2 + rect.left) / screen.width * captureW;
      sy = (winY + chromeH + rect.top) / screen.height * captureH;
      sw = rect.width / screen.width * captureW;
      sh = rect.height / screen.height * captureH;
    } else {
      // Unknown dimensions — just sample the center 50% of the capture frame
      // to avoid chrome/edges
      sx = captureW * 0.25;
      sy = captureH * 0.25;
      sw = captureW * 0.5;
      sh = captureH * 0.5;
    }

    return {
      sx: Math.round(Math.max(0, sx)),
      sy: Math.round(Math.max(0, sy)),
      sw: Math.round(Math.min(sw, captureW - sx)),
      sh: Math.round(Math.min(sh, captureH - sy)),
    };
  }

  function sampleBrightness() {
    if (!captureVideo || !ctx || captureVideo.readyState < 2) return null;

    const captureW = captureVideo.videoWidth;
    const captureH = captureVideo.videoHeight;
    if (!captureW || !captureH) return null;

    const region = getPlayerRegion(captureW, captureH);
    if (!region || region.sw <= 0 || region.sh <= 0) return null;

    try {
      ctx.drawImage(
        captureVideo,
        region.sx, region.sy, region.sw, region.sh,
        0, 0, SAMPLE_SIZE, SAMPLE_SIZE
      );
    } catch {
      return null;
    }

    const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const data = imageData.data;
    let totalLuminance = 0;
    const pixelCount = SAMPLE_SIZE * SAMPLE_SIZE;

    for (let i = 0; i < data.length; i += 4) {
      totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // No compensation needed: tab capture (preferCurrentTab) returns the
    // original video pixels before CSS filters are composited, so the raw
    // luminance already reflects the true content brightness.
    return totalLuminance / pixelCount;
  }

  /**
   * Given smoothed luminance and target, compute optimal filter recommendation.
   * Returns null (no filter needed), or { mode, intensity }.
   */
  function computeRecommendation(smoothL, target) {
    if (smoothL <= target) return null;

    // Try Simple Dim first: perceived ≈ L × (1 - 0.7 × t/100)
    const dimIntensity = Math.min(100, Math.round((1 - target / smoothL) / 0.7 * 100));
    const dimPerceived = smoothL * (1 - 0.7 * dimIntensity / 100);

    if (dimIntensity <= 100 && Math.abs(dimPerceived - target) < 3) {
      return { mode: 'simpleDim', intensity: dimIntensity };
    }

    // Simple Dim can't reach target — compare with Dark Invert if L > 127.5
    if (smoothL > 127.5) {
      const invertIntensity = Math.min(100, Math.max(0,
        Math.round((target - smoothL) / (255 - 2 * smoothL) * 100)
      ));
      const invertPerceived = smoothL + (255 - 2 * smoothL) * invertIntensity / 100;

      if (Math.abs(invertPerceived - target) < Math.abs(dimPerceived - target)) {
        return { mode: 'darkInvert', intensity: invertIntensity };
      }
    }

    // Best effort: Simple Dim at max
    return { mode: 'simpleDim', intensity: 100 };
  }

  function tick() {
    if (!active || !captureVideo) return; // terminal — stops loop

    // Frame dedup: skip if capture stream hasn't produced a new frame
    if (captureVideo.currentTime === lastFrameTime) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    lastFrameTime = captureVideo.currentTime;

    // Cooldown: skip sampling while CSS filter propagates through capture pipeline
    if (cooldown > 0) {
      cooldown--;
      rafId = requestAnimationFrame(tick);
      return;
    }

    const luminance = sampleBrightness();
    if (luminance === null) {
      onStatusChange('active:--');
      rafId = requestAnimationFrame(tick);
      return;
    }

    // Update EMA with asymmetric attack/decay
    const alpha = luminance > smoothLuminance ? ATTACK_ALPHA : DECAY_ALPHA;
    smoothLuminance = smoothLuminance < 0 ? luminance : alpha * luminance + (1 - alpha) * smoothLuminance;

    // Report smoothed luminance
    onStatusChange('active:' + Math.round(smoothLuminance));

    // Compute optimal filter recommendation
    let rec = computeRecommendation(smoothLuminance, threshold);

    // Check if recommendation changed materially
    const modeChanged = (rec === null) !== (lastRecommendation === null) ||
      (rec && lastRecommendation && rec.mode !== lastRecommendation.mode);
    const intensityChanged = rec && lastRecommendation &&
      rec.mode === lastRecommendation.mode &&
      Math.abs(rec.intensity - lastRecommendation.intensity) > 5;

    if (modeChanged || intensityChanged) {
      // Rate-limit intensity changes to prevent sudden jumps
      if (rec && lastRecommendation && rec.mode === lastRecommendation.mode) {
        const delta = rec.intensity - lastRecommendation.intensity;
        if (Math.abs(delta) > MAX_INTENSITY_STEP) {
          rec = { ...rec, intensity: lastRecommendation.intensity + Math.sign(delta) * MAX_INTENSITY_STEP };
        }
      }
      lastRecommendation = rec;
      if (modeChanged) cooldown = MODE_CHANGE_COOLDOWN;
      onFilterRecommend(rec);
    }

    rafId = requestAnimationFrame(tick);
  }

  async function acquireStream() {
    // Chrome 109+: preferCurrentTab auto-selects the current tab (no picker).
    // Firefox/Safari: ignore preferCurrentTab and show their native picker.
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
      preferCurrentTab: true,
    });
  }

  async function start() {
    if (active || destroyed) return;

    try {
      onStatusChange('pending');
      stream = await acquireStream();

      // Validate capture type if the browser reports it
      const track = stream.getVideoTracks()[0];
      const trackSettings = track.getSettings();
      if (trackSettings.displaySurface && trackSettings.displaySurface !== 'browser') {
        // Allow window/monitor — coordinate mapping handles it
      }

      // Create hidden video element to receive the capture stream
      captureVideo = document.createElement('video');
      captureVideo.setAttribute('playsinline', '');
      captureVideo.muted = true;
      captureVideo.style.position = 'fixed';
      captureVideo.style.top = '-9999px';
      captureVideo.style.width = '1px';
      captureVideo.style.height = '1px';
      captureVideo.style.opacity = '0';
      captureVideo.style.pointerEvents = 'none';
      document.body.appendChild(captureVideo);
      captureVideo.srcObject = stream;

      // Explicitly play and wait for video to be ready — Firefox won't
      // autoplay hidden video elements reliably
      await captureVideo.play();
      await new Promise((resolve) => {
        if (captureVideo.readyState >= 2) {
          resolve();
        } else {
          captureVideo.addEventListener('loadeddata', resolve, { once: true });
        }
      });

      // Create offscreen canvas for sampling
      canvas = document.createElement('canvas');
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Listen for stream ending (user clicks "Stop sharing")
      track.addEventListener('ended', () => {
        cleanup();
        onStatusChange('');
        onError(new Error('Screen sharing stopped'));
      });

      active = true;
      onStatusChange('active');

      // Start rAF loop — self-scheduling via requestAnimationFrame
      tick();
    } catch (err) {
      cleanup();
      onError(err);
    }
  }

  function stop() {
    cleanup();
    onStatusChange('');
  }

  return {
    start,
    stop,
    isActive() { return active; },
    setThreshold(n) { threshold = n; },
    destroy() {
      destroyed = true;
      cleanup();
    },
  };
}
