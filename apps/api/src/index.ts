import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import express, { Request, Response } from 'express'
import cors from 'cors'
import type { ApiResult } from '@sharelist/shared'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import adminRouter from './routes/admin'
import streamingRouter from './routes/streaming'
import sharelistsRouter from './routes/sharelists'
import friendsRouter from './routes/friends'

const app = express()
const PORT = process.env['PORT'] ?? 3001
const CLIENT_ORIGIN = process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  const result: ApiResult<{ status: string }> = { data: { status: 'ok' }, error: null }
  res.json(result)
})

app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/admin/users', adminRouter)
app.use('/streaming', streamingRouter)
app.use('/sharelists', sharelistsRouter)
app.use('/friends', friendsRouter)

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `API listening on port ${PORT}`,
    port: PORT,
    resendConfigured: Boolean(process.env['RESEND_API_KEY']),
  }))
})
