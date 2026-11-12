import React from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  Home,
  Award,
  Plane,
  Hotel,
  Map,
  Hourglass,
  NotebookText,
  Users,
  Calculator,
  Armchair,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [{ to: '/', label: 'Início', icon: Home }],
  },
  {
    title: 'Milhas',
    items: [
      { to: '/programas', label: 'Programas', icon: Award },
      { to: '/viagens', label: 'Viagens', icon: Map },
      { to: '/passagens', label: 'Passagens', icon: Plane },
      { to: '/hoteis', label: 'Hospedagens', icon: Hotel },
      { to: '/pontos-esperados', label: 'Pontos esperados', icon: Hourglass },
      { to: '/lancamentos', label: 'Lançamentos', icon: NotebookText },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
      { to: '/passageiros', label: 'Passageiros', icon: Users },
      { to: '/calculadoras', label: 'Calculadoras', icon: Calculator },
      { to: '/salas-vip', label: 'Salas VIP', icon: Armchair },
    ],
  },
]

/** Sidebar do RRMILHAS com grupos PRINCIPAL, MILHAS e FERRAMENTAS. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full flex-col bg-[#0B1B36] text-[#FAF7F0] w-64 shrink-0">
      {/* Marca */}
      <div className="px-5 pt-6 pb-2">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-[#16418F] shadow-sm">
            <Plane className="w-4.5 h-4.5 text-white" />
          </span>
          <span className="font-serif text-xl font-bold tracking-wide">RRMILHAS</span>
        </Link>
      </div>

      {/* Navegação em seções */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-[#8FA3C8]">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#16418F] text-white shadow-sm'
                          : 'text-[#C7D2E5] hover:bg-[#12294B] hover:text-white',
                      ].join(' ')
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé: usuário + ajustes + sair */}
      <div className="border-t border-[#12294B] px-3 py-3 space-y-1">
        <NavLink
          to="/ajustes"
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[#16418F] text-white'
                : 'text-[#C7D2E5] hover:bg-[#12294B] hover:text-white',
            ].join(' ')
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="truncate">{user?.name || 'Ajustes'}</span>
        </NavLink>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#C7D2E5] hover:bg-[#12294B] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  )
}

/** Shell protegido: sidebar fixa + conteúdo da rota ativa (mobile: drawer). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const location = useLocation()

  // Fecha o drawer sempre que a rota muda
  React.useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex">
      {/* Desktop */}
      <aside className="hidden md:block sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile: barra superior + drawer */}
      <div className="md:hidden">
        <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 bg-[#0B1B36] px-4 h-14 text-[#FAF7F0]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="grid place-items-center w-9 h-9 rounded-lg hover:bg-[#12294B]"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif text-lg font-bold tracking-wide">RRMILHAS</span>
        </header>
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-[#23201A]/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl sheet-slide">
              <div className="flex justify-end px-3 pt-3">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="grid place-items-center w-9 h-9 rounded-lg hover:bg-[#12294B] text-[#C7D2E5]"
                  aria-label="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
                <Sidebar />
              </div>
            </div>
          </>
        )}
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">{children}</main>
    </div>
  )
}

export default AppShell
