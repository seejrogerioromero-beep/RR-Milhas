import React from 'react'
import { Outlet } from 'react-router-dom'

/** Shell protegido do RRMILHAS: sidebar + topo + conteúdo da rota ativa. */
export default function Layout() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex">
      <Outlet />
    </div>
  )
}

export interface LayoutShellProps {
  children: React.ReactNode
}

/** Container central de conteúdo usado por cada página. */
export function PageContainer({ children }: LayoutShellProps) {
  return <div className="fade-rise space-y-6 max-w-5xl mx-auto w-full px-4 sm:px-6">{children}</div>
}
