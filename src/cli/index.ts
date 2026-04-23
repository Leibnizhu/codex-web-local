import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { Command } from 'commander'
import packageJson from '../../package.json'
import { createServer as createApp } from '../server/httpServer.js'
import { generatePassword } from '../server/password.js'

type UpdateCheckCache = {
  checkedAt: number
  latestVersion: string
}

const CLI_VERSION = typeof packageJson.version === 'string' ? packageJson.version.trim() || '0.0.0' : '0.0.0'
const PACKAGE_NAME = '@leibnizhu/codex-web-local'
const UPDATE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000
const UPDATE_CHECK_TIMEOUT_MS = 1500
const UPDATE_CACHE_PATH = join(homedir(), '.codex-web-local', 'update-check.json')

function parseVersionSegments(input: string): number[] | null {
  const normalized = input.trim().split('-')[0]?.split('+')[0] ?? ''
  if (!/^\d+(\.\d+)*$/.test(normalized)) return null
  return normalized.split('.').map((segment) => Number.parseInt(segment, 10))
}

function isVersionNewer(currentVersion: string, latestVersion: string): boolean {
  const currentSegments = parseVersionSegments(currentVersion)
  const latestSegments = parseVersionSegments(latestVersion)
  if (!currentSegments || !latestSegments) return false
  const maxLength = Math.max(currentSegments.length, latestSegments.length)
  for (let index = 0; index < maxLength; index += 1) {
    const current = currentSegments[index] ?? 0
    const latest = latestSegments[index] ?? 0
    if (latest > current) return true
    if (latest < current) return false
  }
  return false
}

async function readUpdateCheckCache(): Promise<UpdateCheckCache | null> {
  try {
    const raw = await readFile(UPDATE_CACHE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<UpdateCheckCache>
    if (typeof parsed.checkedAt !== 'number' || typeof parsed.latestVersion !== 'string') {
      return null
    }
    return {
      checkedAt: parsed.checkedAt,
      latestVersion: parsed.latestVersion.trim(),
    }
  } catch {
    return null
  }
}

async function writeUpdateCheckCache(latestVersion: string): Promise<void> {
  try {
    await mkdir(dirname(UPDATE_CACHE_PATH), { recursive: true })
    const payload: UpdateCheckCache = {
      checkedAt: Date.now(),
      latestVersion: latestVersion.trim(),
    }
    await writeFile(UPDATE_CACHE_PATH, JSON.stringify(payload), 'utf8')
  } catch {
    // Ignore cache write failures to avoid affecting startup.
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS)
    const encodedName = encodeURIComponent(PACKAGE_NAME)
    const response = await fetch(`https://registry.npmjs.org/${encodedName}/latest`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    const payload = (await response.json()) as { version?: unknown }
    return typeof payload.version === 'string' ? payload.version.trim() : null
  } catch {
    return null
  }
}

async function notifyIfUpdateAvailable(): Promise<void> {
  const cache = await readUpdateCheckCache()
  const now = Date.now()
  let latestVersion = ''

  if (cache && now - cache.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
    latestVersion = cache.latestVersion
  } else {
    const fetchedVersion = await fetchLatestVersion()
    if (!fetchedVersion) return
    latestVersion = fetchedVersion
    await writeUpdateCheckCache(latestVersion)
  }

  if (!latestVersion || !isVersionNewer(CLI_VERSION, latestVersion)) return
  const lines = [
    '',
    `发现新版本: ${latestVersion}（当前: ${CLI_VERSION}）`,
    `升级命令: npm install -g ${PACKAGE_NAME}@latest`,
    '',
  ]
  console.log(lines.join('\n'))
}

const program = new Command()
  .name('codex-web-local')
  .description('Web interface for Codex app-server')
  .version(CLI_VERSION)
  .option('-p, --port <port>', 'port to listen on', '3000')
  .option('--host <host>', 'host to bind (e.g. 127.0.0.1, 0.0.0.0, 100.x.x.x)')
  .option('-d, --daemon', 'run in background (daemon mode)')
  .option('--password <pass>', 'set a specific password')
  .option('--no-password', 'disable password protection')
  .parse()

const opts = program.opts<{ port: string; host?: string; daemon?: boolean; password: string | boolean }>()
const port = parseInt(opts.port, 10)
const host = opts.host

function formatAccessUrl(bindHost: string | undefined, bindPort: number): string {
  if (!bindHost || bindHost === '0.0.0.0' || bindHost === '::') {
    return `http://localhost:${String(bindPort)}`
  }
  const normalizedHost = bindHost.includes(':') && !bindHost.startsWith('[') ? `[${bindHost}]` : bindHost
  return `http://${normalizedHost}:${String(bindPort)}`
}

let password: string | undefined
if (opts.password === false) {
  password = undefined
} else if (typeof opts.password === 'string') {
  password = opts.password
} else {
  password = generatePassword()
}

function buildDaemonArgs(): string[] {
  const sourceArgs = process.argv.slice(1)
  const filtered = sourceArgs.filter((arg) => arg !== '-d' && arg !== '--daemon')

  const hasPasswordArg = filtered.some((arg) => arg === '--password' || arg === '--no-password')
  if (!hasPasswordArg) {
    if (password) {
      filtered.push('--password', password)
    } else {
      filtered.push('--no-password')
    }
  }

  return filtered
}

if (opts.daemon) {
  const child = spawn(process.execPath, buildDaemonArgs(), {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      CODEX_WEB_LOCAL_DAEMON: '1',
    },
  })
  child.unref()

  const lines = [
    '',
    'Codex Web Local daemon started.',
    '',
    `  PID:      ${String(child.pid)}`,
    `  Local:    ${formatAccessUrl(host, port)}`,
  ]
  if (password) {
    lines.push(`  Password: ${password}`)
  }
  lines.push('')
  console.log(lines.join('\n'))
  process.exit(0)
}

const { app, dispose } = createApp({ password })
const server = createServer(app)

server.listen(port, host, () => {
  const lines = [
    '',
    'Codex Web Local is running!',
    '',
    `  Local:    ${formatAccessUrl(host, port)}`,
  ]

  if (password) {
    lines.push(`  Password: ${password}`)
  }

  lines.push('')
  console.log(lines.join('\n'))
  void notifyIfUpdateAvailable()
})

function shutdown() {
  console.log('\nShutting down...')
  server.close(() => {
    dispose()
    process.exit(0)
  })
  // Force exit after timeout
  setTimeout(() => {
    dispose()
    process.exit(1)
  }, 5000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
