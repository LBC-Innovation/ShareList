import type { ApiError } from '@sharelist/shared'
import type { NotificationInstance } from 'antd/es/notification/interface'

export function notifyApiFailure(
  notifyApi: NotificationInstance,
  title: string,
  result: ApiError,
): void {
  const rateLimited = result.error.code === 'PROVIDER_RATE_LIMITED'
  notifyApi[rateLimited ? 'warning' : 'error']({
    message: rateLimited ? 'A music service is rate limiting requests' : title,
    description: result.error.message,
    placement: 'topRight',
    duration: rateLimited ? 12 : 4.5,
  })
}

export function notifyShareListWarnings(
  notifyApi: NotificationInstance,
  warnings: string[] | undefined,
): void {
  if (!warnings?.length) return
  const rateLimited = warnings.some(warning => warning.toLowerCase().includes('rate limiting'))
  notifyApi.warning({
    message: rateLimited ? 'A music service is rate limiting requests' : 'Some playlists could not be loaded',
    description: warnings[0],
    placement: 'topRight',
    duration: 12,
  })
}
