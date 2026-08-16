import { useCallback, useEffect, useState } from 'react'
import {
  dismissInstallPrompt,
  getDeferredPrompt,
  isAppInstalled,
  isInstallDismissed,
  isIosDevice,
  promptInstall,
  subscribePwaInstall,
} from '../lib/pwa'

export function usePwaInstall() {
  const [, setTick] = useState(0)

  useEffect(() => subscribePwaInstall(() => setTick(n => n + 1)), [])

  const installed = isAppInstalled()
  const dismissed = isInstallDismissed()
  const ios = isIosDevice()
  const hasNativePrompt = !!getDeferredPrompt()

  const install = useCallback(() => promptInstall(), [])
  const dismiss = useCallback(() => { dismissInstallPrompt() }, [])

  return {
    installed,
    ios,
    hasNativePrompt,
    canPrompt: !installed && !dismissed && (hasNativePrompt || ios),
    install,
    dismiss,
  }
}
