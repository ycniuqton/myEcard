import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.vercel', 'output')
const FUNCTION_DIR = join(OUT, 'functions', 'api.func')
const WEB_DIST = join(ROOT, 'apps', 'web', 'dist')
const API_ENTRY = join(ROOT, 'apps', 'api', 'api', 'index.ts')
const PGLITE_STUB = join(ROOT, 'scripts', 'stubs', 'pglite-stub.mjs')
const NODE_RUNTIME = 'nodejs22.x'
const BUNDLE_BANNER = "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);"

const ROUTES = [
  { src: '^/api/(.*)$', dest: '/api' },
  { handle: 'filesystem' },
  { src: '^/(.*)$', dest: '/index.html' },
]

function buildWeb() {
  const env = { ...process.env, VITE_AUTH_MODE: process.env.VITE_AUTH_MODE ?? 'supabase' }
  execSync('npm run build -w @wordmap/web', { cwd: ROOT, stdio: 'inherit', env })
}

async function bundleFunction() {
  await build({
    entryPoints: [API_ENTRY],
    outfile: join(FUNCTION_DIR, 'api', 'index.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    banner: { js: BUNDLE_BANNER },
    alias: { '@electric-sql/pglite': PGLITE_STUB },
    logLevel: 'info',
  })
  cpSync(join(ROOT, 'apps', 'api', 'content'), join(FUNCTION_DIR, 'content'), { recursive: true })
  writeFileSync(join(FUNCTION_DIR, '.vc-config.json'), JSON.stringify({
    runtime: NODE_RUNTIME, handler: 'api/index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false,
  }))
}

function writeOutputConfig() {
  cpSync(WEB_DIST, join(OUT, 'static'), { recursive: true })
  writeFileSync(join(OUT, 'config.json'), JSON.stringify({ version: 3, routes: ROUTES }))
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(FUNCTION_DIR, { recursive: true })
buildWeb()
await bundleFunction()
writeOutputConfig()
console.log('Vercel output ready at', OUT)
