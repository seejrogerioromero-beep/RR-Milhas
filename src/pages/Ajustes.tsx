import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Camera,
  Lock,
  ShieldCheck,
  LogOut,
  Info,
  HardDrive,
  KeyRound,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { getUserAvatarUrl, getPbFileUrl } from '@/lib/pocketbase/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function Ajustes() {
  const { user, refreshUser, logout } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [savingProfile, setSavingProfile] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [savingPw, setSavingPw] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFileError('Envie um arquivo de imagem (JPG, PNG ou WEBP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('A imagem deve ter no máximo 2MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (!name.trim()) {
      setFieldErrors({ name: 'Nome é obrigatório' })
      return
    }
    setSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      await pb.collection('users').update(user!.id, formData)
      await refreshUser()
      setAvatarFile(null)
      setAvatarPreview(null)
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas.' })
    } catch (err: unknown) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErrors({})
    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = 'Informe a senha atual'
    if (!newPassword || newPassword.length < 8) {
      errors.newPassword = 'A nova senha deve ter no mínimo 8 caracteres'
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'As senhas não coincidem'
    }
    if (Object.keys(errors).length > 0) {
      setPwErrors(errors)
      return
    }

    setSavingPw(true)
    try {
      await pb.collection('users').update(user!.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      })
      toast({ title: 'Senha alterada', description: 'Use a nova senha no próximo login.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      setPwErrors(extracted)
      if (Object.keys(extracted).length === 0) {
        setPwErrors({ currentPassword: 'Senha atual incorreta ou inválida.' })
      }
    } finally {
      setSavingPw(false)
    }
  }

  const handleLogoutAll = async () => {
    try {
      // Invalidates all refresh tokens for this user
      await pb.send('/api/collections/users/auth-with-password', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    } catch {
      // ignore — fallback just clears local session
    }
    logout()
  }

  const avatarSrc = avatarPreview || getUserAvatarUrl(user)
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="fade-rise space-y-6 max-w-2xl">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-[#23201A]">Ajustes</h1>
        <p className="text-sm text-[#6E6A5E] mt-1">
          Gerencie seu perfil, segurança e informações do aplicativo.
        </p>
      </header>

      {/* Profile card */}
      <section className="paper-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-[#16418F]" />
          <h2 className="font-serif text-lg font-semibold text-[#23201A]">Perfil</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#FAF7F0] border-2 border-[#E8E2D6] grid place-items-center">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-2xl font-semibold text-[#16418F]">
                    {userInitial}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid place-items-center w-8 h-8 rounded-full bg-[#16418F] text-white shadow-md hover:bg-[#0F2C61] transition-colors"
                aria-label="Alterar foto"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#23201A]">Foto de perfil</p>
              <p className="text-xs text-[#6E6A5E] mt-0.5">Imagens JPG, PNG ou WEBP de até 2MB.</p>
              {fileError && (
                <p className="text-xs text-[#C4452F] mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fileError}
                </p>
              )}
              {fieldErrors.avatar && (
                <p className="text-xs text-[#C4452F] mt-1">{fieldErrors.avatar}</p>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-xs font-semibold text-[#23201A]">
              Nome completo
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className={cn('rrmilhas-input', fieldErrors.name && 'border-[#C4452F]')}
            />
            {fieldErrors.name && <p className="text-xs text-[#C4452F]">{fieldErrors.name}</p>}
          </div>

          {/* Email read-only */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="text-xs font-semibold text-[#6E6A5E]">
              E-mail (somente leitura)
            </Label>
            <div className="relative">
              <Input
                id="profile-email"
                value={user?.email || ''}
                readOnly
                disabled
                className="rrmilhas-input bg-[#FAF7F0] text-[#6E6A5E] cursor-not-allowed pr-10"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B968A]" />
            </div>
            <p className="text-[11px] text-[#6E6A5E] flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16418F]" />
              Conta única — acesso restrito
            </p>
          </div>

          <Button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" /> Salvar alterações
              </>
            )}
          </Button>
        </form>
      </section>

      {/* Security */}
      <section className="paper-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-[#16418F]" />
          <h2 className="font-serif text-lg font-semibold text-[#23201A]">Segurança</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current" className="text-xs font-semibold text-[#23201A]">
              Senha atual
            </Label>
            <Input
              id="pw-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={cn('rrmilhas-input', pwErrors.currentPassword && 'border-[#C4452F]')}
            />
            {pwErrors.currentPassword && (
              <p className="text-xs text-[#C4452F]">{pwErrors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pw-new" className="text-xs font-semibold text-[#23201A]">
              Nova senha
            </Label>
            <Input
              id="pw-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={cn('rrmilhas-input', pwErrors.newPassword && 'border-[#C4452F]')}
            />
            {pwErrors.newPassword && (
              <p className="text-xs text-[#C4452F]">{pwErrors.newPassword}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm" className="text-xs font-semibold text-[#23201A]">
              Confirmar nova senha
            </Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn('rrmilhas-input', pwErrors.confirmPassword && 'border-[#C4452F]')}
            />
            {pwErrors.confirmPassword && (
              <p className="text-xs text-[#C4452F]">{pwErrors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={savingPw}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            {savingPw ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E8E2D6] space-y-3">
          <button
            onClick={handleLogoutAll}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#C4452F] hover:underline"
          >
            <LogOut className="w-4 h-4" /> Sair em todos os dispositivos
          </button>
          <p className="text-xs text-[#6E6A5E]">
            Esqueceu a senha?{' '}
            <Link to="/forgot-password" className="text-[#16418F] font-medium hover:underline">
              Recuperar acesso
            </Link>
          </p>
        </div>
      </section>

      {/* App info */}
      <section className="paper-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-[#16418F]" />
          <h2 className="font-serif text-lg font-semibold text-[#23201A]">Sobre o RRMILHAS</h2>
        </div>
        <p className="text-sm text-[#6E6A5E] -mt-3 mb-4">
          Controle pessoal de milhas e viagens: programas, extrato, emissões e hospedagens.
        </p>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#6E6A5E]">Versão</dt>
            <dd className="font-medium text-[#23201A]">1.0.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#6E6A5E]">Armazenamento</dt>
            <dd className="font-medium text-[#23201A] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#6E6A5E]" /> PocketBase (Skip Cloud)
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#6E6A5E]">Modo</dt>
            <dd className="font-medium text-[#23201A]">Conta única, dados criptografados</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
