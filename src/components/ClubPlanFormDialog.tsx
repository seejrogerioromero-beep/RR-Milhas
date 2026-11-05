import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { formatMiles, parseNumberInput } from '@/lib/miles'
import { SegToggle } from '@/components/SegToggle'
import type { ClubBilling, ClubPlanRecord, ProgramRecord } from '@/types/database'

const labelCls = 'text-xs font-semibold text-[#23201A]'

/** Data (YYYY-MM-DD HH:MM:SS) do dia da cobrança no mês corrente, limitada ao último dia do mês. */
const billingDateThisMonth = (day: number) => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  const d = Math.min(Math.max(day, 1), last)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${y}-${pad(m + 1)}-${pad(d)} 12:00:00.000Z`
}

/**
 * Diálogo "Novo clube" (fiel ao print). Ao cadastrar um plano novo, lança no
 * extrato do programa uma SAÍDA equivalente à cobrança: valor ÷ milheiro do
 * programa = pontos debitados. Na edição, só atualiza o cadastro (não relança).
 */
export function ClubPlanFormDialog({
  open,
  onClose,
  onSaved,
  programs,
  initialPlan,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  programs: ProgramRecord[]
  initialPlan?: ClubPlanRecord | null
}) {
  const { toast } = useToast()
  const clubs = programs.filter((p) => p.is_club)

  const [programId, setProgramId] = useState('')
  const [planName, setPlanName] = useState('')
  const [pointsPerMonth, setPointsPerMonth] = useState('')
  const [billingDay, setBillingDay] = useState('10')
  const [billing, setBilling] = useState<ClubBilling>('mensal')
  const [monthlyValue, setMonthlyValue] = useState('')
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setProgramId(initialPlan?.program || '')
    setPlanName(initialPlan?.plan_name || '')
    setPointsPerMonth(initialPlan?.points_per_month ? String(initialPlan.points_per_month) : '')
    setBillingDay(initialPlan?.billing_day ? String(initialPlan.billing_day) : '10')
    setBilling(initialPlan?.billing || 'mensal')
    setMonthlyValue(
      initialPlan?.monthly_value != null
        ? initialPlan.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : '',
    )
    setActive(initialPlan ? initialPlan.active !== false : true)
    setErrors({})
  }, [open, initialPlan])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const program = programs.find((p) => p.id === programId)
    const value = parseNumberInput(monthlyValue) ?? 0
    const day = parseInt(billingDay, 10)
    const points = parseNumberInput(pointsPerMonth) ?? 0

    if (!programId) errs.program = 'Escolha o programa'
    if (!planName.trim()) errs.plan_name = 'Informe o nome do plano'
    if (!(day >= 1 && day <= 31)) errs.billing_day = 'Dia entre 1 e 31'
    if (value <= 0) errs.monthly_value = 'Informe o valor'

    // Pontos debitados = valor ÷ milheiro do programa (× 1.000)
    const costK = program?.cost_per_thousand || 0
    const quantity = costK > 0 ? Math.round((value / costK) * 1000) : points
    if (!initialPlan && program && quantity > 0 && quantity > (program.balance || 0)) {
      errs.monthly_value = `Saldo insuficiente: ${formatMiles(program.balance || 0)} milhas`
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const payload = {
        program: programId,
        plan_name: planName.trim(),
        points_per_month: points || undefined,
        billing_day: day,
        billing,
        monthly_value: value,
        active,
      }

      if (initialPlan) {
        await pb.collection('club_plans').update(initialPlan.id, payload)
        toast({ title: 'Clube atualizado' })
      } else {
        await pb.collection('club_plans').create(payload)
        if (program && quantity > 0) {
          await pb.collection('program_entries').create({
            program: programId,
            type: 'saida',
            description: `Clube ${planName.trim()} (${billing === 'mensal' ? 'mensal' : 'anual'})`,
            quantity,
            cost_per_thousand: costK,
            date: billingDateThisMonth(day),
          })
          await pb
            .collection('programs')
            .update(programId, { balance: (program.balance || 0) - quantity })
        }
        toast({
          title: 'Clube cadastrado',
          description:
            quantity > 0
              ? `Saída de ${formatMiles(quantity)} milhas lançada no extrato.`
              : undefined,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white">
        <DialogHeader className="pb-1">
          <DialogTitle className="font-serif text-xl font-bold text-[#23201A]">
            {initialPlan ? 'Editar clube' : 'Novo clube'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6E6A5E]">
            O valor mensal vira o custo dos pontos lançados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-program" className={labelCls}>
              Programa
            </Label>
            <select
              id="cp-program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer"
            >
              <option value="">Escolha o programa</option>
              {clubs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatMiles(p.balance || 0)}
                </option>
              ))}
            </select>
            {clubs.length === 0 && (
              <p className="text-[11px] text-[#6E6A5E]">
                Marque um programa como clube na lista abaixo para ele aparecer aqui.
              </p>
            )}
            {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-name" className={labelCls}>
              Nome do plano
            </Label>
            <Input
              id="cp-name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Clube Smiles 10 mil"
              className="rrmilhas-input"
            />
            {errors.plan_name && <p className="text-xs text-[#C4452F]">{errors.plan_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-points" className={labelCls}>
                Pontos por mês
              </Label>
              <Input
                id="cp-points"
                inputMode="numeric"
                value={pointsPerMonth}
                onChange={(e) => setPointsPerMonth(e.target.value)}
                placeholder="Ex.: 10000"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-day" className={labelCls}>
                Dia da cobrança
              </Label>
              <Input
                id="cp-day"
                inputMode="numeric"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="10"
                className="rrmilhas-input"
              />
              {errors.billing_day && <p className="text-xs text-[#C4452F]">{errors.billing_day}</p>}
            </div>
          </div>

          <SegToggle
            value={billing}
            onChange={(v) => setBilling(v)}
            options={[
              { value: 'mensal', label: 'Cobrança mensal' },
              { value: 'anual', label: 'Cobrança anual' },
            ]}
          />

          <div className="space-y-1.5">
            <Label htmlFor="cp-value" className={labelCls}>
              {billing === 'mensal' ? 'Valor mensal (R$)' : 'Valor anual (R$)'}
            </Label>
            <Input
              id="cp-value"
              inputMode="decimal"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
              placeholder="Ex.: 149,90"
              className="rrmilhas-input"
            />
            {errors.monthly_value && (
              <p className="text-xs text-[#C4452F]">{errors.monthly_value}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#E8E2D6] bg-[#FBF8F1] px-4 h-12">
            <Label htmlFor="cp-active" className={labelCls}>
              Clube ativo
            </Label>
            <Switch id="cp-active" checked={active} onCheckedChange={setActive} />
          </div>

          {errors.form && <p className="text-sm text-[#C4452F]">{errors.form}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-semibold"
          >
            {saving ? 'Salvando...' : initialPlan ? 'Salvar clube' : 'Cadastrar clube'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
