import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MailCheck, AlertCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})

    if (!email.trim()) {
      setFieldErrors({ email: 'E-mail é obrigatório' })
      return
    }

    setIsLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(email)
      setSent(true)
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      setFieldErrors(extracted)
      if (Object.keys(extracted).length === 0) {
        setGeneralError(
          'Não foi possível enviar o link de recuperação. Verifique o e-mail informado.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute w-[400px] h-[400px] rounded-full bg-[#E8A33D]/10 blur-[100px] -top-16 -right-16"
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
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#2F8F5B]/10 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-8 h-8 text-[#2F8F5B]" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-[#23201A] mb-2">
                Verifique seu e-mail
              </h1>
              <p className="text-sm text-[#6E6A5E] mb-6 leading-relaxed">
                Enviamos um link de recuperação para{' '}
                <span className="font-medium text-[#23201A]">{email}</span>. Siga as instruções para
                redefinir sua senha.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white font-medium"
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="font-serif text-2xl font-semibold text-[#23201A] mb-1.5">
                  Recuperar acesso
                </h1>
                <p className="text-sm text-[#6E6A5E] leading-relaxed">
                  Informe o e-mail cadastrado e enviaremos um link seguro para redefinir sua senha.
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
                  <Label htmlFor="email" className="text-xs font-semibold text-[#23201A]">
                    E-mail cadastrado
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className={`h-11 rounded-xl bg-[#FAF7F0]/60 border-[#E8E2D6] text-sm text-[#23201A] focus:border-[#E8A33D] focus:ring-2 focus:ring-[#E8A33D]/30 ${
                      fieldErrors.email ? 'border-[#C4452F] focus:border-[#C4452F]' : ''
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-[#C4452F] mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white font-medium text-sm active:scale-[0.98] mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
