# GlareGuard

## What Is This?
GlareGuard is a Progressive Web App (PWA) for adaptive YouTube video dimming. Users paste a YouTube URL, and the app embeds the video with configurable brightness/filter overlays to reduce eye strain.

## Tech Stack
- **Language**: Vanilla JavaScript (ES modules, no frameworks)
- **Build**: Vite
- **Styling**: Plain CSS (dark theme default)
- **APIs**: YouTube IFrame Player API
- **Storage**: localStorage for user preferences
- **PWA**: Service worker + Web App Manifest

## Architecture
```
src/
├── index.html          # Landing page with URL input & player container
├── main.js             # Entry point — wires player, processor, settings, SW registration
├── player.js           # YouTube IFrame Player API wrapper
├── processor.js        # CSS filter engine (dim, bright-reduction, night tint)
├── ui/
│   ├── settings.js     # Settings panel component (slider, mode selector, toggles)
│   └── styles.css      # Global styles, dark theme, responsive layout
└── utils/
    ├── storage.js       # localStorage read/write helpers
    └── resize.js        # ResizeObserver overlay sync
public/
├── manifest.json       # PWA manifest
├── icons/              # App icons (192x192, 512x512)
└── service-worker.js   # Cache-first service worker
```

## Development Conventions
- Vanilla JS only — no React, Vue, or other frameworks
- ES module imports (`import`/`export`)
- Vite for dev server and production builds
- Dark theme as default; respect `prefers-color-scheme`
- Mobile-first responsive design
- No TypeScript — plain `.js` files

## Common Commands
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

## Custom Slash Commands
Run these skills to build the app incrementally:
- `/scaffold` — Initialize project (run first)
- `/build-landing` — Landing page & URL input
- `/build-player` — YouTube player integration
- `/build-processor` — Dimming/filter engine
- `/build-settings` — Settings UI & persistence
- `/build-pwa` — PWA manifest & service worker
- `/build-styles` — CSS theme & responsive design
- `/build-all` — Orchestrate full MVP build
