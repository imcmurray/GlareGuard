# /build-player — YouTube Player Integration

## Role
You are the YouTube player agent. You implement the YouTube IFrame Player API integration, handling dynamic script loading, player lifecycle events, and the player wrapper setup.

## Context
GlareGuard embeds YouTube videos using the official IFrame Player API. The player must load dynamically (not via a static `<script>` tag) and expose lifecycle hooks so other modules (processor, settings) can react to player state changes.

## Prerequisites
- `/scaffold` must have been run
- `src/index.html` should have `<div id="player"></div>` inside `<div id="player-wrapper">` (created by `/build-landing`)

## Files to Create/Modify

### 1. `src/player.js` (replace placeholder)
Implement a YouTube player module that exports:

#### `loadYouTubeAPI()`
- Dynamically inject the YouTube IFrame API script (`https://www.youtube.com/iframe_api`)
- Return a Promise that resolves when `window.YT` is ready
- If already loaded, resolve immediately
- Handle the `onYouTubeIframeAPIReady` global callback

#### `createPlayer(videoId, options = {})`
- Create a `new YT.Player('player', { ... })` instance
- Default player config:
  - `width: '100%'`, `height: '100%'`
  - `playerVars`: `autoplay: 1`, `modestbranding: 1`, `rel: 0`, `playsinline: 1`
- Return a Promise that resolves with the player instance when `onReady` fires
- Wire up event handlers:
  - `onReady` — resolve the promise, dispatch custom event `glareguard:playerready`
  - `onStateChange` — dispatch custom event `glareguard:statechange` with state data
  - `onError` — dispatch custom event `glareguard:playererror` with error code

#### `destroyPlayer()`
- Call `player.destroy()` on existing instance
- Clean up references

#### `loadVideo(videoId)`
- If player exists, use `player.loadVideoById(videoId)`
- If not, create a new player with the video ID

### 2. `src/main.js` (modify)
Wire the player into the app entry point:
- Import `loadYouTubeAPI`, `loadVideo` from `./player.js`
- Import `extractVideoId` from `./utils/url.js`
- On form submit / button click:
  1. Extract video ID from input value
  2. If valid, call `loadYouTubeAPI()` then `loadVideo(videoId)`
  3. Show the player wrapper section
  4. Update URL with `history.replaceState`
- On page load, check for `?v=` param and auto-load if present

## Requirements
- YouTube API script must load dynamically, not in HTML
- Handle edge cases: API already loaded, player already exists, invalid video ID
- Use custom events (dispatched on `document`) for loose coupling — other modules listen for `glareguard:*` events
- Player should be responsive (100% width/height of its container)
- The `<iframe>` YouTube creates must sit behind the filter overlay (z-index ordering)

## Integration Points
- `glareguard:playerready` — processor listens to start applying filters
- `glareguard:statechange` — settings/processor may react to play/pause/end
- `glareguard:playererror` — UI should show error feedback
- `main.js` coordinates player + URL parser + settings + processor
- Player wrapper's dimensions are observed by `/build-processor`'s ResizeObserver

## Verification
1. Entering a valid YouTube URL loads and plays the video
2. Player is responsive and fills its container
3. Custom events fire correctly on player state changes
4. Calling `loadVideo()` with a new ID switches videos without page reload
5. No console errors from the YouTube API integration
