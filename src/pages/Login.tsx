import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  // Campos iniciam VAZIOS — nunca pré-preencher credenciais (falha de segurança).
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!email.trim()) errors.email = 'E-mail é obrigatório'
    if (!password) errors.password = 'Senha é obrigatória'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      setFieldErrors(extracted)
      const message = (err as { message?: string })?.message || ''
      if (message.includes('Acesso restrito') || message.includes('Forbidden')) {
        setGeneralError(
          'Acesso restrito: este aplicativo pertence exclusivamente ao seu proprietário.',
        )
      } else if (Object.keys(extracted).length === 0) {
        setGeneralError('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Subtle radial amber glow */}
      <div
        className="pointer-events-none absolute w-[500px] h-[500px] rounded-full bg-[#E8A33D]/10 blur-[100px] -top-20 -left-20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute w-[400px] h-[400px] rounded-full bg-[#16418F]/8 blur-[90px] -bottom-20 -right-20"
        aria-hidden="true"
      />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Card */}
        <div className="bg-white rounded-[20px] border border-[#E8E2D6] p-8 md:p-10 shadow-[0_8px_30px_rgb(35,32,26,0.06)] animate-fade-in-up">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#0B1B36] flex items-center justify-center shadow-md mb-4 group transition-transform hover:scale-105">
              <span className="font-serif text-white font-bold text-[15px] leading-none tracking-[0.04em]">
                RRMILHAS
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F0] border border-[#E8E2D6] text-xs font-medium text-[#6E6A5E] mb-3">
              <Lock className="w-3 h-3 text-[#16418F]" />
              <span>Aplicativo pessoal seguro</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[#23201A] tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-[#6E6A5E] mt-1">
              Organizador pessoal integrado e criptografado
            </p>
          </div>

          {generalError && (
            <div className="mb-6 p-3.5 rounded-xl bg-[#C4452F]/10 border border-[#C4452F]/20 text-[#C4452F] text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#23201A]">
                E-mail de acesso
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className={`h-11 rounded-xl bg-[#FAF7F0]/60 border-[#E8E2D6] text-sm text-[#23201A] focus:border-[#E8A33D] focus:ring-2 focus:ring-[#E8A33D]/30 transition-all ${
                  fieldErrors.email ? 'border-[#C4452F] focus:border-[#C4452F]' : ''
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-[#C4452F] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-[#23201A]">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#16418F] hover:text-[#0F2C61] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-11 rounded-xl bg-[#FAF7F0]/60 border-[#E8E2D6] pr-10 text-sm text-[#23201A] focus:border-[#E8A33D] focus:ring-2 focus:ring-[#E8A33D]/30 transition-all ${
                    fieldErrors.password ? 'border-[#C4452F] focus:border-[#C4452F]' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6A5E] hover:text-[#23201A] transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-[#C4452F] mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium text-sm shadow-sm transition-all active:scale-[0.98] mt-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                'Entrar no RRMILHAS'
              )}
            </Button>
          </form>

          {/* Single-account restricted disclaimer */}
          <div className="mt-8 pt-6 border-t border-[#E8E2D6] flex items-center justify-center gap-2 text-xs text-[#6E6A5E]">
            <ShieldCheck className="w-4 h-4 text-[#16418F]" />
            <span>Acesso restrito ao proprietário</span>
          </div>
        </div>
      </div>
    </div>
  )
}
