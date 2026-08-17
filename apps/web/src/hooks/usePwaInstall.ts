import { useCallback, useEffect, useState } from 'react'
import {
  dismissInstallPrompt,
  getClientOs,
  getDeferredPrompt,
  isAppInstalled,
  isInstallDismissed,
  isIosDevice,
  promptInstall,
  subscribePwaInstall,
} from '../lib/pwa'
import { getInstallCopy } from '../lib/install-copy'

export function usePwaInstall() {
  const [, setTick] = useState(0)

  useEffect(() => subscribePwaInstall(() => setTick(n => n + 1)), [])

  const installed = isAppInstalled()
  const dismissed = isInstallDismissed()
  const ios = isIosDevice()
  const os = getClientOs()
  const copy = getInstallCopy(os)
  const hasNativePrompt = !!getDeferredPrompt()

  const install = useCallback(() => promptInstall(), [])
  const dismiss = useCallback(() => { dismissInstallPrompt() }, [])

  return {
    installed,
    ios,
    os,
    copy,
    hasNativePrompt,
    canPrompt: !installed && !dismissed && (hasNativePrompt || ios),
    install,
    dismiss,
  }
}
