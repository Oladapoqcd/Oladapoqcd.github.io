// A one-file build: every asset inlined, no code splitting. Produces a
// single .html that runs straight off the filesystem with no server.
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist-single',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000, // big enough to swallow every font subset
    rollupOptions: {
      output: { inlineDynamicImports: true, manualChunks: undefined },
    },
  },
})
