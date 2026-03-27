import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { Command } from 'commander'
import { createServer as createApp } from '../server/httpServer.js'
import { generatePassword } from '../server/password.js'

const program = new Command()
  .name('codex-web-local')
  .description('Web interface for Codex app-server')
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
