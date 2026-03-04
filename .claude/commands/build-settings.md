# /build-settings — Settings UI & Persistence

## Role
You are the settings agent. You build the settings panel UI (intensity slider, mode selector, toggles), wire it to the processor in real-time, and persist user preferences to localStorage.

## Context
GlareGuard users need a simple settings panel to control dimming intensity, choose filter modes, and toggle between auto/manual mode. Settings must persist across sessions and sync with the filter processor in real-time.

## Prerequisites
- `/scaffold` must have been run
- `src/index.html` should have `<div id="settings-container"></div>` (created by `/build-landing`)

## Files to Create/Modify

### 1. `src/ui/settings.js` (replace placeholder)
Build the settings panel component:

#### `initSettings(container)`
- Takes the `#settings-container` DOM element
- Renders the settings panel HTML into it
- Wires up all event listeners
- Loads saved preferences from storage
- Returns a settings API object

#### Settings Panel UI Elements

1. **Intensity Slider**
   - Range input: min=0, max=100, step=1
   - Label showing current value: "Intensity: 65%"
   - Default: 50
   - `input` event fires in real-time (not just on `change`)

2. **Mode Selector**
   - Three radio buttons or a `<select>`:
     - "Global Dim" (value: `globalDim`) — default
     - "Selective Bright-Reduction" (value: `selectiveBright`)
     - "Night Tint" (value: `nightTint`)
   - Label with brief description of each mode

3. **Auto/Manual Toggle**
   - Checkbox or toggle switch
   - Auto mode: intensity adjusts based on system dark mode preference
     - If `prefers-color-scheme: dark` → default intensity 40
     - If `prefers-color-scheme: light` → default intensity 60
   - Manual mode: user has full control via slider

4. **Reset Button**
   - Resets all settings to defaults
   - Clears localStorage

#### Emitted Events
- Dispatch `glareguard:settingschange` on `document` whenever any setting changes
- Event detail: `{ intensity, mode, auto }`

#### Settings API Object
Return from `initSettings()`:
```js
{
  getSettings()     // returns { intensity, mode, auto }
  setIntensity(n)   // programmatically update intensity
  setMode(mode)     // programmatically update mode
  destroy()         // remove event listeners, clean up
}
```

### 2. `src/utils/storage.js` (replace placeholder)
Implement localStorage helpers:

- **`saveSettings(settings)`**
  - `localStorage.setItem('glareguard-settings', JSON.stringify(settings))`

- **`loadSettings()`**
  - Parse and return saved settings, or return defaults if none exist
  - Defaults: `{ intensity: 50, mode: 'globalDim', auto: false }`

- **`clearSettings()`**
  - Remove `glareguard-settings` from localStorage

- Handle `JSON.parse` errors gracefully (return defaults)

### 3. System Dark Mode Detection
In settings.js or a utility:
- Use `window.matchMedia('(prefers-color-scheme: dark)')`
- Listen for changes with `addEventListener('change', ...)`
- When auto mode is on, adjust intensity based on system preference
- When system preference changes and auto is on, update intensity and re-apply filter

## Requirements
- Settings panel must render correctly in the `#settings-container` div
- All changes must immediately call `applyFilter()` from the processor
- Settings persist across page reloads via localStorage
- Slider must update in real-time (use `input` event, not just `change`)
- Auto mode respects system dark mode preference
- Settings panel should be styled by `/build-styles` but have sensible defaults

## Integration Points
- Imports `applyFilter` from `../processor.js` to apply changes in real-time
- `glareguard:settingschange` event is dispatched for other modules to react
- `main.js` calls `initSettings()` during app initialization
- Shareable URL `?intensity=N` param should set initial intensity (handled in `main.js`)
- Storage module is standalone — can be used by any module

## Verification
1. Moving the intensity slider immediately changes the video dimming
2. Switching modes produces different visual effects
3. Refreshing the page restores the last-used settings
4. Auto mode adjusts intensity based on system dark/light preference
5. Reset button clears all settings and returns to defaults
6. The `glareguard:settingschange` event fires on every change
