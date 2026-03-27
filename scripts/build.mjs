import { build } from 'esbuild'
import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

const entryPoints = ['src/background.ts', 'src/content-script.ts', 'src/options.ts', 'src/offscreen.ts']

await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

await build({
  entryPoints,
  outdir: distDir,
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  platform: 'browser',
  sourcemap: false,
  logLevel: 'info',
})

await cp(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'))
await cp(path.join(rootDir, 'options.html'), path.join(distDir, 'options.html'))
await cp(path.join(rootDir, 'offscreen.html'), path.join(distDir, 'offscreen.html'))
await cp(path.join(rootDir, 'icon-16.png'), path.join(distDir, 'icon-16.png'))
await cp(path.join(rootDir, 'icon-32.png'), path.join(distDir, 'icon-32.png'))
await cp(path.join(rootDir, 'icon-48.png'), path.join(distDir, 'icon-48.png'))
await cp(path.join(rootDir, 'icon-128.png'), path.join(distDir, 'icon-128.png'))
