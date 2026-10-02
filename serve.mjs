/**
 * Zero-dependency static server for the built site.
 *
 * Why this exists: the sandbox wipes `node_modules` and `dist` between
 * sessions, so restarting the preview used to mean a full reinstall +
 * rebuild. This serves the pre-built copy in `preview/`, which does
 * persist, using nothing but Node's standard library.
 *
 *   node serve.mjs            -> http://0.0.0.0:4173
 *
 * For live editing with hot reload, use `npm run dev` instead.
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'

const ROOT = new URL('./preview/', import.meta.url).pathname
const PORT = Number(process.env.PORT) || 4173

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.glsl': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

async function resolveFile(urlPath) {
  // strip query/hash, block traversal outside ROOT
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0].split('#')[0]))
  const candidate = join(ROOT, clean)
  if (!candidate.startsWith(ROOT)) return null

  try {
    const s = await stat(candidate)
    if (s.isDirectory()) return join(candidate, 'index.html')
    return candidate
  } catch {
    // SPA-style fallback, mirrors the redirect rule in netlify.toml
    return join(ROOT, 'index.html')
  }
}

const server = createServer(async (req, res) => {
  try {
    const file = await resolveFile(req.url || '/')
    if (!file) {
      res.writeHead(403).end('Forbidden')
      return
    }

    const body = await readFile(file)
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream'

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(body)
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end(`Not found\n${err.message}`)
  }
})

// 0.0.0.0, not 127.0.0.1 — the preview proxy has to be able to reach it
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Portfolio (production build)`)
  console.log(`  ➜  http://0.0.0.0:${PORT}/`)
  console.log(`  serving ${ROOT}\n`)
})
