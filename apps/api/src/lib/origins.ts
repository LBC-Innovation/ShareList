const LOCAL_ORIGIN = 'http://localhost:5173'
const PROD_ORIGIN = 'https://sharelist.lbcinnovation.com'

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((value) => value.trim()).filter(Boolean)
}

function isLocalhost(origin: string): boolean {
  return origin.includes('localhost') || origin.includes('127.0.0.1')
}

function onVercel(): boolean {
  return Boolean(process.env['VERCEL'])
}

export function clientOrigins(): string[] {
  const configured = parseOrigins(process.env['CLIENT_ORIGIN'])
  if (configured.length > 0) return configured
  return onVercel() ? [PROD_ORIGIN] : [LOCAL_ORIGIN]
}

export function clientOrigin(): string {
  const origins = clientOrigins()
  if (onVercel()) {
    return origins.find((origin) => !isLocalhost(origin)) ?? PROD_ORIGIN
  }
  return origins[0] ?? LOCAL_ORIGIN
}
