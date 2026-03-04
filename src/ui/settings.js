import { applyFilter } from '../processor.js';
import { saveSettings, loadSettings, clearSettings } from '../utils/storage.js';
import { initDetector, isDetectorSupported } from '../detector.js';

const VALID_MODES = ['simpleDim', 'reduceGlare', 'darkInvert', 'nightWarm'];
const DEFAULTS = { intensity: 50, mode: 'simpleDim', auto: false, autoDetect: false, detectThreshold: 50 };

const MODE_HINTS = {
  simpleDim: 'Uniform darkening — good for general viewing.',
  reduceGlare: 'Bright areas darken more than dark areas.',
  darkInvert: 'Inverts colors — turns white backgrounds dark.',
  nightWarm: 'Warm amber tint for comfortable night viewing.',
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
        <label for="intensity-slider">Intensity: <span id="intensity-value">${settings.intensity}%</span></label>
        <input type="range" id="intensity-slider" min="0" max="100" step="1" value="${settings.intensity}">
      </div>

      <div class="settings-group">
        <label>Filter Mode</label>
        <div class="mode-selector">
          <button type="button" class="mode-btn${settings.mode === 'simpleDim' ? ' active' : ''}" data-mode="simpleDim">Simple Dim</button>
          <button type="button" class="mode-btn${settings.mode === 'reduceGlare' ? ' active' : ''}" data-mode="reduceGlare">Reduce Glare</button>
          <button type="button" class="mode-btn${settings.mode === 'darkInvert' ? ' active' : ''}" data-mode="darkInvert">Dark Invert</button>
          <button type="button" class="mode-btn${settings.mode === 'nightWarm' ? ' active' : ''}" data-mode="nightWarm">Night Warm</button>
        </div>
        <p class="mode-hint" id="mode-hint">${MODE_HINTS[settings.mode]}</p>
      </div>

      <div class="settings-group">
        <div class="toggle-wrap">
          <label for="auto-toggle">Auto (match system theme)</label>
          <label class="toggle">
            <input type="checkbox" id="auto-toggle" ${settings.auto ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
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
        <p class="mode-hint">Adjusts filter to hold brightness near target. Requires screen sharing permission.</p>
        <div class="threshold-slider-wrap" id="threshold-slider-wrap" style="display:${settings.autoDetect ? 'block' : 'none'}">
          <label for="detect-threshold">Target: <span id="threshold-value">${settings.detectThreshold}</span></label>
          <input type="range" id="detect-threshold" min="10" max="200" step="5" value="${settings.detectThreshold}">
        </div>
      </div>
      ` : ''}

      <button type="button" class="settings-reset">Reset to Defaults</button>
    </div>
  `;

  // Element references
  const slider = container.querySelector('#intensity-slider');
  const valueLabel = container.querySelector('#intensity-value');
  const modeButtons = container.querySelectorAll('.mode-btn');
  const modeHint = container.querySelector('#mode-hint');
  const autoToggle = container.querySelector('#auto-toggle');
  const autoDetectToggle = container.querySelector('#auto-detect-toggle');
  const autoDetectStatus = container.querySelector('#auto-detect-status');
  const thresholdSlider = container.querySelector('#detect-threshold');
  const thresholdValue = container.querySelector('#threshold-value');
  const thresholdWrap = container.querySelector('#threshold-slider-wrap');
  const resetBtn = container.querySelector('.settings-reset');

  // Dark mode media query
  const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

  // Auto-detect state
  let savedBeforeDetect = null; // { mode, intensity } saved when auto-detect activates
  let detector = null;

  if (isDetectorSupported()) {
    detector = initDetector({
      threshold: settings.detectThreshold,
      onFilterRecommend(rec) {
        if (rec) {
          // Save original settings before first auto-adjustment
          if (!savedBeforeDetect) {
            savedBeforeDetect = { mode: settings.mode, intensity: settings.intensity };
          }
          settings.mode = rec.mode;
          settings.intensity = rec.intensity;
          updateSliderUI();
          modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === settings.mode));
          updateModeHint();
          applyFilter(settings.mode, settings.intensity);
          // Only save on mode changes, not every intensity tweak
          if (!savedBeforeDetect || savedBeforeDetect.mode !== rec.mode) {
            saveSettings(settings);
          }
        } else {
          // No filter needed — restore original settings
          if (savedBeforeDetect) {
            settings.mode = savedBeforeDetect.mode;
            settings.intensity = savedBeforeDetect.intensity;
            savedBeforeDetect = null;
          }
          updateSliderUI();
          modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === settings.mode));
          updateModeHint();
          applyFilter(settings.mode, settings.intensity);
          saveSettings(settings);
        }
      },
      onError() {
        if (autoDetectToggle) autoDetectToggle.checked = false;
        settings.autoDetect = false;
        savedBeforeDetect = null;
        saveSettings(settings);
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
    savedBeforeDetect = null;
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

  function applyAutoIntensity() {
    if (!settings.auto) return;
    settings.intensity = darkMQ.matches ? 40 : 60;
    updateSliderUI();
    emitChange();
  }

  // Slider input
  function onSliderInput() {
    disableAutoDetect();
    settings.intensity = Number(slider.value);
    valueLabel.textContent = settings.intensity + '%';
    emitChange();
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

  // Auto toggle
  function onAutoChange() {
    settings.auto = autoToggle.checked;
    slider.disabled = settings.auto;
    if (settings.auto) {
      applyAutoIntensity();
    } else {
      emitChange();
    }
  }

  // System theme change
  function onSystemThemeChange() {
    applyAutoIntensity();
  }

  // Auto-detect toggle
  function onAutoDetectChange() {
    settings.autoDetect = autoDetectToggle.checked;
    saveSettings(settings);
    if (thresholdWrap) thresholdWrap.style.display = settings.autoDetect ? 'block' : 'none';
    if (settings.autoDetect && detector) {
      // Preemptively apply Simple Dim at 50% while waiting for screen
      // sharing approval. The controller's first recommendation (~33ms
      // after capture starts) takes over with the precise filter.
      if (!savedBeforeDetect) {
        savedBeforeDetect = { mode: settings.mode, intensity: settings.intensity };
      }
      settings.mode = 'simpleDim';
      settings.intensity = 50;
      updateSliderUI();
      modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === 'simpleDim'));
      updateModeHint();
      applyFilter(settings.mode, settings.intensity);
      saveSettings(settings);
      detector.start();
    } else if (detector) {
      detector.stop();
      // Restore previous mode if we were in auto-detected darkInvert
      if (savedBeforeDetect) {
        settings.mode = savedBeforeDetect.mode;
        settings.intensity = savedBeforeDetect.intensity;
        savedBeforeDetect = null;
        updateSliderUI();
        modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === settings.mode));
        updateModeHint();
        emitChange();
      }
    }
  }

  function onThresholdInput() {
    settings.detectThreshold = Number(thresholdSlider.value);
    thresholdValue.textContent = settings.detectThreshold;
    if (detector) detector.setThreshold(settings.detectThreshold);
    saveSettings(settings);
  }

  // Reset
  function onReset() {
    disableAutoDetect();
    clearSettings();
    settings = { ...DEFAULTS };
    updateSliderUI();
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === settings.mode));
    updateModeHint();
    autoToggle.checked = settings.auto;
    if (autoDetectToggle) autoDetectToggle.checked = false;
    if (thresholdSlider) {
      thresholdSlider.value = DEFAULTS.detectThreshold;
      thresholdValue.textContent = DEFAULTS.detectThreshold;
      if (detector) detector.setThreshold(DEFAULTS.detectThreshold);
    }
    if (thresholdWrap) thresholdWrap.style.display = 'none';
    setAutoDetectStatus('');
    slider.disabled = false;
    emitChange();
  }

  // Wire listeners
  slider.addEventListener('input', onSliderInput);
  container.querySelector('.mode-selector').addEventListener('click', onModeClick);
  autoToggle.addEventListener('change', onAutoChange);
  if (autoDetectToggle) autoDetectToggle.addEventListener('change', onAutoDetectChange);
  if (thresholdSlider) thresholdSlider.addEventListener('input', onThresholdInput);
  resetBtn.addEventListener('click', onReset);
  darkMQ.addEventListener('change', onSystemThemeChange);

  // Initial state
  slider.disabled = settings.auto;
  if (settings.auto) applyAutoIntensity();
  else applyFilter(settings.mode, settings.intensity);

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
      autoToggle.removeEventListener('change', onAutoChange);
      if (autoDetectToggle) autoDetectToggle.removeEventListener('change', onAutoDetectChange);
      if (thresholdSlider) thresholdSlider.removeEventListener('input', onThresholdInput);
      resetBtn.removeEventListener('click', onReset);
      darkMQ.removeEventListener('change', onSystemThemeChange);
      if (detector) detector.destroy();
      container.innerHTML = '';
    },
  };
}
