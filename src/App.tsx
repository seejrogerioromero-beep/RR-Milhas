import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/RequireAuth'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Programas from './pages/Programas'
import Passagens from './pages/Passagens'
import Hoteis from './pages/Hoteis'
import Viagens from './pages/Viagens'
import PontosEsperados from './pages/PontosEsperados'
import Lancamentos from './pages/Lancamentos'

import Passageiros from './pages/Passageiros'
import Calculadoras from './pages/Calculadoras'
import SalasVip from './pages/SalasVip'
import Ajustes from './pages/Ajustes'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Inicio />} />
            <Route path="/milhas" element={<Programas />} />
            <Route path="/programas" element={<Programas />} />

            <Route path="/viagens" element={<Viagens />} />
            <Route path="/passagens" element={<Passagens />} />
            <Route path="/hoteis" element={<Hoteis />} />
            <Route path="/pontos-esperados" element={<PontosEsperados />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/passageiros" element={<Passageiros />} />
            <Route path="/calculadoras" element={<Calculadoras />} />
            <Route path="/salas-vip" element={<SalasVip />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Route>

          {/* Dedicated 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
