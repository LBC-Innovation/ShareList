import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@sharelist/shared'
import * as api from '../lib/api'
import { subscribeConnectivity } from '../lib/connectivity'

export type AuthSessionState = 'anonymous' | 'authenticated' | 'expired'

interface AuthContextValue {
  user: User | null
  loading: boolean
  session: AuthSessionState
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function userFromHint(hint: api.SessionHint): User {
  return {
    id: hint.id,
    email: hint.email,
    displayName: hint.email || 'ShareList',
    connectedPlatforms: [],
    createdAt: '',
    role: 'user',
    permissions: [],
  }
}

function rememberUser(next: User): void {
  api.storeSessionHint({ id: next.id, email: next.email })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<AuthSessionState>('anonymous')
  const userRef = useRef<User | null>(null)
  userRef.current = user

  const applyAuthenticated = (next: User): void => {
    rememberUser(next)
    setUser(next)
    setSession('authenticated')
  }

  const keepAuthenticated = (): void => {
    const hint = api.readSessionHint()
    if (hint) setUser(userFromHint(hint))
    else if (!userRef.current) setUser(userFromHint({ id: 'session', email: '' }))
    setSession('authenticated')
  }

  const expireSession = (): void => {
    api.clearToken()
    setUser(null)
    setSession('expired')
  }

  const revalidate = async (): Promise<void> => {
    if (!api.hasSessionToken()) return
    const result = await api.getMe()
    if (!api.isError(result)) {
      applyAuthenticated(result.data)
      return
    }
    if (api.isUnauthenticated(result)) {
      expireSession()
      return
    }
    keepAuthenticated()
  }

  useEffect(() => {
    const restore = async () => {
      if (!api.hasSessionToken()) {
        setSession('anonymous')
        setLoading(false)
        return
      }

      keepAuthenticated()
      const result = await api.getMe()
      if (!api.isError(result)) applyAuthenticated(result.data)
      else if (api.isUnauthenticated(result)) expireSession()
      else keepAuthenticated()
      setLoading(false)
    }
    void restore()
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void revalidate()
    }
    document.addEventListener('visibilitychange', onVisible)
    const unsubscribe = subscribeConnectivity(() => {
      if (navigator.onLine) void revalidate()
    })
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const result = await api.login(email, password)
    if (api.isError(result)) return result.error.message
    if (!result.data.session) return 'No session returned'

    api.storeToken(result.data.session.access_token)
    const meResult = await api.getMe()
    if (!api.isError(meResult)) {
      applyAuthenticated(meResult.data)
      return null
    }
    if (api.isUnauthenticated(meResult)) {
      expireSession()
      return meResult.error.message
    }
    const fallback = result.data.user
    if (fallback) applyAuthenticated(userFromHint({ id: fallback.id, email: fallback.email }))
    else keepAuthenticated()
    return null
  }

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const result = await api.register(email, password)
    if (api.isError(result)) return result.error.message
    if (!result.data.session) return null

    api.storeToken(result.data.session.access_token)
    const meResult = await api.getMe()
    if (!api.isError(meResult)) {
      applyAuthenticated(meResult.data)
      return null
    }
    if (api.isUnauthenticated(meResult)) {
      expireSession()
      return meResult.error.message
    }
    const fallback = result.data.user
    if (fallback) applyAuthenticated(userFromHint({ id: fallback.id, email: fallback.email }))
    return null
  }

  const signOut = async (): Promise<void> => {
    await api.logout()
    api.clearToken()
    setUser(null)
    setSession('anonymous')
  }

  const refreshUser = async (): Promise<void> => {
    await revalidate()
  }

  return (
    <AuthContext.Provider value={{ user, loading, session, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
