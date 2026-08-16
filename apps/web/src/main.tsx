import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

// Handle Supabase hash-based redirects (magic link, password reset, etc.)
// before React mounts. The root route redirects immediately and strips the
// hash before any useEffect can read it, so we must capture it here.
;(function handleAuthHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const params = new URLSearchParams(hash)
  const token = params.get('access_token')
  const type = params.get('type')
  if (token && type === 'magiclink') {
    localStorage.setItem('sl_access_token', token)
    window.history.replaceState(null, '', window.location.pathname)
  }
})()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
