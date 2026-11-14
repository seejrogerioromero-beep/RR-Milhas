import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Map as MapIcon,
  Plane,
  Hotel,
  Trash2,
  Pencil,
  CalendarDays,
  Sparkles,
  MapPin,
  ListChecks,
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
import type { TripRecord, FlightRecord, HotelRecord } from '@/types/database'
import { formatBRL, formatDateBR, nightsBetween } from '@/lib/miles'
import { ConfirmDelete } from '@/components/forms'
import { cn } from '@/lib/utils'
import { TripChecklist } from '@/components/TripChecklist'
import { generateTripChecklist } from '@/lib/tripChecklist'

const DAY_MS = 86400000

/** Contagem regressiva: "em 12 dias", "é amanhã", "é hoje" ou "em andamento". */
function countdownFor(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null
  const today = new Date(new Date().toISOString().slice(0, 10))
  const start = new Date(startDate)
  if (isNaN(start.getTime())) return null
  const days = Math.round((start.getTime() - today.getTime()) / DAY_MS)
  if (endDate && new Date(endDate).getTime() >= today.getTime() && days < 0) {
    return 'em andamento'
  }
  if (days < 0) return null
  if (days === 0) return 'é hoje!'
  if (days === 1) return 'é amanhã'
  return `em ${days} dias`
}

/** Diálogo de criar/editar viagem (montado só quando aberto). */
function TripFormDialog({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editing?: TripRecord | null
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(editing?.name || '')
  const [destination, setDestination] = useState(editing?.destination || '')
  const [startDate, setStartDate] = useState(editing?.start_date?.slice(0, 10) || '')
  const [endDate, setEndDate] = useState(editing?.end_date?.slice(0, 10) || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editing?.name || '')
      setDestination(editing?.destination || '')
      setStartDate(editing?.start_date?.slice(0, 10) || '')
      setEndDate(editing?.end_date?.slice(0, 10) || '')
      setNotes(editing?.notes || '')
      setErrors({})
    }
  }, [open, editing])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Informe o nome da viagem'
    if (startDate && endDate && endDate < startDate) {
      errs.end_date = 'A volta deve ser depois da ida'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        destination: destination.trim() || undefined,
        start_date: startDate ? `${startDate} 12:00:00.000Z` : undefined,
        end_date: endDate ? `${endDate} 12:00:00.000Z` : undefined,
        notes: notes.trim() || undefined,
      }
      if (editing) {
        await pb.collection('trips').update(editing.id, data)
        toast({ title: 'Viagem atualizada', description: name.trim() })
      } else {
        const created = await pb.collection('trips').create(data)
        try {
          await generateTripChecklist(created.id)
        } catch (err) {
          console.error('Viagens: falha ao gerar checklist', err)
        }
        toast({ title: 'Viagem criada', description: name.trim() })
      }
      onSaved()
      onClose()
    } catch (err) {
      setErrors({ form: (err as Error)?.message || 'Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar viagem' : 'Nova viagem'}</DialogTitle>
          <DialogDescription>
            As passagens e hospedagens com este nome no campo Viagem aparecem agrupadas aqui.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="trip-name" className="text-xs font-semibold text-[#23201A]">
              Nome da viagem *
            </Label>
            <Input
              id="trip-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
              placeholder="Ex: Viagem para Lisboa"
              className={cn('rrmilhas-input', errors.name && 'border-[#C4452F]')}
            />
            {errors.name && <p className="text-xs text-[#C4452F]">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-destination" className="text-xs font-semibold text-[#23201A]">
              Destino (opcional)
            </Label>
            <Input
              id="trip-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={160}
              placeholder="Ex: Portugal"
              className="rrmilhas-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trip-start" className="text-xs font-semibold text-[#23201A]">
                Data de ida
              </Label>
              <Input
                id="trip-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-end" className="text-xs font-semibold text-[#23201A]">
                Data de volta
              </Label>
              <Input
                id="trip-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cn('rrmilhas-input', errors.end_date && 'border-[#C4452F]')}
              />
              {errors.end_date && <p className="text-xs text-[#C4452F]">{errors.end_date}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-notes" className="text-xs font-semibold text-[#23201A]">
              Observações (opcional)
            </Label>
            <Textarea
              id="trip-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={2}
              className="rrmilhas-input resize-none"
            />
          </div>

          {errors.form && <p className="text-sm text-[#C4452F]">{errors.form}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar viagem'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Sub-card de item vinculado à viagem (passagem ou hospedagem). */
function LinkedItem({
  icon,
  title,
  subtitle,
  value,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8E2D6] bg-[#FAF7F0]/60 p-3">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#16418F]/10 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#23201A] truncate">{title}</p>
        <p className="text-xs text-[#6E6A5E] truncate">{subtitle}</p>
      </div>
      <span className="text-xs font-semibold text-[#16418F] shrink-0 tabular-nums">{value}</span>
    </div>
  )
}

/** Página VIAGENS — lista de viagens com contagem regressiva e itens agrupados. */
export default function Viagens() {
  const { toast } = useToast()
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [flights, setFlights] = useState<FlightRecord[]>([])
  const [hotels, setHotels] = useState<HotelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TripRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [checklistOpenId, setChecklistOpenId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [t, f, h] = await Promise.all([
        pb.collection('trips').getFullList({ sort: 'start_date' }),
        pb.collection('flights').getFullList({ sort: 'outbound_date' }),
        pb.collection('hotels').getFullList({ sort: 'check_in' }),
      ])
      setTrips(t as unknown as TripRecord[])
      setFlights(f as unknown as FlightRecord[])
      setHotels(h as unknown as HotelRecord[])
    } catch (err) {
      console.error('Viagens: falha ao carregar', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<TripRecord>('trips', () => reload())
  useRealtime<FlightRecord>('flights', () => reload())
  useRealtime<HotelRecord>('hotels', () => reload())

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('trips').delete(deleteId)
      toast({ title: 'Viagem excluída' })
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

  const tripGroups = trips.map((t) => {
    const tripName = t.name.trim().toLowerCase()
    const tripFlights = flights.filter(
      (f) => (f as unknown as { trip?: string }).trip?.trim().toLowerCase() === tripName,
    )
    const tripHotels = hotels.filter((h) => h.trip?.trim().toLowerCase() === tripName)
    return { trip: t, tripFlights, tripHotels }
  })

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Milhas</p>
            <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Viagens</h1>
            <p className="text-sm text-[#6E6A5E] mt-2">
              Cada viagem reúne as passagens e hospedagens com o mesmo nome no campo Viagem.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova viagem
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6E6A5E]">Carregando...</p>
        ) : trips.length === 0 ? (
          <Card className="paper-card py-14 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
              Comece aqui
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#23201A] mt-2">
              Planeje sua primeira viagem
            </h2>
            <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
              Cadastre a viagem com nome, destino e datas. Ao registrar passagens e hospedagens com
              esse nome no campo Viagem, elas aparecem aqui agrupadas.
            </p>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova viagem
            </Button>
          </Card>
        ) : (
          <div className="space-y-5">
            {tripGroups.map(({ trip: t, tripFlights, tripHotels }) => {
              const countdown = countdownFor(t.start_date, t.end_date)
              const nights =
                t.start_date && t.end_date ? nightsBetween(t.start_date, t.end_date) : 0
              const totalTripValue =
                tripFlights.reduce((s, f) => s + (f.cash_amount || 0), 0) +
                tripHotels.reduce((s, h) => s + (h.total_value || 0), 0)
              return (
                <Card key={t.id} className="paper-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-2 font-serif text-lg font-semibold text-[#23201A]">
                          <MapIcon className="w-4 h-4 text-[#0E8FB8]" /> {t.name}
                        </span>
                        {countdown && (
                          <span
                            className={cn(
                              'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                              countdown === 'em andamento' || countdown === 'é hoje!'
                                ? 'bg-[#0E8FB8]/10 text-[#0E8FB8]'
                                : 'bg-[#16418F]/10 text-[#16418F]',
                            )}
                          >
                            {countdown}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-[#6E6A5E]">
                        {t.destination && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#0E8FB8]" /> {t.destination}
                          </span>
                        )}
                        {(t.start_date || t.end_date) && (
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[#0E8FB8]" />
                            {t.start_date ? formatDateBR(t.start_date) : '—'} →{' '}
                            {t.end_date ? formatDateBR(t.end_date) : '—'}
                          </span>
                        )}
                        {nights > 0 && (
                          <span>
                            {nights} {nights === 1 ? 'noite' : 'noites'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setChecklistOpenId((cur) => (cur === t.id ? null : t.id))}
                        className={cn(
                          'grid place-items-center w-8 h-8 rounded-lg hover:bg-[#16418F]/10 text-[#16418F]',
                          checklistOpenId === t.id && 'bg-[#16418F]/10',
                        )}
                        aria-label="Checklist da viagem"
                        title="Checklist da viagem"
                      >
                        <ListChecks className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(t)
                          setFormOpen(true)
                        }}
                        className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#16418F]/10 text-[#16418F]"
                        aria-label="Editar viagem"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                        aria-label="Excluir viagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Itens agrupados */}
                  <div className="mt-4 space-y-2">
                    {tripFlights.map((f) => (
                      <LinkedItem
                        key={f.id}
                        icon={<Plane className="w-4 h-4 text-[#16418F]" />}
                        title={f.route || 'Passagem'}
                        subtitle={`${formatDateBR(f.outbound_date || f.departure)}${
                          f.airline ? ` · ${f.airline}` : ''
                        }`}
                        value={
                          f.payment_method === 'milhas'
                            ? `${(f.miles_used || 0).toLocaleString('pt-BR')} milhas`
                            : formatBRL(f.cash_amount || 0)
                        }
                      />
                    ))}
                    {tripHotels.map((h) => (
                      <LinkedItem
                        key={h.id}
                        icon={<Hotel className="w-4 h-4 text-[#16418F]" />}
                        title={h.hotel}
                        subtitle={`${formatDateBR(h.check_in)} → ${formatDateBR(h.check_out)}`}
                        value={
                          h.payment_method === 'milhas'
                            ? `${(h.miles_used || 0).toLocaleString('pt-BR')} milhas`
                            : formatBRL(h.total_value || 0)
                        }
                      />
                    ))}
                    {tripFlights.length === 0 && tripHotels.length === 0 && (
                      <p className="text-xs text-[#6E6A5E] rounded-xl border border-dashed border-[#E8E2D6] bg-white px-4 py-3 text-center">
                        Nenhuma passagem ou hospedagem com o nome "{t.name}" no campo Viagem ainda.
                      </p>
                    )}
                    {totalTripValue > 0 && (
                      <p className="text-xs text-[#6E6A5E] text-right">
                        Total em dinheiro: {formatBRL(totalTripValue)}
                      </p>
                    )}
                  </div>
                  {checklistOpenId === t.id && (
                    <div className="mt-5 pt-5 border-t border-[#E8E2D6]">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8] mb-3">
                        Checklist
                      </h3>
                      <TripChecklist trip={t} />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {formOpen && (
          <TripFormDialog
            open={formOpen}
            onClose={() => {
              setFormOpen(false)
              setEditing(null)
            }}
            editing={editing}
            onSaved={reload}
          />
        )}
        {deleteId && (
          <ConfirmDelete
            title="Excluir viagem"
            description="A viagem será removida. As passagens e hospedagens ligadas a ela pelo nome não são excluídas."
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </div>
    </Layout>
  )
}
