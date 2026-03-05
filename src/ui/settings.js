import { applyFilter } from '../processor.js';
import { saveSettings, loadSettings } from '../utils/storage.js';
import { initDetector, isDetectorSupported } from '../detector.js';

const VALID_MODES = ['simpleDim', 'darkInvert'];
const DEFAULTS = { intensity: 50, mode: 'simpleDim', autoDetect: false };

/** Map Darkness slider (0–100%) to luminance threshold (200–10). */
function darknessToThreshold(intensity) {
  return 10 + (100 - intensity) * 1.9;
}

const MODE_HINTS = {
  simpleDim: 'Uniform darkening — good for general viewing.',
  darkInvert: 'Inverts colors — turns white backgrounds dark.',
};

/**
 * Initialize the settings panel inside a container element.
 * @param {HTMLElement} container
 * @returns {{ getSettings: Function, setIntensity: Function, setMode: Function, destroy: Function }}
 */
export function initSettings(container) {
  let settings = loadSettings();

  // Render panel HTML
  container.innerHTML = `
    <div class="settings-panel">
      <div class="settings-group">
        <label for="intensity-slider">Darkness: <span id="intensity-value">${settings.intensity}%</span></label>
        <input type="range" id="intensity-slider" min="0" max="100" step="1" value="${settings.intensity}">
      </div>

      <div class="settings-group">
        <label>Filter Mode</label>
        <div class="mode-selector">
          <button type="button" class="mode-btn${settings.mode === 'simpleDim' ? ' active' : ''}" data-mode="simpleDim">Simple Dim</button>
          <button type="button" class="mode-btn${settings.mode === 'darkInvert' ? ' active' : ''}" data-mode="darkInvert">Dark Invert</button>
        </div>
        <p class="mode-hint" id="mode-hint">${MODE_HINTS[settings.mode]}</p>
      </div>

      ${isDetectorSupported() ? `
      <div class="settings-group" id="auto-detect-group">
        <div class="toggle-wrap">
          <label for="auto-detect-toggle">Auto Detect Brightness <span class="auto-detect-status" id="auto-detect-status"></span></label>
          <label class="toggle">
            <input type="checkbox" id="auto-detect-toggle" ${settings.autoDetect ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
        <p class="mode-hint">Adjusts filter to hold brightness near target. Use the Darkness slider to set the target level. Requires screen sharing permission.</p>
      </div>
      ` : ''}
    </div>
  `;

  // Element references
  const slider = container.querySelector('#intensity-slider');
  const valueLabel = container.querySelector('#intensity-value');
  const modeButtons = container.querySelectorAll('.mode-btn');
  const modeHint = container.querySelector('#mode-hint');
  const autoDetectToggle = container.querySelector('#auto-detect-toggle');
  const autoDetectStatus = container.querySelector('#auto-detect-status');

  // Auto-detect state
  let detector = null;

  if (isDetectorSupported()) {
    detector = initDetector({
      threshold: darknessToThreshold(settings.intensity),
      onFilterRecommend(rec) {
        // Detector controls the filter directly; settings.intensity stays
        // as the user's target (the slider is not moved).
        if (rec) {
          applyFilter(rec.mode, rec.intensity);
        } else {
          // Content is already below target — no dimming needed
          applyFilter(settings.mode, 0);
        }
      },
      onError() {
        if (autoDetectToggle) autoDetectToggle.checked = false;
        settings.autoDetect = false;
        saveSettings(settings);
        applyFilter(settings.mode, settings.intensity);
        setAutoDetectStatus('error');
      },
      onStatusChange(status) {
        setAutoDetectStatus(status);
      },
    });
  }

  function setAutoDetectStatus(status) {
    if (!autoDetectStatus) return;
    autoDetectStatus.className = 'auto-detect-status';
    if (status === 'pending') {
      autoDetectStatus.textContent = '(click this browser window)';
      autoDetectStatus.classList.add('status-pending');
    } else if (status.startsWith('active:')) {
      // Live luminance readout: "active:142" or "active:--"
      const lum = status.slice(7);
      autoDetectStatus.textContent = lum === '--' ? '(waiting for frames...)' : `(L:${lum})`;
      autoDetectStatus.classList.add('status-active');
    } else if (status === 'active') {
      autoDetectStatus.textContent = '(active)';
      autoDetectStatus.classList.add('status-active');
    } else if (status === 'error') {
      autoDetectStatus.textContent = '(failed)';
      autoDetectStatus.classList.add('status-error');
    } else {
      autoDetectStatus.textContent = '';
    }
  }

  function disableAutoDetect() {
    if (!detector || !settings.autoDetect) return;
    detector.stop();
    settings.autoDetect = false;
    if (autoDetectToggle) autoDetectToggle.checked = false;
    saveSettings(settings);
  }

  function emitChange() {
    applyFilter(settings.mode, settings.intensity);
    saveSettings(settings);
    document.dispatchEvent(new CustomEvent('glareguard:settingschange', { detail: { ...settings } }));
  }

  function updateSliderUI() {
    slider.value = settings.intensity;
    valueLabel.textContent = settings.intensity + '%';
  }

  function updateModeHint() {
    modeHint.textContent = MODE_HINTS[settings.mode] || '';
  }

  // Slider input
  function onSliderInput() {
    settings.intensity = Number(slider.value);
    valueLabel.textContent = settings.intensity + '%';
    if (settings.autoDetect && detector) {
      detector.setThreshold(darknessToThreshold(settings.intensity));
      saveSettings(settings);
    } else {
      emitChange();
    }
  }

  // Mode button click
  function onModeClick(e) {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    disableAutoDetect();
    settings.mode = btn.dataset.mode;
    modeButtons.forEach(b => b.classList.toggle('active', b === btn));
    updateModeHint();
    emitChange();
  }

  // Auto-detect toggle
  function onAutoDetectChange() {
    settings.autoDetect = autoDetectToggle.checked;
    saveSettings(settings);
    if (settings.autoDetect && detector) {
      detector.setThreshold(darknessToThreshold(settings.intensity));
      detector.start();
    } else if (detector) {
      detector.stop();
      // Restore user's filter settings
      emitChange();
    }
  }

  // Wire listeners
  slider.addEventListener('input', onSliderInput);
  container.querySelector('.mode-selector').addEventListener('click', onModeClick);
  if (autoDetectToggle) autoDetectToggle.addEventListener('change', onAutoDetectChange);

  // Initial state
  applyFilter(settings.mode, settings.intensity);

  // Public API
  return {
    getSettings() {
      return { ...settings };
    },
    setIntensity(n) {
      settings.intensity = Math.max(0, Math.min(100, n));
      updateSliderUI();
      emitChange();
    },
    setMode(mode) {
      if (!VALID_MODES.includes(mode)) return;
      settings.mode = mode;
      modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      updateModeHint();
      emitChange();
    },
    destroy() {
      slider.removeEventListener('input', onSliderInput);
      container.querySelector('.mode-selector').removeEventListener('click', onModeClick);
      if (autoDetectToggle) autoDetectToggle.removeEventListener('change', onAutoDetectChange);
      if (detector) detector.destroy();
      container.innerHTML = '';
    },
  };
}
