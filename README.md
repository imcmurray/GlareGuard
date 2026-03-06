# GlareGuard

**Easy on the eyes.**

Paste a YouTube URL, pick a filter, and watch comfortably. GlareGuard is a lightweight web app that dims and tints YouTube videos to reduce eye strain — no accounts, no tracking, nothing leaves your browser.

## Find Your Comfort Zone

Four filter modes, each designed for a different moment.

🌙 **Simple Dim**
Like turning down a dial. Uniform darkening across the entire frame.
→ Late-night background viewing, winding down before sleep.

🔲 **Dark Invert**
White backgrounds become dark. Colors shift to match.
→ Tutorials, documentation walkthroughs, anything with a bright UI.

🔴 **Night Red**
Red monochrome that preserves your dark-adapted vision.
→ Falling asleep to a video, stargazing breaks, pitch-dark rooms.

🟢 **Night Green**
Green monochrome with the same dark-vision benefits and a tactical feel.
→ Same use cases as Night Red, different aesthetic preference.

## Features

**Viewing**
- Darkness slider from 0% to 100%
- Fullscreen support — filters follow the video
- UI dims and tints to match the active filter mode
- Slider glow pulses with mode-matched color
- End-screen overlay keeps you in-app between videos

**Smart**
- Auto-detect brightness adjusts filters to content (experimental, requires screen sharing)
- Shareable URLs preserve video and intensity settings
- Accepts all YouTube URL formats: watch, youtu.be, embed, shorts, and bare IDs

**Accessible**
- Respects `prefers-reduced-motion` — animations disabled when requested
- Light and dark theme via `prefers-color-scheme`
- Mobile-first responsive design

## Private by Design

Your viewing habits are none of our business.

- ✅ Zero tracking
- ✅ Zero analytics
- ✅ Zero cookies
- ✅ No external APIs beyond the YouTube embed
- ✅ All brightness detection processed locally
- ✅ Settings stored in localStorage only
- ✅ No accounts, no signups

## Get Started

1. Open GlareGuard in your browser
2. Paste any YouTube URL and press **Watch**
3. Drag the darkness slider and pick a filter mode

Settings persist automatically between sessions.

## Install

**Web** — Just visit the URL. Nothing to install.

**PWA** — Click the **Install App** button when it appears. Works offline after install.

---

## Development

Vanilla JavaScript, Vite, CSS, and the YouTube IFrame Player API. No frameworks.

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

### Project Structure

```
src/
├── index.html          # Landing page with URL input & player container
├── main.js             # Entry point — wires player, processor, settings, SW registration
├── player.js           # YouTube IFrame Player API wrapper
├── processor.js        # CSS filter engine (dim, bright-reduction, night tint)
├── detector.js         # Auto-detect brightness via screen capture
├── ui/
│   ├── settings.js     # Settings panel component (slider, mode selector, toggles)
│   └── styles.css      # Global styles, dark theme, responsive layout
└── utils/
    ├── storage.js       # localStorage read/write helpers
    ├── url.js           # YouTube URL parser
    └── resize.js        # ResizeObserver overlay sync
public/
├── manifest.json       # PWA manifest
├── icons/              # App icons
└── service-worker.js   # Cache-first service worker
```

## License

MIT — © 2026 GlareGuard
