import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(here, '..', '..', 'api')
const port = process.env.E2E_PORT ?? '3105'
const dbDir = join(here, `.tmp-${port}`)

const webRoot = join(here, '..')
const authMode = process.env.E2E_AUTH_MODE ?? 'none'
const webDist = join(webRoot, `dist-e2e-${port}`)
rmSync(webDist, { recursive: true, force: true })
execSync(`npx vite build --outDir "${webDist}" --emptyOutDir`, { cwd: webRoot, stdio: 'inherit', env: { ...process.env, VITE_AUTH_MODE: authMode } })

rmSync(dbDir, { recursive: true, force: true })
mkdirSync(dbDir, { recursive: true })

const env = { ...process.env, AUTH_MODE: 'none', PORT: port, HOST: '127.0.0.1', PGLITE_DIR: join(dbDir, 'pglite'), WEB_DIST: webDist }
delete env.DATABASE_URL
if (process.env.E2E_LARGE_CONTENT) {
  const script = join(here, 'large-content.ts')
  env.CONTENT_DIR = execSync(`node --import tsx "${script}"`, { cwd: apiRoot, encoding: 'utf8' }).trim()
}

const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { cwd: apiRoot, stdio: 'inherit', env })
child.on('exit', code => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill())
