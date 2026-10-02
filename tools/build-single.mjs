/**
 * Fold the built site into one self-contained HTML file.
 *
 * Vite inlines the fonts for us (assetsInlineLimit); this folds in the JS,
 * the CSS, and the portrait — which lives in public/ and so is copied
 * verbatim rather than inlined.
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = 'dist-single'
let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')

// stylesheet -> <style>
html = html.replace(/<link rel="stylesheet"[^>]*href="\/([^"]+)"[^>]*>/g, (_, href) => {
  const css = fs.readFileSync(path.join(DIST, href), 'utf8')
  return `<style>\n${css}\n</style>`
})

// module script -> inline module
html = html.replace(/<script type="module"[^>]*src="\/([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = fs.readFileSync(path.join(DIST, src), 'utf8')
  return `<script type="module">\n${js}\n</script>`
})

// the portrait is a public/ file, so Vite leaves it alone
const webp = fs.readFileSync(path.join(DIST, 'portrait.webp')).toString('base64')
html = html.split('/portrait.webp').join(`data:image/webp;base64,${webp}`)

const favicon = fs.readFileSync(path.join(DIST, 'favicon.svg')).toString('base64')
html = html.split('/favicon.svg').join(`data:image/svg+xml;base64,${favicon}`)

fs.writeFileSync('portfolio-standalone.html', html)

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0)
console.log(`portfolio-standalone.html  ${kb(html)} kB`)
const left = [...html.matchAll(/(?:src|href)="\/[^"]*"/g)].map((m) => m[0])
console.log(left.length ? `  WARNING unresolved refs: ${left.join(', ')}` : '  no external references — fully self-contained')
