# /build-all — Full MVP Build Orchestrator

## Role
You are the orchestration agent. You coordinate the full GlareGuard MVP build by running all build skills in the correct dependency order, then verifying the result.

## Context
GlareGuard is a vanilla JS PWA for adaptive YouTube video dimming. This skill builds the entire app from an empty repo by invoking the individual build skills in sequence. The end result should be a fully functional MVP.

## Full App Specification

### What GlareGuard Does
1. User opens the app and sees a dark-themed landing page
2. User pastes a YouTube URL into the input field
3. The app extracts the video ID and embeds the YouTube player
4. A transparent CSS filter overlay sits on top of the player
5. The settings panel lets users adjust dimming intensity (0-100%), choose filter modes (Global Dim, Selective Bright-Reduction, Night Tint), and toggle auto/manual mode
6. Settings persist in localStorage across sessions
7. The URL updates to be shareable (e.g., `?v=VIDEO_ID&intensity=65`)
8. The app is installable as a PWA

### Tech Stack
- Vanilla JavaScript (ES modules)
- Vite (dev server + build)
- Plain CSS (custom properties, no frameworks)
- YouTube IFrame Player API
- localStorage for persistence
- Service Worker for PWA/caching

## Build Order

### Phase 1: Foundation (must complete first)
Run `/scaffold` to create:
- package.json, vite.config.js, .gitignore
- Directory structure (src/, public/, src/ui/, src/utils/)
- Placeholder files
- Install Vite

### Phase 2: Parallel Build (all can run simultaneously after Phase 1)
Run these skills — they are independent and can execute in parallel:

1. **`/build-landing`** — Landing page HTML, URL parser, hero section
2. **`/build-player`** — YouTube IFrame Player API integration
3. **`/build-processor`** — CSS filter engine and overlay sizing
4. **`/build-settings`** — Settings UI, localStorage persistence
5. **`/build-pwa`** — Manifest, service worker, icons, install prompt
6. **`/build-styles`** — Complete CSS theme and responsive layout

### Phase 3: Integration Wiring
After all Phase 2 skills complete, ensure `src/main.js` properly wires everything together:

```js
// main.js should:
import { loadYouTubeAPI, loadVideo } from './player.js';
import { applyFilter } from './processor.js';
import { initSettings } from './ui/settings.js';
import { extractVideoId } from './utils/url.js';
import { initOverlaySync } from './utils/resize.js';
import { loadSettings } from './utils/storage.js';

// 1. Initialize settings panel
// 2. Check URL params for ?v= and ?intensity=
// 3. Wire up URL input form submission
// 4. On video load: init YouTube API, create player, start overlay sync
// 5. Listen for glareguard:settingschange to apply filters
// 6. Listen for glareguard:playerready to apply initial filter
// 7. Register service worker
// 8. Handle install prompt
```

### Phase 4: Verification
After all code is written:

1. **Structural Check**
   - All files from the architecture diagram exist
   - No placeholder comments remain in production files
   - All imports resolve correctly

2. **Build Check**
   ```bash
   npm run build
   ```
   - Should complete without errors
   - `dist/` should contain the built app

3. **Dev Server Check**
   ```bash
   npm run dev
   ```
   - Vite should start without errors
   - Page should load at localhost

4. **Functional Checklist**
   - [ ] Landing page renders with dark theme
   - [ ] URL input accepts YouTube URLs
   - [ ] Video loads and plays in the embedded player
   - [ ] Filter overlay sits on top of the player
   - [ ] Intensity slider dims/brightens the video in real-time
   - [ ] Mode selector switches between Global Dim, Selective Bright-Reduction, Night Tint
   - [ ] Settings persist across page reload
   - [ ] URL updates with ?v= and &intensity= params
   - [ ] Shareable URL loads correct video and settings
   - [ ] PWA manifest is valid
   - [ ] Service worker registers
   - [ ] Responsive on mobile and desktop
   - [ ] Auto mode detects system dark/light preference

## Requirements
- Run `/scaffold` FIRST — all other skills depend on it
- After Phase 2, review `main.js` to ensure all modules are properly imported and wired
- Fix any integration issues (missing imports, event name mismatches, DOM selector conflicts)
- The final app must build and run without errors

## Integration Watchpoints
These are common issues to check after parallel builds:
- **DOM selectors**: All skills must agree on element IDs (`#player`, `#player-wrapper`, `#filter-overlay`, `#settings-container`)
- **Event names**: Custom events must match (`glareguard:playerready`, `glareguard:statechange`, `glareguard:playererror`, `glareguard:settingschange`)
- **Import paths**: All relative imports must be correct for the `src/` root
- **CSS class names**: `.hidden`, `.player-active` used consistently
- **Settings shape**: `{ intensity, mode, auto }` object structure used everywhere

## Verification
After the full build:
1. `npm run dev` starts without errors
2. Opening the dev URL shows the GlareGuard landing page
3. Pasting a YouTube URL plays the video with dimming controls
4. All settings work and persist
5. `npm run build` produces a clean production build
