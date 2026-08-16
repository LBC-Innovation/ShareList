import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@sharelist/shared'
import * as api from '../lib/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore session from localStorage.
  // Magic link tokens are pre-stored into localStorage by main.tsx before
  // React mounts, so they are always available here.
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('sl_access_token')
      if (!token) {
        setLoading(false)
        return
      }
      const result = await api.getMe()
      if (api.isError(result)) {
        api.clearToken()
      } else {
        setUser(result.data)
      }
      setLoading(false)
    }
    void restore()
  }, [])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const result = await api.login(email, password)
    if (api.isError(result)) return result.error.message
    if (!result.data.session) return 'No session returned'

    api.storeToken(result.data.session.access_token)
    const meResult = await api.getMe()
    if (api.isError(meResult)) return meResult.error.message

    setUser(meResult.data)
    return null
  }

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const result = await api.register(email, password)
    if (api.isError(result)) return result.error.message
    if (!result.data.session) {
      // Supabase may require email confirmation — no session yet
      return null
    }

    api.storeToken(result.data.session.access_token)
    const meResult = await api.getMe()
    if (!api.isError(meResult)) setUser(meResult.data)
    return null
  }

  const signOut = async (): Promise<void> => {
    await api.logout()
    api.clearToken()
    setUser(null)
  }

  const refreshUser = async (): Promise<void> => {
    const result = await api.getMe()
    if (!api.isError(result)) setUser(result.data)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
