# /build-landing — Landing Page & Layout

## Role
You are the landing page agent. You build the main HTML page with hero section, URL input, and YouTube player container. You also implement URL parsing logic to extract video IDs from various YouTube URL formats.

## Context
GlareGuard lets users paste a YouTube URL to watch with adaptive dimming. The landing page is the first thing users see — it needs a clean dark-themed hero section with a URL input field and a player area that appears once a valid video ID is extracted.

## Prerequisites
- `/scaffold` must have been run (check that `src/index.html` and `src/main.js` exist)

## Files to Create/Modify

### 1. `src/index.html` (replace placeholder)
Build a complete HTML page with:
- `<!DOCTYPE html>`, charset UTF-8, viewport meta tag
- `<title>GlareGuard — Adaptive Video Dimming</title>`
- Link to `./ui/styles.css`
- Page structure:
  - **Header**: App name "GlareGuard" with a short tagline like "Easy on the eyes."
  - **Hero section**: Centered URL input field with placeholder "Paste a YouTube URL..." and a "Watch" button
  - **Player section** (initially hidden): `<div id="player-wrapper">` containing `<div id="player"></div>` (YouTube embed target) and `<div id="filter-overlay"></div>` (for CSS filter layer)
  - **Settings container**: `<div id="settings-container"></div>` (populated by settings.js)
  - **Footer**: Minimal footer
- `<script type="module" src="./main.js"></script>` before closing body

### 2. `src/utils/url.js` (new file)
Create a URL parser utility:
- Export a function `extractVideoId(input)` that handles:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://youtube.com/shorts/VIDEO_ID`
  - `https://www.youtube.com/watch?v=VIDEO_ID&t=120`
  - Just a bare video ID (11 chars, alphanumeric + `-_`)
- Return the 11-character video ID string or `null` if invalid

### 3. Shareable URL Support
In the landing page logic (can be in `main.js` or a separate module):
- On page load, check `window.location.search` for `?v=VIDEO_ID` and optionally `&intensity=NUMBER`
- If present, auto-load the video with those settings
- When a user loads a video, update the URL with `history.replaceState` to make it shareable

## Requirements
- Dark background by default (actual colors defined by `/build-styles`, use CSS classes)
- The URL input should be prominent and centered
- Player wrapper must use `position: relative` so the filter overlay can sit on top
- Filter overlay uses `position: absolute; inset: 0; pointer-events: none` to cover the player
- Show/hide player section based on whether a valid video is loaded
- Input should accept paste and Enter key to submit

## Integration Points
- `#player` div is the target for YouTube IFrame Player API (used by `/build-player`)
- `#filter-overlay` is controlled by `/build-processor`
- `#settings-container` is populated by `/build-settings`
- URL parser is used by `main.js` to wire input → player loading
- Shareable URL params feed into settings and player initialization

## Verification
1. Page loads with dark background and centered input field
2. Pasting various YouTube URL formats correctly extracts the video ID
3. `?v=VIDEO_ID` in the address bar auto-populates the input
4. Player section is hidden until a valid URL is entered
5. HTML is valid and semantic
