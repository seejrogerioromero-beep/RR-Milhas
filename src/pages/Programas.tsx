import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Coins, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { ProgramRecord } from '@/types/database'
import { formatMiles, formatBRL } from '@/lib/miles'
import { ProgramFormSheet, ConfirmDelete } from '@/components/forms'
import { ProgramStatement } from '@/components/ProgramStatement'
import { cn } from '@/lib/utils'

export default function Programas() {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const res = await pb.collection('programs').getFullList({ sort: 'name' })
      setPrograms(res as unknown as ProgramRecord[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<ProgramRecord>('programs', () => reload())

  const selected = useMemo(
    () => programs.find((p) => p.id === selectedId) || null,
    [programs, selectedId],
  )

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('programs').delete(deleteId)
      toast({ title: 'Programa excluído' })
      if (selectedId === deleteId) setSelectedId(null)
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
            <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Programas</h1>
            <p className="text-sm text-[#6E6A5E] mt-2">
              Saldos, custo médio e valor de mercado de cada programa.
            </p>
          </div>
          <Button
            onClick={() => setSheetOpen(true)}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo programa
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6E6A5E]">Carregando...</p>
        ) : programs.length === 0 ? (
          <Card className="paper-card py-14 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
              Comece aqui
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#23201A] mt-2">
              Cadastre seu primeiro programa
            </h2>
            <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
              Informe o saldo atual e o custo do milheiro. O extrato cuida do resto: saldo e custo
              médio sempre atualizados.
            </p>
            <Button
              onClick={() => setSheetOpen(true)}
              className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Novo programa
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {programs.map((p) => (
                <Card
                  key={p.id}
                  className={cn(
                    'paper-card-interactive p-5 cursor-pointer relative',
                    selectedId === p.id && 'ring-2 ring-[#16418F]/60',
                  )}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#23201A]">
                      <Coins className="w-4 h-4 text-[#0E8FB8]" /> {p.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: edição de programa — mesma Sheet em modo edição
                        }}
                        className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[#FAF7F0] text-[#6E6A5E]"
                        aria-label={`Editar ${p.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(p.id)
                        }}
                        className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                        aria-label={`Excluir ${p.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                  <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums mt-3">
                    {formatMiles(p.balance || 0)}
                    <span className="text-sm font-normal text-[#6E6A5E]"> milhas</span>
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
                    <span className="text-[#6E6A5E]">
                      Custo médio:{' '}
                      <strong className="text-[#23201A]">
                        {formatBRL(p.cost_per_thousand || 0)}
                      </strong>
                    </span>
                    <span className="text-[#6E6A5E]">
                      Mercado:{' '}
                      <strong className="text-[#23201A]">
                        {formatBRL(p.market_per_thousand || 0)}
                      </strong>
                    </span>
                    {(p.market_per_thousand || 0) > (p.cost_per_thousand || 0) && (
                      <span className="flex items-center gap-1 text-[#0E8FB8] font-semibold">
                        <TrendingUp className="w-3 h-3" />
                        valor {formatBRL(p.market_per_thousand - p.cost_per_thousand || 0)} acima
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {selected && <ProgramStatement program={selected} />}
          </>
        )}

        <ProgramFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
        <ConfirmDelete
          title="Excluir programa"
          description={
            <>O programa e todo o seu extrato serão removidos. Essa ação não pode ser desfeita.</>
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </Layout>
  )
}
