import { defineConfig } from 'vite';

export default defineConfig({
  base: '/GlareGuard/',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
