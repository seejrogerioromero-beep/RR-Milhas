import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { ProgramRecord, ProgramEntryRecord, ProgramEntryType } from '@/types/database'
import { formatMiles, formatDateBR, formatBRL, maskBRL, parseNumberInput } from '@/lib/miles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Formulário de nova movimentação do extrato de um programa. */
export function EntryForm({ programId, onDone }: { programId: string; onDone: () => void }) {
  const { toast } = useToast()
  const [type, setType] = useState<ProgramEntryType>('entrada')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPerThousand, setCostPerThousand] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!description.trim()) errs.description = 'Descrição é obrigatória'
    const qty = parseNumberInput(quantity)
    if (qty == null || qty <= 0) errs.quantity = 'Informe uma quantidade válida de milhas'
    const dateStr = date ? `${date} 12:00:00.000Z` : ''
    if (!date) errs.date = 'Data é obrigatória'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const program = await pb.collection('programs').getOne(programId)
      if (type === 'entrada') {
        const cost = parseNumberInput(costPerThousand)
        if (cost == null || cost <= 0) {
          setErrors({ cost_per_thousand: 'Informe o custo do milheiro desta entrada' })
          setSaving(false)
          return
        }
        const balance = (program as ProgramRecord).balance || 0
        const avg = (program as ProgramRecord).cost_per_thousand || 0
        const totalCost = (balance * avg) / 1000 + (qty / 1000) * cost
        const totalMiles = balance + qty
        const newAvg = totalMiles > 0 ? (totalCost / totalMiles) * 1000 : 0
        await pb.collection('programs').update(programId, {
          balance: totalMiles,
          cost_per_thousand: Math.round(newAvg * 100) / 100,
        })
      } else {
        await pb.collection('programs').update(programId, {
          balance: ((program as ProgramRecord).balance || 0) - qty,
        })
      }
      await pb.collection('program_entries').create({
        program: programId,
        type,
        description: description.trim(),
        quantity: qty,
        ...(type === 'entrada' ? { cost_per_thousand: parseNumberInput(costPerThousand) } : {}),
        date: dateStr,
      })
      toast({
        title: type === 'entrada' ? 'Entrada registrada' : 'Saída registrada',
        description: 'O saldo e o custo médio do programa foram atualizados.',
      })
      onDone()
    } catch (err) {
      toast({
        title: 'Erro ao registrar movimentação',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-[#23201A]">Tipo *</Label>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
          {(['entrada', 'saida'] as ProgramEntryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'h-10 rounded-lg text-sm font-semibold transition-all',
                type === t
                  ? t === 'entrada'
                    ? 'bg-[#0E8FB8] text-white shadow-sm'
                    : 'bg-[#C4452F] text-white shadow-sm'
                  : 'text-[#6E6A5E] hover:bg-white',
              )}
            >
              {t === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entry-description" className="text-xs font-semibold text-[#23201A]">
          Descrição *
        </Label>
        <Input
          id="entry-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={160}
          placeholder="Ex: transferência do cartão, resgate de passagem..."
          className={cn('rrmilhas-input', errors.description && 'border-[#C4452F]')}
        />
        {errors.description && <p className="text-xs text-[#C4452F]">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="entry-quantity" className="text-xs font-semibold text-[#23201A]">
            Milhas *
          </Label>
          <Input
            id="entry-quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 20000"
            className={cn('rrmilhas-input tabular-nums', errors.quantity && 'border-[#C4452F]')}
          />
          {errors.quantity && <p className="text-xs text-[#C4452F]">{errors.quantity}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entry-date" className="text-xs font-semibold text-[#23201A]">
            Data *
          </Label>
          <Input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn('rrmilhas-input', errors.date && 'border-[#C4452F]')}
          />
          {errors.date && <p className="text-xs text-[#C4452F]">{errors.date}</p>}
        </div>
      </div>

      {type === 'entrada' && (
        <div className="space-y-1.5">
          <Label htmlFor="entry-cost" className="text-xs font-semibold text-[#23201A]">
            Custo do milheiro desta entrada (R$ por 1.000)
          </Label>
          <Input
            id="entry-cost"
            inputMode="decimal"
            value={costPerThousand}
            onChange={(e) => setCostPerThousand(maskBRL(e.target.value))}
            placeholder="Ex: 64,70"
            className={cn(
              'rrmilhas-input tabular-nums',
              errors.cost_per_thousand && 'border-[#C4452F]',
            )}
          />
          {errors.cost_per_thousand && (
            <p className="text-xs text-[#C4452F]">{errors.cost_per_thousand}</p>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={saving}
        className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
      >
        {saving ? 'Salvando...' : 'Registrar movimentação'}
      </Button>
    </form>
  )
}

/** Item de uma linha do extrato. */
export function EntryRow({ entry }: { entry: ProgramEntryRecord }) {
  const isEntry = entry.type === 'entrada'
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#E8E2D6]/70 last:border-0">
      <span
        className={cn(
          'grid place-items-center w-9 h-9 rounded-xl shrink-0 text-sm font-bold',
          isEntry ? 'bg-[#0E8FB8]/10 text-[#0E8FB8]' : 'bg-[#C4452F]/10 text-[#C4452F]',
        )}
      >
        {isEntry ? '+' : '−'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#23201A] truncate">{entry.description}</p>
        <p className="text-xs text-[#6E6A5E]">
          {formatDateBR(entry.date)}
          {isEntry && entry.cost_per_thousand ? (
            <> · {formatBRL(entry.cost_per_thousand)}/milheiro</>
          ) : null}
        </p>
      </div>
      <span
        className={cn(
          'text-sm font-bold tabular-nums shrink-0',
          isEntry ? 'text-[#0E8FB8]' : 'text-[#C4452F]',
        )}
      >
        {isEntry ? '+' : '−'} {formatMiles(entry.quantity)}
      </span>
    </div>
  )
}

/** Painel do extrato de um programa (lista de movimentações + botão de nova entrada). */
export function ProgramStatement({ program }: { program: ProgramRecord }) {
  const [entries, setEntries] = useState<ProgramEntryRecord[]>([])
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    pb.collection('program_entries')
      .getFullList({ filter: `program = "${program.id}"`, sort: '-date' })
      .then((res) => setEntries(res as unknown as ProgramEntryRecord[]))
      .catch(console.error)
  }, [program.id])

  useRealtime<ProgramEntryRecord>('program_entries', (e) => {
    if (e.record.program !== program.id) return
    setEntries((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    })
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-[#23201A]">
          Extrato — {program.name}
        </h3>
        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          className="h-9 px-4 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Movimentação
        </Button>
      </div>
      {formOpen && (
        <div className="paper-card p-5 bg-[#FAF7F0]/50">
          <EntryForm programId={program.id} onDone={() => setFormOpen(false)} />
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-[#6E6A5E] py-6 text-center">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="paper-card px-5 py-1">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
