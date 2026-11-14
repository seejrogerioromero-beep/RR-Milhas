import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import type { CardProfileRecord, ProgramRecord, CreditCardRecord } from '@/types/database'
import { maskBRL, parseNumberInput } from '@/lib/miles'
import { cn } from '@/lib/utils'

/**
 * Formulário "Novo cartão" (modal), fiel ao print: programa que recebe os
 * pontos, nome, pontos por real, anuidade, fechamento, toggle "Cartão ativo"
 * e o perfil de salas VIP (base Santander — collection card_profiles).
 */
export function CardFormDialog({
  open,
  onClose,
  programs,
  initialCard,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  programs: ProgramRecord[]
  initialCard?: CreditCardRecord | null
  onSaved?: () => void
}) {
  const { toast } = useToast()
  const editing = Boolean(initialCard?.id)

  const [programId, setProgramId] = useState('')
  const [name, setName] = useState('')
  const [pontosPorReal, setPontosPorReal] = useState('')
  const [anuidade, setAnuidade] = useState('')
  const [fechamento, setFechamento] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [perfil, setPerfil] = useState('')
  const [profiles, setProfiles] = useState<CardProfileRecord[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Perfis da base de salas VIP (7 códigos Santander).
  useEffect(() => {
    if (!open || profiles.length > 0) return
    pb.collection('card_profiles')
      .getFullList({ sort: 'codigo' })
      .then((rows) => setProfiles(rows as unknown as CardProfileRecord[]))
      .catch(() => {})
  }, [open, profiles.length])

  useEffect(() => {
    if (!open) return
    if (initialCard) {
      setProgramId(initialCard.program || '')
      setName(initialCard.name || '')
      setPontosPorReal(
        initialCard.pontos_por_real != null
          ? String(initialCard.pontos_por_real).replace('.', ',')
          : '',
      )
      setAnuidade(
        initialCard.anuidade != null ? initialCard.anuidade.toFixed(2).replace('.', ',') : '',
      )
      setFechamento(initialCard.fechamento || '')
      setAtivo(initialCard.ativo !== false)
      setPerfil(initialCard.perfil || '')
    } else {
      setProgramId('')
      setName('')
      setPontosPorReal('')
      setAnuidade('')
      setFechamento('')
      setAtivo(true)
      setPerfil('')
    }
    setErrors({})
  }, [open, initialCard])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!programId) errs.program = 'Escolha o programa'
    if (!name.trim()) errs.name = 'Informe o nome do cartão'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        program: programId,
        pontos_por_real: parseNumberInput(pontosPorReal) || 0,
        anuidade: parseNumberInput(anuidade) || 0,
        fechamento: fechamento.trim() || undefined,
        ativo,
        perfil: perfil || undefined,
      }
      if (editing && initialCard?.id) {
        await pb.collection('credit_cards').update(initialCard.id, data)
        toast({ title: 'Cartão atualizado' })
      } else {
        await pb.collection('credit_cards').create(data)
        toast({ title: 'Cartão cadastrado', description: `${name.trim()} já aparece na lista.` })
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] rounded-2xl bg-white">
        <DialogHeader className="pb-1">
          <DialogTitle className="font-serif text-xl font-bold text-[#23201A]">
            {editing ? 'Editar cartão' : 'Novo cartão'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* 1: programa que recebe os pontos */}
          <div className="space-y-1.5">
            <Label htmlFor="cc-program" className="text-xs font-semibold text-[#23201A]">
              Programa que recebe os pontos
            </Label>
            <select
              id="cc-program"
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value)
                setErrors((p) => ({ ...p, program: '' }))
              }}
              className={cn(
                'rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer',
                errors.program && 'border-[#C4452F]',
              )}
            >
              <option value="">Escolha o programa</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {(p.balance || 0).toLocaleString('pt-BR')}
                </option>
              ))}
            </select>
            {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
          </div>

          {/* 2: nome do cartão */}
          <div className="space-y-1.5">
            <Label htmlFor="cc-name" className="text-xs font-semibold text-[#23201A]">
              Nome do cartão
            </Label>
            <Input
              id="cc-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((p) => ({ ...p, name: '' }))
              }}
              maxLength={80}
              placeholder="Ex.: Santander Unlimited Mastercard Black"
              className={cn('rrmilhas-input', errors.name && 'border-[#C4452F]')}
            />
            {errors.name && <p className="text-xs text-[#C4452F]">{errors.name}</p>}
          </div>

          {/* 2b: perfil de salas VIP */}
          <div className="space-y-1.5">
            <Label htmlFor="cc-perfil" className="text-xs font-semibold text-[#23201A]">
              Perfil de salas VIP (opcional)
            </Label>
            <select
              id="cc-perfil"
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer"
            >
              <option value="">Sem perfil</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#6E6A5E]">
              Define quais salas e restaurantes da base o cartão dá acesso.
            </p>
          </div>

          {/* 3: pontos por real / anuidade / fechamento */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-ppr" className="text-xs font-semibold text-[#23201A]">
                Pontos por real
              </Label>
              <Input
                id="cc-ppr"
                inputMode="decimal"
                value={pontosPorReal}
                onChange={(e) => setPontosPorReal(e.target.value)}
                placeholder="Ex.: 0,4"
                className="rrmilhas-input tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-fee" className="text-xs font-semibold text-[#23201A]">
                Anuidade (R$)
              </Label>
              <Input
                id="cc-fee"
                inputMode="decimal"
                value={anuidade}
                onChange={(e) => setAnuidade(maskBRL(e.target.value))}
                placeholder="Ex.: 1200"
                className="rrmilhas-input tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-close" className="text-xs font-semibold text-[#23201A]">
                Fechamento
              </Label>
              <Input
                id="cc-close"
                value={fechamento}
                onChange={(e) => setFechamento(e.target.value)}
                maxLength={20}
                placeholder="Dia"
                className="rrmilhas-input"
              />
            </div>
          </div>

          {/* 4: dica */}
          <p className="text-xs text-[#6E6A5E]">Ex.: 2,2 pontos por dólar vira 0,4.</p>

          {/* 5: cartão ativo */}
          <div className="flex items-center justify-between rounded-xl border border-[#E8E2D6] bg-[#FAF7F0] px-4 py-3">
            <span className="text-sm font-medium text-[#23201A]">Cartão ativo</span>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          {/* 6: cadastrar */}
          <Button
            type="submit"
            disabled={saving || programs.length === 0}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#D9A93F] to-[#B98A28] text-[#23201A] font-semibold hover:opacity-90 active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar cartão'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
