import React, { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Ícone oficial do Google (multicolorido, inline SVG — sem rede externa).
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  )
}

interface GoogleLoginButtonProps {
  /** Chamado após autenticação bem-sucedida (para redirecionar). */
  onAuthenticated?: () => void
}

export function GoogleLoginButton({ onAuthenticated }: GoogleLoginButtonProps) {
  const { loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await loginWithGoogle()
      onAuthenticated?.()
    } catch (err: unknown) {
      const raw =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as { message?: string })?.message ||
        String(err)
      const lower = raw.toLowerCase()
      if (
        lower.includes('provider is not enabled') ||
        lower.includes('oauth2 provider not enabled') ||
        lower.includes('not enabled') ||
        lower.includes('client_id') ||
        lower.includes('client secret')
      ) {
        setError(
          'O login com Google ainda não está configurado no servidor. ' +
            'Defina os secrets GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no painel ' +
            'Skip Cloud (em Configurações → Secrets) e republique o aplicativo.',
        )
      } else if (lower.includes('acesso restrito') || lower.includes('forbidden')) {
        setError('Acesso restrito ao proprietário do aplicativo.')
      } else if (
        lower.includes('popup') ||
        lower.includes('cancelled') ||
        lower.includes('aborted')
      ) {
        // Usuário fechou o popup — silencioso, não é erro.
      } else {
        setError('Não foi possível entrar com o Google. Tente novamente ou use e-mail e senha.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full h-11 rounded-xl bg-white border border-[#E8E2D6] hover:bg-[#FAF7F0] text-[#23201A] font-medium text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-[#16418F] border-t-transparent rounded-full animate-spin" />
            <span>Abrindo o Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon />
            <span>Entrar com Google</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#C4452F]/10 border border-[#C4452F]/20 text-[#C4452F] text-xs flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  )
}
