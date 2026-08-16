const LOCAL_ORIGIN = 'http://localhost:5173'
const PROD_ORIGIN = 'https://sharelist.lbcinnovation.com'

export function clientOrigins(): string[] {
  const raw = process.env['CLIENT_ORIGIN']
  if (raw) {
    return raw.split(',').map((value) => value.trim()).filter(Boolean)
  }
  return [LOCAL_ORIGIN, PROD_ORIGIN]
}

export function clientOrigin(): string {
  return clientOrigins()[0] ?? LOCAL_ORIGIN
}
