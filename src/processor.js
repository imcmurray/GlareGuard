/**
 * CSS filter engine for adaptive video dimming.
 * Applies filters via overlay blend modes and direct iframe transforms.
 */

const OVERLAY_ID = 'filter-overlay';

let currentMode = null;
let currentIntensity = 0;

/**
 * Return the currently active filter state.
 * @returns {{ mode: string|null, intensity: number }}
 */
export function getActiveFilter() {
  return { mode: currentMode, intensity: currentIntensity };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Find the YouTube iframe inside the player wrapper. */
function getPlayerIframe() {
  return document.querySelector('#player-wrapper iframe');
}

/** Clear all filter-related styles from both overlay and iframe. */
function resetAll(overlay, iframe) {
  if (overlay) {
    overlay.style.filter = 'none';
    overlay.style.backgroundColor = 'transparent';
    overlay.style.mixBlendMode = '';
  }
  if (iframe) {
    iframe.style.filter = '';
  }
}

/**
 * Compute style config for a given mode and intensity.
 * @param {'simpleDim'|'darkInvert'} mode
 * @param {number} intensity 0–100
 * @returns {{ overlay: { filter: string, backgroundColor: string, mixBlendMode: string }, iframe: { filter: string } }}
 */
export function getModeConfig(mode, intensity) {
  const t = clamp(intensity, 0, 100);

  const config = {
    overlay: { filter: 'none', backgroundColor: 'transparent', mixBlendMode: '' },
    iframe: { filter: '' },
  };

  if (t === 0) return config;

  switch (mode) {
    case 'simpleDim': {
      const alpha = (t / 100) * 0.7;
      config.overlay.backgroundColor = `rgba(0, 0, 0, ${alpha})`;
      break;
    }

    case 'darkInvert': {
      const amount = t / 100;
      config.iframe.filter = `invert(${amount}) hue-rotate(${180 * amount}deg)`;
      break;
    }

  }

  return config;
}

/**
 * Apply a filter to the overlay and/or iframe.
 * @param {'simpleDim'|'darkInvert'} mode
 * @param {number} intensity 0–100
 */
export function applyFilter(mode, intensity) {
  const clamped = clamp(intensity, 0, 100);
  currentMode = mode;
  currentIntensity = clamped;

  const overlay = document.getElementById(OVERLAY_ID);
  const iframe = getPlayerIframe();

  resetAll(overlay, iframe);

  const config = getModeConfig(mode, clamped);

  if (overlay) {
    overlay.style.filter = config.overlay.filter;
    overlay.style.backgroundColor = config.overlay.backgroundColor;
    overlay.style.mixBlendMode = config.overlay.mixBlendMode;
  }

  if (iframe) {
    iframe.style.filter = config.iframe.filter;
  }
}

/**
 * Remove all filter effects from the overlay and iframe.
 */
export function removeFilter() {
  currentMode = null;
  currentIntensity = 0;
  const overlay = document.getElementById(OVERLAY_ID);
  const iframe = getPlayerIframe();
  resetAll(overlay, iframe);
}
