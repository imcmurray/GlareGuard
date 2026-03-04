import { loadYouTubeAPI, loadVideo } from './player.js';
import { extractVideoId } from './utils/url.js';
import { initSettings } from './ui/settings.js';
import { initOverlaySync } from './utils/resize.js';
import { loadSettings } from './utils/storage.js';

const form = document.getElementById('url-form');
const input = document.getElementById('url-input');
const playerSection = document.getElementById('player-section');
const settingsContainer = document.getElementById('settings-container');

let settingsAPI = null;
let cleanupResize = null;

/** Show the player section and initialize supporting modules. */
function showPlayer() {
  playerSection.classList.remove('hidden');

  if (!settingsAPI) {
    settingsAPI = initSettings(settingsContainer);
  }

  if (!cleanupResize) {
    cleanupResize = initOverlaySync('#player-wrapper', '#filter-overlay');
  }
}

/** Load a video from a URL string or video ID. */
async function handleVideo(rawInput) {
  const videoId = extractVideoId(rawInput);
  if (!videoId) return;

  showPlayer();

  await loadYouTubeAPI();
  await loadVideo(videoId);

  // Update URL for sharing
  const url = new URL(window.location);
  url.searchParams.set('v', videoId);
  const current = settingsAPI ? settingsAPI.getSettings() : loadSettings();
  if (current.intensity !== 50) {
    url.searchParams.set('intensity', current.intensity);
  }
  history.replaceState(null, '', url);
}

// Form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  handleVideo(input.value);
});

// Check URL params on load
const params = new URLSearchParams(window.location.search);
const urlVideoId = params.get('v');
if (urlVideoId) {
  input.value = urlVideoId;
  handleVideo(urlVideoId);
}

// Apply intensity from URL param if present
const urlIntensity = params.get('intensity');
if (urlIntensity !== null) {
  document.addEventListener('glareguard:playerready', () => {
    if (settingsAPI) {
      settingsAPI.setIntensity(Number(urlIntensity));
    }
  }, { once: true });
}

// Register service worker
if ('serviceWorker' in navigator) {
  const swPath = import.meta.env.BASE_URL + 'service-worker.js';
  navigator.serviceWorker.register(swPath).catch(() => {});
}

// Install prompt
let deferredPrompt = null;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.add('show');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.remove('show');
});

window.addEventListener('appinstalled', () => {
  installBtn.classList.remove('show');
  deferredPrompt = null;
});
