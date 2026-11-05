import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'

/** Shell protegido do RRMILHAS: sidebar em seções + conteúdo da rota ativa. */
export default function Layout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export interface LayoutShellProps {
  children: React.ReactNode
}

/** Container central de conteúdo usado por cada página. */
export function PageContainer({ children }: LayoutShellProps) {
  return (
    <div className="fade-rise space-y-6 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">{children}</div>
  )
}
