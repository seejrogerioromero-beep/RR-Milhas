import React, { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import type { TransactionRecord, TransactionType, TransactionCategory } from '@/types/database'
import { Sheet, MonthNav, DonutChart, BarChart, CountUp } from '@/components/ovv'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<TransactionCategory, { label: string; color: string; emoji: string }> =
  {
    moradia: { label: 'Moradia', color: '#16418F', emoji: '🏠' },
    alimentacao: { label: 'Alimentação', color: '#E8A33D', emoji: '🍽️' },
    transporte: { label: 'Transporte', color: '#3B6FA0', emoji: '🚗' },
    saude: { label: 'Saúde', color: '#C4452F', emoji: '💊' },
    lazer: { label: 'Lazer', color: '#7C5CBF', emoji: '🎬' },
    educacao: { label: 'Educação', color: '#2E8B8B', emoji: '📚' },
    outros: { label: 'Outros', color: '#9B968A', emoji: '📦' },
    salario: { label: 'Salário', color: '#0E8FB8', emoji: '💼' },
  }

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Financas() {
  const { toast } = useToast()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionRecord | null>(null)
  const [deleting, setDeleting] = useState<TransactionRecord | null>(null)

  // form state
  const [description, setDescription] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [type, setType] = useState<TransactionType>('despesa')
  const [category, setCategory] = useState<TransactionCategory>('alimentacao')
  const [date, setDate] = useState(now.toISOString().slice(0, 10))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    pb.collection('transactions')
      .getFullList({ sort: '-date' })
      .then((res) => setTransactions(res as unknown as TransactionRecord[]))
      .catch(console.error)
  }, [])

  useRealtime<TransactionRecord>('transactions', (e) => {
    setTransactions((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date?.slice(0, 7) === monthPrefix),
    [transactions, monthPrefix],
  )

  const receitas = monthTx.filter((t) => t.type === 'receita').reduce((s, t) => s + t.amount, 0)
  const despesas = monthTx.filter((t) => t.type === 'despesa').reduce((s, t) => s + t.amount, 0)
  const saldo = receitas - despesas

  const donutSlices = useMemo(() => {
    const byCat: Record<string, number> = {}
    for (const tx of monthTx) {
      if (tx.type === 'despesa') byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount
    }
    return Object.entries(byCat)
      .map(([cat, value]) => ({
        label: CATEGORY_META[cat as TransactionCategory]?.label || cat,
        value,
        color: CATEGORY_META[cat as TransactionCategory]?.color || '#9B968A',
      }))
      .sort((a, b) => b.value - a.value)
  }, [monthTx])

  // Daily bars
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dailyBars = useMemo(() => {
    const byDay: Record<number, number> = {}
    for (const tx of monthTx) {
      const day = parseInt(tx.date?.slice(8, 10) || '1', 10)
      byDay[day] = (byDay[day] || 0) + (tx.type === 'receita' ? tx.amount : -tx.amount)
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      value: byDay[i + 1] || 0,
    }))
  }, [monthTx, daysInMonth])

  const groupedByDay = useMemo(() => {
    const groups: Record<string, TransactionRecord[]> = {}
    for (const tx of [...monthTx].sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
      const day = tx.date?.slice(0, 10) || '—'
      if (!groups[day]) groups[day] = []
      groups[day].push(tx)
    }
    return Object.entries(groups)
  }, [monthTx])

  const changeMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setMonth(d.getMonth())
    setYear(d.getFullYear())
  }

  const openCreate = () => {
    setEditing(null)
    setDescription('')
    setAmountInput('')
    setType('despesa')
    setCategory('alimentacao')
    setDate(now.toISOString().slice(0, 10))
    setFieldErrors({})
    setSheetOpen(true)
  }

  const openEdit = (tx: TransactionRecord) => {
    setEditing(tx)
    setDescription(tx.description)
    setAmountInput(tx.amount.toFixed(2).replace('.', ','))
    setType(tx.type)
    setCategory(tx.category)
    setDate(tx.date?.slice(0, 10) || '')
    setFieldErrors({})
    setSheetOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!description.trim()) errors.description = 'Descrição é obrigatória'
    if (description.length > 140) errors.description = 'Máximo de 140 caracteres'
    const parsedAmount = parseFloat(amountInput.replace(/\./g, '').replace(',', '.'))
    if (!amountInput.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Informe um valor válido maior que zero'
    }
    if (!date) errors.date = 'Data é obrigatória'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    try {
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        type,
        category,
        date: `${date} 12:00:00`,
      }
      if (editing) {
        await pb.collection('transactions').update(editing.id, payload)
        toast({ title: 'Transação salva', description: 'Alterações registradas com sucesso.' })
      } else {
        await pb.collection('transactions').create(payload)
        toast({ title: 'Transação registrada', description: 'Seu movimento financeiro foi salvo.' })
      }
      setSheetOpen(false)
    } catch (err: unknown) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await pb.collection('transactions').delete(deleting.id)
      toast({ title: 'Transação excluída' })
      setDeleting(null)
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleAmountInput = (raw: string) => {
    // BRL mask: digits only, formatted as decimal with comma
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      setAmountInput('')
      return
    }
    const numeric = parseInt(digits, 10) / 100
    setAmountInput(
      numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    )
  }

  return (
    <div className="fade-rise space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-2xl font-semibold text-[#23201A]">Finanças</h1>
          <MonthNav
            month={month}
            label={`${MONTH_NAMES[month]} ${year}`}
            onPrev={() => changeMonth(-1)}
            onNext={() => changeMonth(1)}
          />
        </div>
        <Button
          onClick={openCreate}
          className="h-11 px-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> Nova transação
        </Button>
      </header>

      {/* Summary trio */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="paper-card p-5 border-t-4 border-t-[#0E8FB8]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6E6A5E] mb-2">
            <TrendingUp className="w-4 h-4 text-[#0E8FB8]" /> Receitas
          </div>
          <p className="text-2xl font-bold text-[#0E8FB8] tabular-nums">
            <CountUp value={receitas} format={formatBRL} />
          </p>
        </div>
        <div className="paper-card p-5 border-t-4 border-t-[#C4452F]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6E6A5E] mb-2">
            <TrendingDown className="w-4 h-4 text-[#C4452F]" /> Despesas
          </div>
          <p className="text-2xl font-bold text-[#C4452F] tabular-nums">
            <CountUp value={despesas} format={formatBRL} />
          </p>
        </div>
        <div className="paper-card p-5 border-t-4 border-t-[#E8A33D]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6E6A5E] mb-2">
            <PiggyBank className="w-4 h-4 text-[#E8A33D]" /> Saldo
          </div>
          <p
            className={cn(
              'text-2xl font-bold tabular-nums',
              saldo >= 0 ? 'text-[#0E8FB8]' : 'text-[#C4452F]',
            )}
          >
            <CountUp value={saldo} format={formatBRL} />
          </p>
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="paper-card p-5">
          <h3 className="font-serif text-lg font-semibold text-[#23201A] mb-4">
            Despesas por categoria
          </h3>
          <DonutChart slices={donutSlices} centerLabel="Gastos" />
        </div>
        <div className="paper-card p-5">
          <h3 className="font-serif text-lg font-semibold text-[#23201A] mb-4">
            Saldo diário do mês
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <BarChart data={dailyBars} />
            </div>
          </div>
        </div>
      </section>

      {/* Transactions grouped by day */}
      <section className="space-y-5">
        <h3 className="font-serif text-lg font-semibold text-[#23201A]">Movimentações do mês</h3>
        {groupedByDay.length === 0 && (
          <div className="paper-card p-8 text-center">
            <p className="text-sm text-[#6E6A5E]">Nenhuma movimentação neste mês.</p>
          </div>
        )}
        {groupedByDay.map(([day, items]) => (
          <div key={day} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6E6A5E] px-1">
              {new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h4>
            {items.map((tx, i) => (
              <TxRow
                key={tx.id}
                tx={tx}
                index={i}
                onEdit={() => openEdit(tx)}
                onDelete={() => setDeleting(tx)}
              />
            ))}
          </div>
        ))}
      </section>

      {/* Create/Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Editar transação' : 'Nova transação'}
        side="right"
      >
        <form
          onSubmit={handleSave}
          className="space-y-4"
          style={{ ['--accent' as string]: type === 'receita' ? '#0E8FB8' : '#C4452F' }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tx-description" className="text-xs font-semibold text-[#23201A]">
              Descrição *
            </Label>
            <Input
              id="tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mercado, salário, gasolina..."
              maxLength={140}
              className={cn('ovv-input', fieldErrors.description && 'border-[#C4452F]')}
            />
            {fieldErrors.description && (
              <p className="text-xs text-[#C4452F]">{fieldErrors.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-amount" className="text-xs font-semibold text-[#23201A]">
              Valor (R$) *
            </Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => handleAmountInput(e.target.value)}
              placeholder="0,00"
              className={cn('ovv-input tabular-nums', fieldErrors.amount && 'border-[#C4452F]')}
            />
            {fieldErrors.amount && <p className="text-xs text-[#C4452F]">{fieldErrors.amount}</p>}
          </div>

          {/* Type segmented control */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#23201A]">Tipo *</Label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
              {(['receita', 'despesa'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'h-10 rounded-lg text-sm font-semibold capitalize transition-all',
                    type === t
                      ? t === 'receita'
                        ? 'bg-[#0E8FB8] text-white shadow-sm'
                        : 'bg-[#C4452F] text-white shadow-sm'
                      : 'text-[#6E6A5E] hover:bg-white',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {fieldErrors.type && <p className="text-xs text-[#C4452F]">{fieldErrors.type}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-category" className="text-xs font-semibold text-[#23201A]">
              Categoria *
            </Label>
            <select
              id="tx-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="ovv-input w-full h-11 px-3 text-sm text-[#23201A] bg-white"
            >
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.emoji} {meta.label}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="text-xs text-[#C4452F]">{fieldErrors.category}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-date" className="text-xs font-semibold text-[#23201A]">
              Data *
            </Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ovv-input"
            />
            {fieldErrors.date && <p className="text-xs text-[#C4452F]">{fieldErrors.date}</p>}
          </div>

          <Button
            type="submit"
            disabled={saving}
            className={cn(
              'w-full h-11 rounded-xl text-white font-medium active:scale-[0.98]',
              type === 'receita'
                ? 'bg-[#0E8FB8] hover:bg-[#0B6F90]'
                : 'bg-[#C4452F] hover:bg-[#A93A26]',
            )}
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar transação'}
          </Button>
        </form>
      </Sheet>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Excluir transação?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-[#23201A]">{deleting?.description}</span> será
              removida permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="rounded-xl bg-[#C4452F] hover:bg-[#A93A26] text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------------------- TxRow ----------------------------------- */

function TxRow({
  tx,
  index,
  onEdit,
  onDelete,
}: {
  tx: TransactionRecord
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = CATEGORY_META[tx.category]
  const isReceita = tx.type === 'receita'

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="fade-rise paper-card-interactive flex items-center gap-3 p-4"
    >
      <span
        className="grid place-items-center w-10 h-10 rounded-xl shrink-0 text-lg"
        style={{ backgroundColor: `${meta?.color || '#9B968A'}18` }}
      >
        {meta?.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#23201A] truncate">{tx.description}</p>
        <span
          className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
          style={{
            backgroundColor: `${meta?.color || '#9B968A'}18`,
            color: meta?.color || '#6E6A5E',
          }}
        >
          {meta?.label}
        </span>
      </div>
      <span
        className={cn(
          'text-sm font-bold tabular-nums shrink-0',
          isReceita ? 'text-[#0E8FB8]' : 'text-[#C4452F]',
        )}
      >
        {isReceita ? '+' : '−'} {formatBRL(tx.amount)}
      </span>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#FAF7F0]"
          aria-label="Opções da transação"
        >
          <MoreVertical className="w-4 h-4 text-[#6E6A5E]" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-9 z-50 w-36 rounded-xl bg-white border border-[#E8E2D6] shadow-[0_8px_24px_rgba(35,32,26,0.10)] py-1">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#23201A] hover:bg-[#FAF7F0]"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#C4452F] hover:bg-[#C4452F]/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
