# /build-pwa — PWA Setup

## Role
You are the PWA agent. You create the Web App Manifest, service worker, placeholder icons, and wire up service worker registration and install prompt handling.

## Context
GlareGuard should be installable as a Progressive Web App. Users can add it to their home screen and use it like a native app. The service worker provides offline caching so the app shell loads instantly.

## Prerequisites
- `/scaffold` must have been run
- `public/` and `public/icons/` directories should exist

## Files to Create/Modify

### 1. `public/manifest.json`
```json
{
  "name": "GlareGuard",
  "short_name": "GlareGuard",
  "description": "Adaptive YouTube video dimming for comfortable viewing",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#1a1a2e",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 2. `public/service-worker.js`
Implement a cache-first service worker:

#### Install Event
- Cache name: `glareguard-v1`
- Pre-cache the app shell:
  - `/`
  - `/index.html` (Vite may serve this differently — cache both)
  - CSS and JS assets (use a pattern match, not hardcoded names since Vite hashes filenames)

#### Fetch Event
- **Cache-first strategy** for app shell and static assets:
  1. Check cache for match
  2. If found, return cached response
  3. If not, fetch from network, cache the response, then return it
- **Network-first** for YouTube API and external resources (don't cache third-party scripts)
- Skip caching for requests to `youtube.com`, `googleapis.com`, `googlevideo.com`

#### Activate Event
- Clean up old caches (delete any cache not matching current version)

### 3. Placeholder Icon PNGs
Generate simple placeholder icons. Since we can't create actual PNGs programmatically in this context, create SVG icons and reference them, OR create a simple script that generates placeholder icons.

**Approach**: Create `public/icons/icon-192.svg` and `public/icons/icon-512.svg` as simple SVGs with the GlareGuard "G" letter or a sun/shield icon. Update manifest to reference SVGs if PNG generation isn't feasible.

Alternative: Create a minimal HTML canvas-based icon generator script in `scripts/generate-icons.js` that creates the PNGs, or simply note in CLAUDE.md that real icons need to be added.

For now, create simple SVG placeholders:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="32" fill="#1a1a2e"/>
  <text x="96" y="120" font-size="100" font-family="system-ui" fill="#e0e0e0" text-anchor="middle">G</text>
</svg>
```

### 4. Service Worker Registration (in `src/main.js`)
Add to `main.js`:
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.warn('SW registration failed:', err));
}
```

### 5. Install Prompt Handling
Add install prompt logic to `main.js` or a dedicated `src/utils/install.js`:
- Listen for `beforeinstallprompt` event
- Store the event
- Show a custom "Install App" button when the prompt is available
- On button click, call `event.prompt()` and handle the result
- Hide the button after installation or dismissal

### 6. HTML Meta Tags
Ensure `src/index.html` has these PWA-related tags in `<head>`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1a1a2e">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

## Requirements
- Service worker must not interfere with YouTube video playback
- Cache versioning must support easy updates (increment `glareguard-v1` → `v2`)
- Install prompt should be non-intrusive (small button, not a modal)
- All PWA manifest fields must be valid
- Icons should look reasonable as placeholders

## Integration Points
- Manifest link and meta tags go in `index.html` (coordinate with `/build-landing`)
- SW registration goes in `main.js` (coordinate with `/build-player`)
- The service worker file lives in `public/` so Vite copies it to `dist/` as-is
- Theme color should match the dark theme from `/build-styles`

## Verification
1. Chrome DevTools → Application → Manifest shows valid manifest
2. Service worker registers successfully (check console)
3. Lighthouse PWA audit passes basic checks
4. "Install" button appears on supported browsers
5. App can be installed to home screen
6. YouTube playback works normally with service worker active
