import { useEffect, useState } from 'react'
import { Button, Flex, Typography } from 'antd'
import { applyPwaUpdate, isPwaUpdatePending, subscribePwaUpdate } from '../lib/pwa-update'

export function UpdateBanner() {
  const [pending, setPending] = useState(() => isPwaUpdatePending())
  const [updating, setUpdating] = useState(false)

  useEffect(() => subscribePwaUpdate(() => setPending(isPwaUpdatePending())), [])

  if (!pending) return null

  return (
    <div className="sl-update-banner" role="status">
      <Flex align="center" justify="space-between" gap={12}>
        <Typography.Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>
          A new version of ShareList is available.
        </Typography.Text>
        <Button
          type="primary"
          size="small"
          loading={updating}
          onClick={() => {
            setUpdating(true)
            void applyPwaUpdate()
          }}
          style={{
            background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
            border: 'none',
            fontWeight: 700,
            height: 32,
            padding: '0 14px',
          }}
        >
          Update
        </Button>
      </Flex>
    </div>
  )
}
