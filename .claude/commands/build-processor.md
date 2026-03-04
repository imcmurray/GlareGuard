# /build-processor — Dimming/Filter Engine

## Role
You are the visual processing agent. You implement the CSS filter engine that applies brightness, contrast, and tint adjustments to the YouTube player via an overlay div. You also handle overlay sizing with ResizeObserver.

## Context
GlareGuard's core feature is reducing video brightness/glare. The processor applies CSS filters to a transparent overlay that sits on top of the YouTube iframe. This approach works without canvas or pixel manipulation — it's pure CSS.

## Prerequisites
- `/scaffold` must have been run
- `src/index.html` should have `<div id="filter-overlay"></div>` inside `<div id="player-wrapper">` (created by `/build-landing`)

## Files to Create/Modify

### 1. `src/processor.js` (replace placeholder)
Implement the filter engine:

#### Filter Modes
Export three named modes:

1. **`globalDim`** — Uniform brightness reduction
   - Applies `brightness(X)` where X = 1 - (intensity / 100)
   - At intensity 50% → `brightness(0.5)`
   - Simple and effective for most use cases

2. **`selectiveBright`** — Reduce only bright areas
   - Applies `brightness(X) contrast(Y)`
   - Brightness: `1 - (intensity * 0.6 / 100)`
   - Contrast: `1 + (intensity * 0.2 / 100)`
   - Preserves dark areas while taming highlights

3. **`nightTint`** — Warm night mode
   - Applies `brightness(X) sepia(Y) saturate(Z)`
   - Brightness: `1 - (intensity * 0.4 / 100)`
   - Sepia: `intensity * 0.5 / 100`
   - Saturate: `1 - (intensity * 0.1 / 100)`
   - Warm orange-ish tint for night viewing

#### Exported Functions

- **`applyFilter(mode, intensity)`**
  - `mode`: string — `'globalDim'`, `'selectiveBright'`, or `'nightTint'`
  - `intensity`: number 0-100
  - Gets `#filter-overlay` element
  - Sets `element.style.filter` to the computed CSS filter string
  - Sets `element.style.backgroundColor` to `rgba(0,0,0, alpha)` where alpha is proportional to intensity for globalDim mode (provides additional dimming)
  - For other modes, background should be transparent

- **`removeFilter()`**
  - Clears all filter styles from the overlay
  - Resets background to transparent

- **`getFilterCSS(mode, intensity)`**
  - Pure function — returns the CSS filter string without applying it
  - Useful for previews or debugging

#### Phase 2 Placeholder
Add a commented-out stub for future canvas-based processing:
```js
// Phase 2: Canvas-based pixel processing
// export function analyzeFrame(canvas) { ... }
```

### 2. `src/utils/resize.js` (replace placeholder)
Implement overlay sync:

- **`initOverlaySync(wrapperSelector, overlaySelector)`**
  - Create a `ResizeObserver` on the wrapper element
  - On resize, update the overlay's width/height to match the wrapper
  - Return a cleanup function that disconnects the observer
- The overlay must always exactly cover the player iframe

## Requirements
- All filter calculations must clamp values to valid CSS ranges (brightness >= 0, etc.)
- Filter transitions should be smooth — add `transition: filter 0.3s ease` to the overlay
- The overlay must have `pointer-events: none` so users can still interact with the YouTube player
- `position: absolute; inset: 0` for overlay positioning (set via CSS, but enforce in JS if missing)
- Intensity of 0 should effectively disable the filter (pass-through)

## Integration Points
- `applyFilter()` is called by the settings module whenever the user changes intensity or mode
- Listens for `glareguard:playerready` to initialize the overlay sync
- `initOverlaySync()` is called from `main.js` after the player loads
- The overlay div `#filter-overlay` is created in `index.html` by `/build-landing`

## Verification
1. Setting intensity to 50 in globalDim mode visibly dims the video
2. Changing modes produces noticeably different visual effects
3. Intensity 0 shows the video unmodified
4. Overlay stays perfectly aligned when resizing the browser
5. YouTube player controls remain clickable through the overlay
