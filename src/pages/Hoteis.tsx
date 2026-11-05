import { useState, useEffect, useCallback } from 'react'
import { Plus, Hotel, Trash2, CalendarDays } from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { HotelRecord, ProgramRecord } from '@/types/database'
import { formatBRL, formatDateBR, nightsBetween } from '@/lib/miles'
import { ConfirmDelete } from '@/components/forms'
import { HotelFormDialog } from '@/components/HotelFormDialog'
import { cn } from '@/lib/utils'

export default function Hoteis() {
  const { toast } = useToast()
  const [hotels, setHotels] = useState<HotelRecord[]>([])
  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([
        pb.collection('hotels').getFullList({ sort: '-check_out' }),
        pb.collection('programs').getFullList({ sort: 'name' }),
      ])
      setHotels(h as unknown as HotelRecord[])
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

  useRealtime<HotelRecord>('hotels', () => reload())

  const now = Date.now()
  const upcoming = hotels
    .filter((h) => new Date(h.check_out).getTime() >= now)
    .sort((a, b) => a.check_out.localeCompare(b.check_out))
  const past = hotels
    .filter((h) => new Date(h.check_out).getTime() < now)
    .sort((a, b) => b.check_out.localeCompare(a.check_out))

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('hotels').delete(deleteId)
      toast({ title: 'Hospedagem excluída' })
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

  const HotelCard = ({ h }: { h: HotelRecord }) => {
    const nights = nightsBetween(h.check_in, h.check_out)
    const isUpcoming = new Date(h.check_out).getTime() >= now
    return (
      <Card className={cn('paper-card p-5', isUpcoming && 'border-l-4 border-l-[#16418F]')}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-2 font-serif text-lg font-semibold text-[#23201A]">
                <Hotel className="w-4 h-4 text-[#0E8FB8]" /> {h.hotel}
              </span>
              {isUpcoming && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#16418F]/10 text-[#16418F]">
                  próxima
                </span>
              )}
            </div>
            {h.destination && <p className="text-xs text-[#6E6A5E] mt-0.5">{h.destination}</p>}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
              <span className="flex items-center gap-1.5 text-[#23201A]">
                <CalendarDays className="w-3.5 h-3.5 text-[#0E8FB8]" />
                {formatDateBR(h.check_in)} → {formatDateBR(h.check_out)}
              </span>
              <span className="text-[#6E6A5E]">
                {nights} {nights === 1 ? 'noite' : 'noites'}
              </span>
              <span
                className={cn(
                  'font-semibold',
                  h.payment_method === 'milhas' ? 'text-[#0E8FB8]' : 'text-[#16418F]',
                )}
              >
                {h.payment_method === 'milhas'
                  ? `${(h.miles_used || 0).toLocaleString('pt-BR')} milhas`
                  : formatBRL(h.total_value || 0)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setDeleteId(h.id)}
            className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F] shrink-0"
            aria-label="Excluir hospedagem"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Viagens</p>
            <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Hotéis</h1>
            <p className="text-sm text-[#6E6A5E] mt-2">
              Hospedagens pagas com dinheiro ou milhas, com check-in e check-out.
            </p>
          </div>
          <Button
            onClick={() => setSheetOpen(true)}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova hospedagem
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6E6A5E]">Carregando...</p>
        ) : hotels.length === 0 ? (
          <Card className="paper-card py-14 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
              Comece aqui
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#23201A] mt-2">
              Registre sua primeira hospedagem
            </h2>
            <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
              Informe hotel, datas e valor. As próximas hospedagens aparecem destacadas no Início.
            </p>
            <Button
              onClick={() => setSheetOpen(true)}
              className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova hospedagem
            </Button>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-[#23201A]">
                  Próximas hospedagens
                </h2>
                {upcoming.map((h) => (
                  <HotelCard key={h.id} h={h} />
                ))}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-[#6E6A5E]">
                  Hospedagens passadas
                </h2>
                {past.map((h) => (
                  <HotelCard key={h.id} h={h} />
                ))}
              </section>
            )}
          </>
        )}

        <HotelFormDialog open={sheetOpen} onClose={() => setSheetOpen(false)} programs={programs} />
        {deleteId && (
          <ConfirmDelete
            title="Excluir hospedagem"
            description="O registro da hospedagem será removido. O extrato do programa não é alterado."
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </div>
    </Layout>
  )
}
