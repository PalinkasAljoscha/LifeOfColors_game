import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

// GitHub Pages serves the site under /<repo-name>/. Override with VITE_BASE if the
// repo is renamed or a custom domain is used (then VITE_BASE=/).
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE ?? (command === 'build' || isPreview ? '/LifeOfColors_game/' : '/'),
  define: {
    // e.g. "0.1.0+3f2a9c1" in CI (GITHUB_SHA), "0.1.0+local" otherwise
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
}))
