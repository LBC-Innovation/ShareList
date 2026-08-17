import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: resolve(root, '.env') })

function lanIPv4() {
  const nets = networkInterfaces()
  const preferred = ['en0', 'en1', 'eth0', 'wlan0']
  const names = [...preferred.filter((name) => nets[name]), ...Object.keys(nets)]
  const seen = new Set()

  for (const name of names) {
    if (seen.has(name)) continue
    seen.add(name)
    for (const addr of nets[name] ?? []) {
      const v4 = addr.family === 'IPv4' || addr.family === 4
      if (v4 && !addr.internal) return addr.address
    }
  }

  return null
}

const ip = lanIPv4()
if (!ip) {
  console.error('dev:device-test: no LAN IPv4 address found. Connect to Wi-Fi and retry.')
  process.exit(1)
}

const webOrigin = `http://${ip}:5173`
const apiUrl = `http://${ip}:3001`
const origins = new Set(
  (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)
origins.add('http://localhost:5173')
origins.add(webOrigin)

console.log('')
console.log(`  Device test URL:  ${webOrigin}`)
console.log(`  API on LAN:       ${apiUrl}`)
console.log('')

const child = spawn(
  'npx',
  [
    'concurrently',
    '-n',
    'api,web',
    '-c',
    'blue,green',
    'npm run dev -w apps/api',
    'npm run dev -w apps/web -- --host',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: apiUrl,
      CLIENT_ORIGIN: [...origins].join(','),
    },
  },
)

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
