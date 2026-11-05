import { useState, useEffect, useCallback } from 'react'
import { Plus, Plane, Coins, Trash2 } from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { FlightRecord, ProgramRecord } from '@/types/database'
import {
  formatMiles,
  formatBRL,
  formatDateTimeBR,
  computeFlightSavings,
  maskBRL,
  parseNumberInput,
} from '@/lib/miles'
import { FlightFormSheet, ConfirmDelete } from '@/components/forms'
import { cn } from '@/lib/utils'

export default function Passagens() {
  const { toast } = useToast()
  const [flights, setFlights] = useState<FlightRecord[]>([])
  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'todas' | 'milhas' | 'dinheiro'>('todas')

  const reload = useCallback(async () => {
    try {
      const [f, p] = await Promise.all([
        pb.collection('flights').getFullList({ sort: '-departure', expand: 'program' }),
        pb.collection('programs').getFullList({ sort: 'name' }),
      ])
      setFlights(f as unknown as FlightRecord[])
      setPrograms(p as unknown as ProgramRecord[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<FlightRecord>('flights', () => reload())

  const visible = flights.filter((f) => filter === 'todas' || f.payment_method === filter)
  const totalSavings = flights.reduce((sum, f) => {
    const s = computeFlightSavings({
      payment_method: f.payment_method,
      miles_used: f.miles_used,
      fees: f.fees,
      cash_amount: f.cash_amount,
      reference_value: f.reference_value,
      program_cost_per_thousand: f.expand?.program?.cost_per_thousand || 0,
    })
    return sum + (s?.savings || 0)
  }, 0)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('flights').delete(deleteId)
      toast({ title: 'Passagem excluída' })
      setDeleteId(null)
      reload()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Milhas</p>
            <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Passagens</h1>
            <p className="text-sm text-[#6E6A5E] mt-2">
              Suas emissões com milhas ou dinheiro, e quanto você economizou.
            </p>
          </div>
          <Button
            onClick={() => setSheetOpen(true)}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova passagem
          </Button>
        </div>

        {!loading && flights.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
              {(['todas', 'milhas', 'dinheiro'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'h-9 px-4 rounded-lg text-sm font-semibold capitalize transition-all',
                    filter === f
                      ? 'bg-[#16418F] text-white shadow-sm'
                      : 'text-[#6E6A5E] hover:bg-white',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            {totalSavings > 0 && (
              <span className="text-sm text-[#6E6A5E]">
                Economia total até agora:{' '}
                <strong className="text-[#0E8FB8]">{formatBRL(totalSavings)}</strong>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#6E6A5E]">Carregando...</p>
        ) : visible.length === 0 ? (
          <Card className="paper-card py-14 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
              Comece aqui
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#23201A] mt-2">
              Registre sua primeira passagem
            </h2>
            <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
              Paga com milhas, o app desconta do extrato do programa e mostra quanto você
              economizou.
            </p>
            <Button
              onClick={() => setSheetOpen(true)}
              className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova passagem
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {visible.map((f) => {
              const savings = computeFlightSavings({
                payment_method: f.payment_method,
                miles_used: f.miles_used,
                fees: f.fees,
                cash_amount: f.cash_amount,
                reference_value: f.reference_value,
                program_cost_per_thousand: f.expand?.program?.cost_per_thousand || 0,
              })
              return (
                <Card key={f.id} className="paper-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-2 font-serif text-lg font-semibold text-[#23201A]">
                          <Plane className="w-4 h-4 text-[#0E8FB8]" /> {f.route}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                            f.payment_method === 'milhas'
                              ? 'bg-[#0E8FB8]/10 text-[#0E8FB8]'
                              : 'bg-[#16418F]/10 text-[#16418F]',
                          )}
                        >
                          {f.payment_method === 'milhas' ? 'milhas' : 'dinheiro'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E6A5E] mt-1">
                        {formatDateTimeBR(f.departure)}
                        {f.airline ? ` · ${f.airline}` : ''}
                        {f.expand?.program ? ` · ${f.expand.program.name}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
                        {f.payment_method === 'milhas' ? (
                          <>
                            <span className="flex items-center gap-1.5 text-[#23201A]">
                              <Coins className="w-3.5 h-3.5 text-[#0E8FB8]" />
                              {formatMiles(f.miles_used || 0)} milhas
                            </span>
                            {(f.fees || 0) > 0 && (
                              <span className="text-[#6E6A5E]">taxas {formatBRL(f.fees || 0)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-[#23201A]">{formatBRL(f.cash_amount || 0)}</span>
                        )}
                        {(f.reference_value || 0) > 0 && (
                          <span className="text-[#6E6A5E]">
                            referência {formatBRL(f.reference_value || 0)}
                          </span>
                        )}
                        {savings && savings.savings > 0 && (
                          <span className="font-semibold text-[#0E8FB8]">
                            economizou {formatBRL(savings.savings)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteId(f.id)}
                      className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F] shrink-0"
                      aria-label="Excluir passagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <FlightFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} programs={programs} />
        {deleteId && (
          <ConfirmDelete
            title="Excluir passagem"
            description="O registro da passagem será removido. O extrato do programa não é alterado."
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </div>
    </Layout>
  )
}
