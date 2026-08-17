import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Typography } from 'antd'
import { getConnectivity, subscribeConnectivity } from '../lib/connectivity'
import { useAuth } from '../context/AuthContext'

const { Text } = Typography

export function StatusBanner() {
  const { session } = useAuth()
  const location = useLocation()
  const [, setTick] = useState(0)

  useEffect(() => subscribeConnectivity(() => setTick(n => n + 1)), [])

  const connectivity = getConnectivity()
  let message: string | null = null

  if (session === 'expired' && !location.pathname.startsWith('/signin')) {
    message = 'Your session expired. Sign in again.'
  } else if (connectivity === 'offline') {
    message = "You're offline. Lists will refresh when you're back."
  } else if (connectivity === 'api-down' && session === 'authenticated') {
    message = "Can't reach ShareList. Your account is still signed in."
  } else if (connectivity === 'api-down') {
    message = "Can't reach ShareList right now."
  }

  if (!message) return null

  return (
    <div className="sl-status-banner" role="status">
      <Text style={{ color: '#F1F5F9', fontSize: 12, fontWeight: 600 }}>{message}</Text>
    </div>
  )
}
