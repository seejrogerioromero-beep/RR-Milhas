import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Hourglass,
  Check,
  Trash2,
  History,
  Coins,
  Sparkles,
  CalendarClock,
} from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { ExpectedPointRecord, ProgramRecord } from '@/types/database'
import { formatMiles, formatDateBR } from '@/lib/miles'
import { ConfirmDelete } from '@/components/forms'

/** Diálogo de registrar "milhas a chegar". */
function ExpectedFormDialog({
  open,
  onClose,
  programs,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  programs: ProgramRecord[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [program, setProgram] = useState('')
  const [miles, setMiles] = useState('')
  const [description, setDescription] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setProgram(programs[0]?.id || '')
      setMiles('')
      setDescription('')
      setExpectedDate('')
      setErrors({})
    }
  }, [open, programs])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const milesNum = parseInt(miles.replace(/[^\d]/g, ''), 10)
    if (!program) errs.program = 'Selecione o programa'
    if (!milesNum || milesNum <= 0) errs.miles = 'Informe a quantidade de milhas'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      await pb.collection('expected_points').create({
        program,
        miles: milesNum,
        description: description.trim() || undefined,
        expected_date: expectedDate ? `${expectedDate} 12:00:00.000Z` : undefined,
        status: 'pendente',
      })
      toast({
        title: 'Milhas a chegar registradas',
        description: `${formatMiles(milesNum)} milhas`,
      })
      onSaved()
      onClose()
    } catch (err) {
      setErrors({ form: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar milhas a chegar</DialogTitle>
          <DialogDescription>
            Ao confirmar a chegada, um lançamento de entrada é criado no extrato do programa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ep-program" className="text-xs font-semibold text-[#23201A]">
              Programa *
            </Label>
            <select
              id="ep-program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full h-10 rounded-lg border border-[#E8E2D6] bg-white px-3 text-sm text-[#23201A]"
            >
              <option value="">Selecione...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-miles" className="text-xs font-semibold text-[#23201A]">
              Quantidade de milhas *
            </Label>
            <Input
              id="ep-miles"
              inputMode="numeric"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              placeholder="Ex: 30000"
              className={errors.miles ? 'border-[#C4452F]' : ''}
            />
            {errors.miles && <p className="text-xs text-[#C4452F]">{errors.miles}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-desc" className="text-xs font-semibold text-[#23201A]">
              Descrição (opcional)
            </Label>
            <Textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex: Bônus transferência Livelo→Smiles"
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-date" className="text-xs font-semibold text-[#23201A]">
              Data prevista
            </Label>
            <Input
              id="ep-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          {errors.form && <p className="text-sm text-[#C4452F]">{errors.form}</p>}

          <Button
            type="submit"
            disabled={saving || programs.length === 0}
            className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            {saving ? 'Salvando...' : 'Registrar'}
          </Button>
          {programs.length === 0 && (
            <p className="text-xs text-[#6E6A5E] text-center">
              Cadastre um programa primeiro em Milhas → Programas.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Página PONTOS ESPERADOS — milhas a chegar, com confirmação em 1 clique. */
export default function PontosEsperados() {
  const { toast } = useToast()
  const [items, setItems] = useState<ExpectedPointRecord[]>([])
  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [i, p] = await Promise.all([
        pb.collection('expected_points').getFullList({ sort: '-created' }),
        pb.collection('programs').getFullList({ sort: 'name' }),
      ])
      setItems(i as unknown as ExpectedPointRecord[])
      setPrograms(p as unknown as ProgramRecord[])
    } catch (err) {
      console.error('PontosEsperados: falha ao carregar', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<ExpectedPointRecord>('expected_points', () => reload())
  useRealtime<ProgramRecord>('programs', () => reload())

  const pending = items.filter((i) => i.status === 'pendente')
  const confirmed = items.filter((i) => i.status === 'confirmado')
  const pendingTotal = pending.reduce((s, i) => s + (i.miles || 0), 0)
  const programIdOf = (item: ExpectedPointRecord): string =>
    typeof item.program === 'string' ? item.program : ((item.program as { id?: string }).id ?? '')
  const programName = (item: ExpectedPointRecord) =>
    programs.find((p) => p.id === programIdOf(item))?.name || 'Programa'

  const handleConfirm = async (item: ExpectedPointRecord) => {
    setConfirmingId(item.id)
    try {
      const programId = programIdOf(item)
      if (!programId) throw new Error('Programa do registro não encontrado')
      // Mesmo mecanismo das entradas do extrato: atualiza saldo e custo médio ponderado
      const program = (await pb.collection('programs').getOne(programId)) as ProgramRecord
      const balance = program.balance || 0
      const avg = program.cost_per_thousand || 0
      const qty = item.miles || 0
      const totalCost = (balance * avg) / 1000 + (qty / 1000) * avg
      const totalMiles = balance + qty
      const newAvg = totalMiles > 0 ? (totalCost / totalMiles) * 1000 : 0
      await pb.collection('programs').update(programId, {
        balance: totalMiles,
        ...(avg > 0 ? { cost_per_thousand: Math.round(newAvg * 100) / 100 } : {}),
      })
      await pb.collection('program_entries').create({
        program: programId,
        type: 'entrada',
        quantity: qty,
        description:
          item.description && item.description.trim().length > 0
            ? item.description.trim()
            : 'Milhas a chegar (confirmado)',
        date: item.expected_date
          ? `${item.expected_date.slice(0, 10)} 12:00:00.000Z`
          : new Date().toISOString().replace('T', ' ').slice(0, 19) + '.000Z',
      })
      await pb.collection('expected_points').update(item.id, { status: 'confirmado' })
      reload()
      toast({
        title: 'Chegada confirmada',
        description: `${formatMiles(item.miles || 0)} milhas lançadas como entrada.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao confirmar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setConfirmingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('expected_points').delete(deleteId)
      toast({ title: 'Registro excluído' })
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Milhas</p>
            <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Pontos esperados</h1>
            <p className="text-sm text-[#6E6A5E] mt-2">
              Milhas a chegar — bônus, transferências e compras pendentes de postagem.
            </p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Registrar milhas a chegar
          </Button>
        </div>

        {/* TOTAL PENDENTE */}
        {!loading && pending.length > 0 && (
          <Card className="paper-card p-5">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-[#16418F]/10 shrink-0">
                <Hourglass className="w-5 h-5 text-[#16418F]" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                  Total a chegar
                </p>
                <p className="font-serif text-2xl font-bold text-[#23201A] tabular-nums">
                  {formatMiles(pendingTotal)}
                  <span className="text-sm font-normal text-[#6E6A5E]"> milhas</span>
                </p>
                <p className="text-xs text-[#6E6A5E] mt-0.5">
                  {pending.length === 1
                    ? '1 item pendente de confirmação'
                    : `${pending.length} itens pendentes de confirmação`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-[#6E6A5E]">Carregando...</p>
        ) : items.length === 0 ? (
          <Card className="paper-card py-14 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
              Comece aqui
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#23201A] mt-2">
              Nada previsto de chegar ainda
            </h2>
            <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
              Registre bônus, transferências ou compras de milhas que ainda não caíram na conta.
              Quando chegarem, um clique confirma e lança a entrada no extrato do programa.
            </p>
            <Button
              onClick={() => setFormOpen(true)}
              className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Registrar milhas a chegar
            </Button>
          </Card>
        ) : (
          <>
            {/* PENDENTES */}
            {pending.length > 0 && (
              <div className="space-y-2">
                {pending.map((item) => (
                  <Card key={item.id} className="paper-card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid place-items-center w-9 h-9 rounded-lg bg-[#D9A404]/15 shrink-0">
                        <Coins className="w-4 h-4 text-[#B8860B]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#23201A] truncate">
                          {formatMiles(item.miles || 0)} milhas · {programName(item)}
                        </p>
                        <p className="text-xs text-[#6E6A5E] truncate mt-0.5 flex items-center gap-1.5">
                          {item.expected_date && (
                            <>
                              <CalendarClock className="w-3 h-3" />
                              {formatDateBR(item.expected_date)}
                            </>
                          )}
                          {item.description ? ` · ${item.description}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(item)}
                          disabled={confirmingId === item.id}
                          className="rounded-lg bg-[#0E8FB8] hover:bg-[#0B7A9E] text-white h-8"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {confirmingId === item.id ? 'Confirmando...' : 'Confirmar'}
                        </Button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                          aria-label="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* HISTÓRICO (CONFIRMADOS) */}
            {confirmed.length > 0 && (
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#6E6A5E] mt-6">
                  <History className="w-4 h-4" /> Histórico — já confirmados
                </h2>
                {confirmed.map((item) => (
                  <Card key={item.id} className="paper-card p-4 opacity-70">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid place-items-center w-9 h-9 rounded-lg bg-[#0E8FB8]/10 shrink-0">
                        <Check className="w-4 h-4 text-[#0E8FB8]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#23201A] truncate">
                          {formatMiles(item.miles || 0)} milhas · {programName(item)}
                        </p>
                        <p className="text-xs text-[#6E6A5E] truncate mt-0.5">
                          {item.description ? `${item.description} · ` : ''}
                          registrado em {formatDateBR(item.created)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0E8FB8]/10 text-[#0E8FB8] shrink-0">
                        confirmado
                      </span>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                        aria-label="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {formOpen && (
          <ExpectedFormDialog
            open={formOpen}
            onClose={() => setFormOpen(false)}
            programs={programs}
            onSaved={reload}
          />
        )}
        {deleteId && (
          <ConfirmDelete
            title="Excluir registro"
            description="O registro de milhas a chegar será removido. Lançamentos já criados no extrato não são desfeitos."
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </div>
    </Layout>
  )
}
