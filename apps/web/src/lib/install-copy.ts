import { getClientOs, type ClientOs } from './pwa'

export type InstallCopy = {
  title: string
  description: string
  installedTitle: string
  installedDescription: string
  platformLabel: string
}

const COPY: Record<ClientOs, InstallCopy> = {
  ios: {
    title: 'Add ShareList to your Home Screen',
    description: 'Use it like an app — full screen, from your Home Screen.',
    installedTitle: 'Installed on this iPhone or iPad',
    installedDescription: 'ShareList is running as an app on this device.',
    platformLabel: 'iPhone & iPad',
  },
  android: {
    title: 'Install ShareList on this phone',
    description: 'Add it to your Home Screen for a full-screen app.',
    installedTitle: 'Installed on this phone',
    installedDescription: 'ShareList is running as an app on this phone.',
    platformLabel: 'Android',
  },
  macos: {
    title: 'Install ShareList on this Mac',
    description: 'Open it in its own window from the Dock, like any other app.',
    installedTitle: 'Installed on this Mac',
    installedDescription: 'ShareList is running as an app on this Mac.',
    platformLabel: 'This Mac',
  },
  windows: {
    title: 'Install ShareList on this PC',
    description: 'Open it in its own window from the taskbar, like any other app.',
    installedTitle: 'Installed on this PC',
    installedDescription: 'ShareList is running as an app on this PC.',
    platformLabel: 'This PC',
  },
  linux: {
    title: 'Install ShareList on this computer',
    description: 'Open it in its own window, like any other app.',
    installedTitle: 'Installed on this computer',
    installedDescription: 'ShareList is running as an app on this computer.',
    platformLabel: 'This computer',
  },
  other: {
    title: 'Install ShareList on this device',
    description: 'Install the app for a full-screen experience on this device.',
    installedTitle: 'Installed on this device',
    installedDescription: 'ShareList is running as an installed app on this device.',
    platformLabel: 'This device',
  },
}

export function getInstallCopy(os: ClientOs = getClientOs()): InstallCopy {
  return COPY[os]
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

export function getInstallPlatform(os: ClientOs = getClientOs()): InstallPlatform {
  if (os === 'ios') return 'ios'
  if (os === 'android') return 'android'
  return 'desktop'
}
