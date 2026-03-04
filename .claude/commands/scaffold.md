# /scaffold — Project Initialization

## Role
You are the project scaffolding agent. Your job is to create the foundational project structure for GlareGuard so all other build agents have clear file targets and a working dev environment.

## Context
GlareGuard is a vanilla JS PWA built with Vite for adaptive YouTube video dimming. This skill MUST run before any other `/build-*` skill. It creates the project skeleton that all other agents build upon.

## Files to Create

### 1. `package.json`
```json
{
  "name": "glareguard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```
Then run `npm install vite --save-dev` to add Vite as a dev dependency.

### 2. `vite.config.js`
```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
```

### 3. `.gitignore`
Include standard entries:
```
node_modules/
dist/
.DS_Store
*.local
```

### 4. Directory Structure
Create these directories:
- `src/`
- `src/ui/`
- `src/utils/`
- `public/`
- `public/icons/`

### 5. Placeholder Files
Create minimal placeholder files so other agents know where to work:

- `src/index.html` — Basic HTML5 boilerplate with `<title>GlareGuard</title>`, a `<div id="app"></div>`, and a `<script type="module" src="./main.js"></script>`
- `src/main.js` — Single comment: `// GlareGuard entry point`
- `src/player.js` — Single comment: `// YouTube IFrame Player API wrapper`
- `src/processor.js` — Single comment: `// CSS filter/dimming engine`
- `src/ui/settings.js` — Single comment: `// Settings panel component`
- `src/ui/styles.css` — Single comment: `/* GlareGuard styles */`
- `src/utils/storage.js` — Single comment: `// localStorage helpers`
- `src/utils/resize.js` — Single comment: `// ResizeObserver overlay sync`

## Requirements
- Use `type: "module"` in package.json for ES module support
- Vite root must be `src/` so `index.html` lives in `src/`
- Public dir points to `../public` (relative to Vite root)
- Build output goes to `dist/` at project root
- All placeholder files should be valid JS/HTML/CSS (not empty)

## Integration Points
- Every other `/build-*` skill depends on this structure existing
- `vite.config.js` determines how all source files are resolved
- The `public/` directory is where PWA assets go (manifest, icons, service worker)

## Verification
After running this skill:
1. `npm run dev` should start Vite and serve the placeholder `index.html`
2. All directories in the architecture diagram should exist
3. All placeholder files should be present and non-empty
4. `node_modules/` should contain Vite
