const RETURNING_KEY = 'sl_returning_user'

export function isReturningUser(): boolean {
  try {
    return localStorage.getItem(RETURNING_KEY) === '1'
  } catch {
    return false
  }
}

export function markReturningUser(): void {
  try {
    localStorage.setItem(RETURNING_KEY, '1')
  } catch {
    // ignore quota / private-mode failures
  }
}
