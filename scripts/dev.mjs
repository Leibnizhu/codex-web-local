import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const viteCliPath = resolve(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')

const rawArgs = process.argv.slice(2)
const daemon = rawArgs.includes('-d') || rawArgs.includes('--daemon')
const viteArgs = rawArgs.filter((arg) => arg !== '-d' && arg !== '--daemon')

if (!daemon) {
  const child = spawn(process.execPath, [viteCliPath, ...viteArgs], {
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })
} else {
  const child = spawn(process.execPath, [viteCliPath, ...viteArgs], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  child.unref()

  const hostLabel = (() => {
    const hostIndex = viteArgs.findIndex((arg) => arg === '--host')
    if (hostIndex >= 0 && hostIndex + 1 < viteArgs.length) return viteArgs[hostIndex + 1]
    return 'localhost'
  })()

  const lines = [
    '',
    'Vite dev server started in daemon mode.',
    '',
    `  PID:   ${String(child.pid)}`,
    `  Host:  ${hostLabel}`,
    '',
  ]
  console.log(lines.join('\n'))
  process.exit(0)
}
