# /build-styles — CSS Theme & Responsive Design

## Role
You are the styling agent. You implement the complete CSS for GlareGuard — dark theme, responsive layout, component styling, transitions, and accessibility.

## Context
GlareGuard uses a dark theme by default to complement its video dimming purpose. The CSS should be clean, using custom properties for theming, and mobile-first responsive design. No CSS frameworks — plain CSS only.

## Prerequisites
- `/scaffold` must have been run
- `src/ui/styles.css` placeholder should exist

## Files to Create/Modify

### 1. `src/ui/styles.css` (replace placeholder)
Implement the complete stylesheet:

#### CSS Custom Properties (Theme Variables)
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a2e;
  --bg-surface: #16213e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #4a90d9;
  --accent-hover: #5ba0e9;
  --border: #2a2a4a;
  --shadow: rgba(0, 0, 0, 0.3);
  --radius: 8px;
  --transition: 0.3s ease;
}
```

#### Global Reset & Base
- Box-sizing border-box on all elements
- Body: `var(--bg-primary)` background, `var(--text-primary)` color
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Smooth scrolling on html
- Remove default margins/padding

#### Header
- App name styled prominently
- Tagline in `var(--text-secondary)`
- Centered, with adequate spacing

#### Hero / URL Input Section
- Centered container, max-width ~600px
- Input field: full width, dark background (`var(--bg-surface)`), light text, rounded corners
- Large padding for easy touch targets
- Focus state: accent border glow
- Submit button: accent background, hover state, rounded
- Input + button can be in a flex row or stacked on mobile

#### Player Wrapper
- `position: relative` for overlay positioning
- Responsive aspect ratio: use `aspect-ratio: 16/9` or padding-bottom hack
- Max-width ~900px, centered
- Rounded corners with overflow hidden
- Background: `var(--bg-secondary)` (visible before video loads)

#### Filter Overlay
- `position: absolute; inset: 0`
- `pointer-events: none`
- `z-index: 10` (above iframe)
- `transition: filter var(--transition), background-color var(--transition)`

#### Settings Panel
- Below the player, max-width ~600px, centered
- Card-style: `var(--bg-surface)` background, border, rounded corners
- Sections with clear labels
- Slider: custom styled range input (accent color track/thumb)
- Radio buttons / select: styled to match dark theme
- Toggle switch: CSS-only toggle for auto/manual
- Reset button: subtle, secondary styling
- Spacing between controls

#### Responsive Design (Mobile-First)
```css
/* Base: mobile */
/* Tablet and up */
@media (min-width: 768px) { ... }
/* Desktop */
@media (min-width: 1024px) { ... }
```
- Mobile: stack everything vertically, full-width input, smaller player
- Tablet: slightly wider content, more spacing
- Desktop: max-width containers, comfortable reading width

#### System Dark Mode Detection
```css
@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #f5f5f5;
    --bg-secondary: #e8e8f0;
    --bg-surface: #ffffff;
    --text-primary: #1a1a1a;
    --text-secondary: #666666;
    --accent: #3a7bc8;
    --border: #d0d0e0;
    --shadow: rgba(0, 0, 0, 0.1);
  }
}
```

#### Transitions & Animations
- Filter changes: smooth `transition: filter 0.3s ease`
- Settings panel: subtle slide-in or fade-in on appearance
- Button hover/active states with transitions
- Slider thumb: smooth movement feedback

#### Accessibility
- Focus-visible outlines on all interactive elements
- Sufficient color contrast (WCAG AA minimum)
- `prefers-reduced-motion: reduce` — disable animations
- Screen reader friendly: use semantic HTML (handled by `/build-landing`)
- Touch targets minimum 44x44px on mobile

#### Install Button
- Fixed position or inline, non-intrusive
- Accent background, rounded
- Hidden by default, shown via JS class toggle

#### Utility Classes
- `.hidden` — `display: none`
- `.visually-hidden` — screen-reader only
- `.player-active` — class added to body when video is playing (can adjust layout)

## Requirements
- Dark theme must be the default (not dependent on system preference)
- Light theme via `prefers-color-scheme: light` for users who prefer it
- All colors must use CSS custom properties for easy theming
- Mobile-first: base styles for small screens, media queries for larger
- No CSS frameworks, preprocessors, or build-time CSS processing
- File stays in `src/ui/styles.css` — imported by `index.html`

## Integration Points
- `index.html` links this stylesheet (handled by `/build-landing`)
- Class names must match what other modules use:
  - `#player-wrapper`, `#player`, `#filter-overlay`
  - `#settings-container`
  - `.hidden` for show/hide toggling
- Theme colors should match `manifest.json` values from `/build-pwa`
- Filter overlay transition must be smooth for `/build-processor`

## Verification
1. Page renders with dark theme by default
2. All interactive elements have visible focus states
3. Layout is usable on mobile (320px width) through desktop (1440px+)
4. System light mode preference switches to light theme
5. Filter transitions are smooth, not jarring
6. Settings panel controls are clearly styled and easy to use
7. `prefers-reduced-motion` disables animations
