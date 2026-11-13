import { useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import type { ExtractedMovement, ExtractedPassenger } from '@/services/importExtract'
import {
  findDupPassenger,
  dupLabelPassenger,
  type DupInfo,
  type DupAction,
} from '@/lib/importDuplicates'
import { formatDateBR, formatMiles } from '@/lib/miles'
import type { PassengerRecord } from '@/types/database'

/* --------------------------- Seção PASSAGEIROS ---------------------------- */

export interface ReviewPassengerState {
  extracted: ExtractedPassenger
  selected: boolean
}

/**
 * Bloco de passageiros extraídos: marca/desmarca, alerta de duplicado
 * (com par Adicionar/Substituir) e gravação com cpf/birth_date.
 */
export function PassengersSection({
  state,
  existingPassengers,
  saving,
  onToggle,
  onDupAction,
}: {
  state: ReviewPassengerState[]
  existingPassengers: PassengerRecord[]
  saving: boolean
  onToggle: (i: number, sel: boolean) => void
  onDupAction: (i: number, action: DupAction) => void
}) {
  if (state.length === 0) return null
  return (
    <div className="space-y-3">
      {state.map((st, i) => {
        const dup = findDupPassenger(st.extracted, existingPassengers)
        const info: DupInfo | null = dup
          ? { existingId: dup.id, label: dupLabelPassenger(dup), wouldChange: false }
          : null
        return (
          <div key={`pax-${i}`} className="rounded-xl border border-[#E8E2D6] bg-white p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={st.selected}
                onChange={(e) => onToggle(i, e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#16418F]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#23201A] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0E8FB8]" />
                  {st.extracted.name}
                  {st.extracted.cpf ? (
                    <span className="text-xs font-normal text-[#6E6A5E]">
                      · CPF {st.extracted.cpf}
                    </span>
                  ) : null}
                  {st.extracted.birth_date ? (
                    <span className="text-xs font-normal text-[#6E6A5E]">
                      · nasc. {formatDateBR(st.extracted.birth_date)}
                    </span>
                  ) : null}
                </p>
                {info && (
                  <DuplicateDupRow info={info} saving={saving} onPick={(a) => onDupAction(i, a)} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Par de botões Adicionar / Substituir do item duplicado. */
export function DuplicateDupRow({
  info,
  saving,
  onPick,
}: {
  info: DupInfo
  saving: boolean
  onPick: (a: DupAction) => void
}) {
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-start gap-2 rounded-lg border border-[#B7791F]/40 bg-[#B7791F]/10 px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[#B7791F] mt-0.5 shrink-0" />
        <p className="text-xs font-semibold text-[#B7791F]">
          Possível duplicado — {info.label} já parece existir no app.{' '}
          {info.wouldChange
            ? 'Substituir atualiza o cadastro com os dados do documento.'
            : 'Adicionar criaria um segundo igual.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onPick('add')}
          className="h-8 rounded-lg border-[#0E8FB8]/40 text-[#0E8FB8] hover:bg-[#0E8FB8]/10"
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Adicionar mesmo assim
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onPick('replace')}
          className="h-8 rounded-lg border-[#B7791F]/50 text-[#B7791F] hover:bg-[#B7791F]/10"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Substituir existente
        </Button>
      </div>
    </div>
  )
}

/* ------------------------- Seção MOVIMENTAÇÕES ---------------------------- */

export interface ReviewMovementState {
  extracted: ExtractedMovement
  selected: boolean
}

/** Linha de movimentação com checkbox, valor sinalizado e alerta de duplicado. */
export function MovementRow({
  state,
  saving,
  onToggle,
  onDupAction,
  dup,
}: {
  state: ReviewMovementState
  saving: boolean
  onToggle: (sel: boolean) => void
  onDupAction: (a: DupAction) => void
  dup: { id: string; description: string } | null
}) {
  const { extracted } = state
  const isCredit = (extracted.amount || 0) >= 0
  return (
    <tr className="border-t border-[#E8E2D6]/60">
      <td className="py-1.5 pr-2">
        <input
          type="checkbox"
          checked={state.selected}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-3.5 h-3.5 accent-[#16418F]"
        />
      </td>
      <td className="py-1.5 pr-3 text-[#23201A] whitespace-nowrap">
        {extracted.date ? formatDateBR(extracted.date) : '—'}
      </td>
      <td className="py-1.5 pr-3 text-[#23201A]">
        {extracted.description}
        {dup && (
          <DuplicateDupRow
            info={{
              existingId: dup.id,
              label: `movimentação "${dup.description}"`,
              wouldChange: false,
            }}
            saving={saving}
            onPick={onDupAction}
          />
        )}
      </td>
      <td
        className={cn(
          'py-1.5 text-right tabular-nums whitespace-nowrap font-semibold',
          isCredit ? 'text-[#0E6E54]' : 'text-[#C4452F]',
        )}
      >
        {isCredit ? '+' : '−'} {formatMiles(Math.abs(extracted.amount || 0))}
      </td>
    </tr>
  )
}

/* --------------------- Painel de EXCLUSÃO COM RECALCULO ------------------- */

interface ExistingItem {
  id: string
  kind: 'flight' | 'hotel' | 'entry'
  title: string
  subtitle: string
  programId?: string
  miles?: number
  cash?: number
}

/** Agrupa itens que já estão no app para excluir da própria revisão. */
export function DeleteExistingPanel({ onDeleted }: { onDeleted: () => void }) {
  const { toast } = useToast()
  const [items, setItems] = useState<ExistingItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [fls, hts, entries] = await Promise.all([
        pb.collection('flights').getFullList({ sort: '-departure' }),
        pb.collection('hotels').getFullList({ sort: '-check_in' }),
        pb.collection('program_entries').getFullList({ sort: '-date' }),
      ])
      const list: ExistingItem[] = []
      for (const f of fls as unknown as Array<Record<string, unknown>>) {
        list.push({
          id: f.id as string,
          kind: 'flight',
          title: `Passagem · ${String(f.route || '')}`,
          subtitle: `${String(f.airline || '')} · ${String(f.departure || '').slice(0, 10)}`.trim(),
          programId: (f.program as string) || undefined,
          miles: (f.miles_used as number) || 0,
        })
      }
      for (const h of hts as unknown as Array<Record<string, unknown>>) {
        list.push({
          id: h.id as string,
          kind: 'hotel',
          title: `Hospedagem · ${String(h.hotel || '')}`,
          subtitle:
            `${String(h.destination || '')} · ${String(h.check_in || '').slice(0, 10)}`.trim(),
          programId: (h.program as string) || undefined,
          miles: (h.miles_used as number) || 0,
        })
      }
      for (const en of entries as unknown as Array<Record<string, unknown>>) {
        list.push({
          id: en.id as string,
          kind: 'entry',
          title: `Movimentação · ${String(en.description || '')}`,
          subtitle: `${String(en.date || '').slice(0, 10)} · ${en.type === 'entrada' ? 'entrada' : 'saída'}`,
          programId: (en.program as string) || undefined,
          miles: (en.quantity as number) || 0,
          cash: (en.cost_per_thousand as number) || 0,
        })
      }
      setItems(list)
    } catch (err) {
      toast({
        title: 'Erro ao carregar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /** Exclui o item e reverte/recalcula o que ele alterou. */
  const handleDelete = async (item: ExistingItem) => {
    setDeletingId(item.id)
    try {
      if (item.kind === 'entry') {
        await pb.collection('program_entries').delete(item.id)
        if (item.programId) await recalcSafe(item.programId)
      } else {
        // Passagem/hospedagem: se foram pagas com milhas, exclui o débito
        // correspondente no extrato e recalcula o programa.
        const col = item.kind === 'flight' ? 'flights' : 'hotels'
        const rec = await pb.collection(col).getOne(item.id)
        const entryId = (rec as Record<string, unknown>).entry as string | undefined
        if (entryId) {
          try {
            await pb.collection('program_entries').delete(entryId)
          } catch (_) {
            /* entry já excluída ou inacessível: segue */
          }
        }
        await pb.collection(col).delete(item.id)
        if (item.programId) await recalcSafe(item.programId)
      }
      setItems((prev) => (prev ? prev.filter((x) => x.id !== item.id) : prev))
      toast({ title: 'Excluído', description: 'Saldos e custos médios foram recalculados.' })
      onDeleted()
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-[#C4452F]/30 bg-[#C4452F]/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#23201A] flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#C4452F]" />
          Excluir lançamentos existentes
        </p>
        {items === null && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={load}
            className="h-8 rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10"
          >
            {loading ? 'Carregando...' : 'Listar'}
          </Button>
        )}
      </div>
      {items !== null && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-xs text-[#6E6A5E] py-4 text-center">
              Nada cadastrado ainda — nada para excluir.
            </p>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E8E2D6] bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#23201A] truncate">{it.title}</p>
                  <p className="text-[10px] text-[#6E6A5E] truncate">{it.subtitle}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deletingId === it.id}
                  onClick={() => handleDelete(it)}
                  className="h-7 rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10 shrink-0"
                >
                  {deletingId === it.id ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
      {items !== null && items.length > 0 && (
        <p className="text-[10px] text-[#6E6A5E]">
          Ao excluir, o saldo e o custo médio do programa são recalculados automaticamente.
        </p>
      )}
    </div>
  )
}

/** recalcProgram importado com segurança — helper local para evitar circular. */
async function recalcSafe(programId: string) {
  try {
    const { recalcProgram } = await import('@/lib/recalcProgram')
    await recalcProgram(programId)
  } catch (err) {
    console.warn('recalcProgram falhou', err)
  }
}

/* ------------------------- Ícones auxiliares ------------------------------ */

export function AmountIcon({ isCredit }: { isCredit: boolean }) {
  return isCredit ? (
    <ArrowUp className="w-3.5 h-3.5 text-[#0E6E54]" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 text-[#C4452F]" />
  )
}

export function SavedCheck() {
  return <Check className="w-3.5 h-3.5 text-[#0E6E54]" />
}

export function CostInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} className={cn('rrmilhas-input tabular-nums', props.className)} />
}
