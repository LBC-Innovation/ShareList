import type { ApiError, ApiResult } from '@sharelist/shared'

export const ERROR_UNAUTHENTICATED = 'UNAUTHENTICATED'
export const ERROR_UNAVAILABLE = 'UNAVAILABLE'
export const ERROR_FORBIDDEN = 'FORBIDDEN'

export function isUnauthenticated(result: ApiResult<unknown>): boolean {
  return result.error !== null && result.error.code === ERROR_UNAUTHENTICATED
}

export function isUnavailable(result: ApiResult<unknown>): boolean {
  return result.error !== null && result.error.code === ERROR_UNAVAILABLE
}

export function unavailableError(message = 'ShareList is unreachable'): ApiError {
  return { data: null, error: { message, code: ERROR_UNAVAILABLE } }
}

export function unauthenticatedError(message = 'Invalid or expired token'): ApiError {
  return { data: null, error: { message, code: ERROR_UNAUTHENTICATED } }
}

function readApiError(body: unknown, fallback: string): ApiError['error'] {
  if (
    body
    && typeof body === 'object'
    && 'error' in body
    && body.error
    && typeof body.error === 'object'
    && 'message' in body.error
    && typeof (body.error as { message: unknown }).message === 'string'
  ) {
    const err = body.error as { message: string; code?: string }
    return { message: err.message, code: err.code }
  }
  return { message: fallback }
}

export function classifyHttpError(status: number, body: unknown): ApiError {
  if (status === 401) {
    const err = readApiError(body, 'Invalid or expired token')
    return { data: null, error: { message: err.message, code: ERROR_UNAUTHENTICATED } }
  }
  if (status === 403) {
    const err = readApiError(body, 'Forbidden')
    return { data: null, error: { message: err.message, code: err.code ?? ERROR_FORBIDDEN } }
  }
  if (status >= 500 || status === 0) {
    const err = readApiError(body, 'ShareList is unreachable')
    return { data: null, error: { message: err.message, code: ERROR_UNAVAILABLE } }
  }
  const err = readApiError(body, 'Request failed')
  return { data: null, error: err }
}
