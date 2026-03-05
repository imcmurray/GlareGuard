/**
 * CSS filter engine for adaptive video dimming.
 * Applies filters via overlay blend modes and direct iframe transforms.
 */

const OVERLAY_ID = 'filter-overlay';

let currentMode = null;
let currentIntensity = 0;
let svgFiltersInjected = false;

/** Inject inline SVG with feColorMatrix filters for precise night-vision tints. */
function ensureSVGFilters() {
  if (svgFiltersInjected) return;
  svgFiltersInjected = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.innerHTML = `<defs>
    <filter id="gg-night-red" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/>
    </filter>
    <filter id="gg-night-green" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0 0.299 0.587 0.114 0 0 0 0 0 0 0 0 0 0 1 0"/>
    </filter>
  </defs>`;
  document.body.appendChild(svg);
}

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
 * All visual effects live on iframe.style.filter so they survive fullscreen.
 * @param {'simpleDim'|'darkInvert'|'nightRed'|'nightGreen'} mode
 * @param {number} intensity 0–100
 * @returns {{ overlay: { filter: string, backgroundColor: string, mixBlendMode: string }, iframe: { filter: string }, uiFilter: string }}
 */
export function getModeConfig(mode, intensity) {
  const t = clamp(intensity, 0, 100);

  const config = {
    overlay: { filter: 'none', backgroundColor: 'transparent', mixBlendMode: '' },
    iframe: { filter: '' },
    uiFilter: 'none',
    bgColor: null,
  };

  if (t === 0 && mode !== 'nightRed' && mode !== 'nightGreen') return config;

  const brightness = 1 - (t / 100) * 0.95;
  const uiBrightness = 1 - (t / 100) * 0.95;
  const bg = Math.round(10 * uiBrightness);

  switch (mode) {
    case 'simpleDim': {
      config.iframe.filter = `brightness(${brightness})`;
      config.uiFilter = `brightness(${uiBrightness})`;
      config.bgColor = `rgb(${bg}, ${bg}, ${bg})`;
      break;
    }

    case 'darkInvert': {
      const amount = t / 100;
      config.iframe.filter = `invert(${amount}) hue-rotate(${180 * amount}deg)`;
      config.uiFilter = `brightness(${uiBrightness})`;
      config.bgColor = `rgb(${bg}, ${bg}, ${bg})`;
      break;
    }

    case 'nightRed': {
      config.iframe.filter = `url(#gg-night-red) brightness(${brightness})`;
      config.uiFilter = `url(#gg-night-red) brightness(${uiBrightness})`;
      config.bgColor = `rgb(${bg}, 0, 0)`;
      break;
    }

    case 'nightGreen': {
      config.iframe.filter = `url(#gg-night-green) brightness(${brightness})`;
      config.uiFilter = `url(#gg-night-green) brightness(${uiBrightness})`;
      config.bgColor = `rgb(0, ${bg}, 0)`;
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

  if (mode === 'nightRed' || mode === 'nightGreen') ensureSVGFilters();
  const config = getModeConfig(mode, clamped);

  if (overlay) {
    overlay.style.filter = config.overlay.filter;
    overlay.style.backgroundColor = config.overlay.backgroundColor;
    overlay.style.mixBlendMode = config.overlay.mixBlendMode;
  }

  if (iframe) {
    iframe.style.filter = config.iframe.filter;
  }

  document.documentElement.style.setProperty('--ui-filter', config.uiFilter);
  document.body.style.background = config.bgColor || '';
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
  document.documentElement.style.setProperty('--ui-filter', 'none');
  document.body.style.background = '';
}
