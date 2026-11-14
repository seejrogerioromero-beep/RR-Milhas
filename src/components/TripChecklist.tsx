import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { TripChecklistItemRecord, TripChecklistPhase, TripRecord } from '@/types/database'
import { formatDateBR } from '@/lib/miles'
import {
  CHECKLIST_PHASES,
  daysUntilStart,
  generateTripChecklist,
  phaseState,
  shortDM,
  todayKey,
} from '@/lib/tripChecklist'
import { cn } from '@/lib/utils'

/** Checklist de uma viagem: itens agrupados por fase, com progresso e marcação persistida. */
export function TripChecklist({ trip }: { trip: TripRecord }) {
  const { toast } = useToast()
  const [items, setItems] = useState<TripChecklistItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [collapsed, setCollapsed] = useState<Partial<Record<TripChecklistPhase, boolean>>>({})

  const reload = useCallback(async () => {
    try {
      const list = await pb.collection('trip_checklist_items').getFullList({
        filter: `trip='${trip.id}'`,
        sort: 'sort_order',
      })
      setItems(list as unknown as TripChecklistItemRecord[])
    } catch (err) {
      console.error('TripChecklist: falha ao carregar', err)
    } finally {
      setLoading(false)
    }
  }, [trip.id])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<TripChecklistItemRecord>('trip_checklist_items', () => reload())

  const today = todayKey()
  const days = daysUntilStart(trip, today)
  const doneCount = items.filter((i) => i.done).length

  const toggle = async (item: TripChecklistItemRecord) => {
    const nextDone = !item.done
    // Atualização otimista; o realtime confirma o valor salvo.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)))
    try {
      await pb.collection('trip_checklist_items').update(item.id, {
        done: nextDone,
        done_at: nextDone ? new Date().toISOString() : null,
      })
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
      reload()
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateTripChecklist(trip.id)
      await reload()
    } catch (err) {
      toast({
        title: 'Erro ao gerar checklist',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <p className="text-xs text-[#6E6A5E]">Carregando checklist...</p>

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8E2D6] bg-white px-4 py-4 text-center">
        <p className="text-sm text-[#6E6A5E]">Esta viagem ainda não tem checklist.</p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-3 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          {generating ? 'Gerando...' : 'Gerar checklist'}
        </Button>
      </div>
    )
  }

  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#23201A] tabular-nums">
          {doneCount} de {items.length} concluídos
        </p>
        {days !== null && days >= 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#16418F]/10 text-[#16418F]">
            {days === 0 ? 'é hoje!' : days === 1 ? 'é amanhã' : `em ${days} dias`}
          </span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-[#E8E2D6] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#16418F] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {CHECKLIST_PHASES.map((phase) => {
        const state = phaseState(phase.key, trip, today)
        const phaseItems = items.filter((i) => i.phase === phase.key)
        if (phaseItems.length === 0) return null
        const phaseDone = phaseItems.filter((i) => i.done).length
        const isCollapsed = !state.open || !!collapsed[phase.key]
        const hint = state.open
          ? null
          : state.date
            ? `disponível em ${shortDM(state.date)}`
            : 'defina as datas da viagem'

        return (
          <div key={phase.key} className="rounded-xl border border-[#E8E2D6] bg-white">
            <button
              type="button"
              disabled={!state.open}
              onClick={() => setCollapsed((c) => ({ ...c, [phase.key]: !isCollapsed }))}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-3 text-left',
                state.open ? 'hover:bg-[#FAF7F0]/60' : 'cursor-default',
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                {!state.open && <Lock className="w-3.5 h-3.5 text-[#6E6A5E] shrink-0" />}
                <span
                  className={cn(
                    'text-sm font-semibold truncate',
                    state.open ? 'text-[#23201A]' : 'text-[#6E6A5E]',
                  )}
                >
                  {phase.label}
                </span>
                <span className="text-xs text-[#6E6A5E] tabular-nums shrink-0">
                  {phaseDone}/{phaseItems.length}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {hint && <span className="text-xs text-[#6E6A5E]">{hint}</span>}
                {state.open &&
                  (isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-[#6E6A5E]" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-[#6E6A5E]" />
                  ))}
              </span>
            </button>

            {state.open && !isCollapsed && (
              <ul className="border-t border-[#E8E2D6] divide-y divide-[#E8E2D6]">
                {phaseItems.map((item) => (
                  <li key={item.id}>
                    <label className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#FAF7F0]/60">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={item.done}
                        onChange={() => toggle(item)}
                      />
                      {item.done ? (
                        <CheckCircle2 className="w-5 h-5 text-[#16418F] shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#6E6A5E] shrink-0 mt-0.5" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-sm',
                            item.done ? 'text-[#6E6A5E] line-through' : 'text-[#23201A]',
                          )}
                        >
                          {item.title}
                        </span>
                        {item.done && item.done_at && (
                          <span className="block text-[11px] text-[#6E6A5E]">
                            concluído em {formatDateBR(item.done_at)}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TripChecklist
