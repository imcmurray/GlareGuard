/**
 * YouTube IFrame Player API wrapper.
 * Handles dynamic script loading, player lifecycle, and custom events.
 */

let player = null;
let apiReady = false;
let apiPromise = null;
let currentVideoId = null;

/**
 * Dynamically load the YouTube IFrame API script.
 * Resolves when window.YT is ready.
 * @returns {Promise<void>}
 */
export function loadYouTubeAPI() {
  if (apiReady && window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    // If script is already present but not yet ready
    if (window.YT && window.YT.Player) {
      apiReady = true;
      resolve();
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      if (prev) prev();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return apiPromise;
}

/**
 * Create a new YT.Player in the #player div.
 * @param {string} videoId
 * @param {object} options
 * @returns {Promise<YT.Player>}
 */
export function createPlayer(videoId, options = {}) {
  return new Promise((resolve, reject) => {
    if (!window.YT || !window.YT.Player) {
      reject(new Error('YouTube API not loaded'));
      return;
    }

    // Destroy existing player first
    if (player) {
      try { player.destroy(); } catch {}
      player = null;
    }

    currentVideoId = videoId;

    player = new window.YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        ...options.playerVars,
      },
      events: {
        onReady(event) {
          document.dispatchEvent(new CustomEvent('glareguard:playerready', { detail: { player: event.target } }));
          resolve(event.target);
        },
        onStateChange(event) {
          document.dispatchEvent(new CustomEvent('glareguard:statechange', { detail: { state: event.data } }));
          // Detect when YouTube loads a different video (e.g. end-screen click)
          if (event.data === window.YT.PlayerState.PLAYING) {
            try {
              const url = event.target.getVideoUrl();
              const match = url && url.match(/[?&]v=([^&]+)/);
              const newId = match && match[1];
              if (newId && newId !== currentVideoId) {
                currentVideoId = newId;
                document.dispatchEvent(new CustomEvent('glareguard:videochange', { detail: { videoId: newId } }));
              }
            } catch {}
          }
        },
        onError(event) {
          document.dispatchEvent(new CustomEvent('glareguard:playererror', { detail: { code: event.data } }));
        },
      },
    });
  });
}

/**
 * Destroy the current player instance and clean up.
 */
export function destroyPlayer() {
  if (player) {
    try { player.destroy(); } catch {}
    player = null;
  }
  currentVideoId = null;
}

/**
 * Load a video by ID — creates or reuses the player.
 * @param {string} videoId
 * @returns {Promise<YT.Player>}
 */
export function loadVideo(videoId) {
  if (player && typeof player.loadVideoById === 'function') {
    currentVideoId = videoId;
    player.loadVideoById(videoId);
    return Promise.resolve(player);
  }
  return createPlayer(videoId);
}
