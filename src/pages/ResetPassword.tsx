import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!token) {
      setGeneralError('Token de redefinição não encontrado ou expirado na URL.')
      return
    }
    if (!password) {
      errors.password = 'Nova senha é obrigatória'
    } else if (password.length < 8) {
      errors.password = 'A senha deve ter no mínimo 8 caracteres'
    }
    if (!passwordConfirm) {
      errors.passwordConfirm = 'Confirmação de senha é obrigatória'
    } else if (password !== passwordConfirm) {
      errors.passwordConfirm = 'As senhas não coincidem'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Faça login com a nova senha cadastrada.',
      })
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      setFieldErrors(extracted)
      if (Object.keys(extracted).length === 0) {
        setGeneralError('O link de redefinição é inválido ou expirou. Solicite um novo link.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute w-[400px] h-[400px] rounded-full bg-[#1E5C46]/10 blur-[100px] -bottom-16 -left-16"
        aria-hidden="true"
      />

      <div className="w-full max-w-[420px] relative z-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[#6E6A5E] hover:text-[#23201A] mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>

        <div className="bg-white rounded-[20px] border border-[#E8E2D6] p-8 shadow-[0_8px_30px_rgb(35,32,26,0.06)] animate-fade-in-up">
          <div className="mb-7">
            <div className="w-12 h-12 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6] flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6 text-[#1E5C46]" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-[#23201A] mb-1.5">
              Redefinir senha
            </h1>
            <p className="text-sm text-[#6E6A5E] leading-relaxed">
              Crie uma nova senha segura com no mínimo 8 caracteres.
            </p>
          </div>

          {generalError && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#C4452F]/10 border border-[#C4452F]/20 text-[#C4452F] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-[#23201A]">
                Nova senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className={`h-11 rounded-xl bg-[#FAF7F0]/60 border-[#E8E2D6] pr-10 text-sm text-[#23201A] focus:border-[#E8A33D] focus:ring-2 focus:ring-[#E8A33D]/30 ${
                    fieldErrors.password ? 'border-[#C4452F] focus:border-[#C4452F]' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6A5E] hover:text-[#23201A] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-[#C4452F] mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passwordConfirm" className="text-xs font-semibold text-[#23201A]">
                Confirmar nova senha
              </Label>
              <Input
                id="passwordConfirm"
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                className={`h-11 rounded-xl bg-[#FAF7F0]/60 border-[#E8E2D6] text-sm text-[#23201A] focus:border-[#E8A33D] focus:ring-2 focus:ring-[#E8A33D]/30 ${
                  fieldErrors.passwordConfirm ? 'border-[#C4452F] focus:border-[#C4452F]' : ''
                }`}
              />
              {fieldErrors.passwordConfirm && (
                <p className="text-xs text-[#C4452F] mt-1">{fieldErrors.passwordConfirm}</p>
              )}
            </div>

            {/* Password strength feedback */}
            <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6] text-xs text-[#6E6A5E] space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    password.length >= 8 ? 'text-[#2F8F5B]' : 'text-[#9B968A]'
                  }`}
                />
                <span>Mínimo de 8 caracteres</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white font-medium text-sm active:scale-[0.98] mt-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Redefinindo...</span>
                </div>
              ) : (
                'Redefinir senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
