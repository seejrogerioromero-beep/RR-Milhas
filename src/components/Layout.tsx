import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  StickyNote,
  Repeat,
  Settings,
  LogOut,
  Lock,
  Menu,
  X,
  Search,
  BadgeCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getFileName, getUserAvatarUrl, getPbFileUrl } from '@/lib/pocketbase/avatar'

const NAV_ITEMS = [
  { to: '/', label: 'Resumo', icon: LayoutDashboard },
  { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/anotacoes', label: 'Anotações', icon: StickyNote },
  { to: '/habitos', label: 'Hábitos', icon: Repeat },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const avatarUrl = getUserAvatarUrl(user)
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex">
      {/* Desktop / Tablet Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-[#1E2A24] text-white fixed inset-y-0 left-0 z-40',
          'w-16 lg:w-[264px] transition-[width] duration-200',
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 lg:px-5 pt-6 pb-5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <span className="font-serif font-bold text-lg tracking-wider text-white">OVV</span>
          </div>
          <div className="hidden lg:block">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#E8A33D]" />
              <p className="text-[13px] font-medium text-white/90">Aplicativo pessoal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-180 group',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-[#E8A33D] transition-all',
                      isActive ? 'h-5' : 'h-0',
                    )}
                  />
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="hidden lg:inline truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 lg:p-4 border-t border-white/10 mt-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 rounded-full border-2 border-white/20 shrink-0">
              <AvatarImage src={avatarUrl} alt={user?.name} />
              <AvatarFallback className="bg-[#E8A33D]/30 text-white text-xs font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate flex items-center gap-1">
                {user?.name}
                {user?.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#E8A33D] shrink-0" />}
              </p>
              <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="hidden lg:grid place-items-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:pl-16 lg:pl-[264px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#FAF7F0]/95 backdrop-blur border-b border-[#E8E2D6]">
          <div className="max-w-[1200px] mx-auto w-full px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden grid place-items-center w-11 h-11 rounded-xl hover:bg-[#E8E2D6]/60 transition-colors"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5 text-[#23201A]" />
              </button>
              <span className="font-serif text-xl md:text-2xl font-semibold text-[#23201A] truncate">
                {NAV_ITEMS.find((n) => n.to === location.pathname)?.label || 'OVV'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6A5E]" />
                <Input
                  id="global-quick-search"
                  className="w-48 md:w-64 h-10 rounded-xl bg-white border-[#E8E2D6] pl-9 text-sm focus:border-[#E8A33D] focus:ring-2 focus:ring-[#E8A33D]/30"
                  placeholder="Buscar neste módulo..."
                />
              </div>
              <button
                onClick={() => navigate('/ajustes')}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A33D]"
                aria-label="Abrir Ajustes"
              >
                <Avatar className="w-9 h-9 rounded-full border border-[#E8E2D6] hover:ring-2 hover:ring-[#E8A33D]/40 transition-all">
                  <AvatarImage src={avatarUrl} alt={user?.name} />
                  <AvatarFallback className="bg-[#1E5C46] text-white text-xs font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </header>

        {/* Page container */}
        <main className="flex-1 w-full">
          <div className="max-w-[1200px] mx-auto w-full px-4 lg:px-8 py-6 lg:py-8 pb-28 md:pb-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#23201A]/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-72 bg-[#1E2A24] text-white sheet-slide flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-6 pb-4">
              <span className="font-serif text-lg font-bold tracking-wider">OVV</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="grid place-items-center w-9 h-9 rounded-lg hover:bg-white/10"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-[#E8A33D] transition-all',
                          isActive ? 'h-5' : 'h-0',
                        )}
                      />
                      <item.icon className="w-[18px] h-[18px]" />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={avatarUrl} alt={user?.name} />
                  <AvatarFallback className="bg-[#E8A33D]/30 text-white text-xs">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[#C4452F] hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E8E2D6] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-[#1E5C46]' : 'text-[#6E6A5E]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#E8A33D]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
