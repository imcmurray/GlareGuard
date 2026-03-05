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

// When YouTube loads a different video (end-screen click, autoplay, etc.),
// update the app state so the user stays in GlareGuard.
document.addEventListener('glareguard:videochange', (e) => {
  const { videoId } = e.detail;
  input.value = `https://www.youtube.com/watch?v=${videoId}`;
  const url = new URL(window.location);
  url.searchParams.set('v', videoId);
  history.replaceState(null, '', url);
});

// End-screen overlay: block YouTube's end-screen links (which appear ~20s
// before the video ends) and show a replay/URL prompt instead.
const overlay = document.getElementById('filter-overlay');
let endScreenTimer = null;
let endScreenPlayer = null;

function showEndScreen() {
  if (!overlay || overlay.querySelector('.end-screen')) return;
  overlay.style.pointerEvents = 'auto';
  overlay.style.cursor = 'default';

  const endScreen = document.createElement('div');
  endScreen.className = 'end-screen';
  endScreen.innerHTML = `
    <button class="end-screen-replay" type="button">Replay</button>
    <form class="end-screen-form">
      <input type="text" class="end-screen-input" placeholder="Paste a YouTube URL..." autocomplete="off">
      <button type="submit" class="end-screen-go">Watch</button>
    </form>
  `;
  overlay.appendChild(endScreen);

  endScreen.querySelector('.end-screen-replay').addEventListener('click', () => {
    hideEndScreen();
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId) handleVideo(videoId);
  });

  endScreen.querySelector('.end-screen-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = endScreen.querySelector('.end-screen-input').value.trim();
    if (val) {
      hideEndScreen();
      input.value = val;
      handleVideo(val);
    }
  });
}

function hideEndScreen() {
  if (!overlay) return;
  overlay.style.pointerEvents = '';
  overlay.style.cursor = '';
  const endScreen = overlay.querySelector('.end-screen');
  if (endScreen) endScreen.remove();
}

function startEndScreenWatch(playerInstance) {
  stopEndScreenWatch();
  endScreenPlayer = playerInstance;
  endScreenTimer = setInterval(() => {
    try {
      if (!endScreenPlayer || typeof endScreenPlayer.getCurrentTime !== 'function') return;
      const current = endScreenPlayer.getCurrentTime();
      const duration = endScreenPlayer.getDuration();
      if (duration > 0 && current > 0 && (duration - current) <= 20) {
        showEndScreen();
      }
    } catch {}
  }, 1000);
}

function stopEndScreenWatch() {
  if (endScreenTimer) {
    clearInterval(endScreenTimer);
    endScreenTimer = null;
  }
}

document.addEventListener('glareguard:playerready', (e) => {
  startEndScreenWatch(e.detail.player);
});

document.addEventListener('glareguard:statechange', (e) => {
  const YT = window.YT;
  if (!YT) return;
  if (e.detail.state === YT.PlayerState.PLAYING) {
    hideEndScreen();
    // Restart watch in case this is a new video
    if (endScreenPlayer) startEndScreenWatch(endScreenPlayer);
  } else if (e.detail.state === YT.PlayerState.ENDED) {
    stopEndScreenWatch();
    showEndScreen();
  }
});

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
