import { existsSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const envExample = resolve(root, '.env.example')
const envFile = resolve(root, '.env')

if (!existsSync(envFile)) {
  copyFileSync(envExample, envFile)
  console.log('Created .env from .env.example — fill in your credentials before starting.')
} else {
  console.log('.env already exists, skipping.')
}

console.log('')
console.log('Setup complete.')
console.log('')
console.log('Next steps:')
console.log('  1. Edit .env with your Supabase credentials and any API keys')
console.log('  2. Run:  npm run dev')
console.log('')
