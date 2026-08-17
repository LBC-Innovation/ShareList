import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

type AppRouterProps = {
  children: ReactNode
}

export function AppRouter({ children }: AppRouterProps) {
  return <BrowserRouter>{children}</BrowserRouter>
}
