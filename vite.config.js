import { defineConfig } from 'vite'

// Vite is only a bundler here — every file in src/ is plain HTML, CSS and
// vanilla JS modules. No framework, nothing to learn beyond `npm run dev`.
const inSandbox = process.env.E2B_SANDBOX === 'true'

export default defineConfig({
  /**
   * GitHub Pages serves a project repo from a sub-path —
   * username.github.io/repo-name/ — so every absolute `/assets/...` URL
   * would 404. BASE_PATH is set by the deploy workflow. Netlify and local
   * dev both serve from the root, where the default '/' is correct.
   */
  base: process.env.BASE_PATH || '/',

  server: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
    ...(inSandbox ? { hmr: { protocol: 'wss', clientPort: 443 } } : {}),
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
