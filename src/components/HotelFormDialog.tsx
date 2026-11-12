import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import type { ProgramRecord, PassengerRecord, TripRecord } from '@/types/database'
import { formatBRL, parseNumberInput } from '@/lib/miles'
import { SegToggle } from '@/components/SegToggle'

const SITUACOES = [
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'em_espera', label: 'Em espera' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'utilizada', label: 'Utilizada' },
] as const

type PaymentMode = 'milhas' | 'dinheiro'
type CustoMode = 'programa' | 'informar'

const todayISO = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const labelCls = 'text-xs font-semibold text-[#23201A]'

/**
 * Formulário "Nova hospedagem" (modal), fiel ao print: código da reserva,
 * situação, hotel, cidade/país, check-in/out, quarto, hóspedes e bloco de
 * pagamento (milhas ou dinheiro). Débito no extrato segue o da passagem.
 */
export function HotelFormDialog({
  open,
  onClose,
  programs,
}: {
  open: boolean
  onClose: () => void
  programs: ProgramRecord[]
}) {
  const { toast } = useToast()

  const [bookingCode, setBookingCode] = useState('')
  const [status, setStatus] = useState<string>('confirmada')
  const [hotel, setHotel] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [room, setRoom] = useState('')
  const [guests, setGuests] = useState('')
  const [allPassengers, setAllPassengers] = useState<string[]>([])

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('milhas')
  const [programId, setProgramId] = useState('')
  const [milesUsed, setMilesUsed] = useState('')
  const [fees, setFees] = useState('')
  const [custoMode, setCustoMode] = useState<CustoMode>('programa')
  const [milheiro, setMilheiro] = useState('')
  const [referenceValue, setReferenceValue] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [trip, setTrip] = useState('')
  const [issuedAt, setIssuedAt] = useState(todayISO)
  const [notes, setNotes] = useState('')
  const [tripSuggestions, setTripSuggestions] = useState<string[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selectedProgram = programs.find((p) => p.id === programId)

  // Passageiros cadastrados, para sugestão (datalist)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    pb.collection('passengers')
      .getFullList({ sort: 'name' })
      .then((rows) => {
        if (cancelled) return
        setAllPassengers((rows as unknown as PassengerRecord[]).map((p) => p.name).filter(Boolean))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  // Viagens cadastradas, para sugestão no campo Viagem (digitação livre)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    pb.collection('trips')
      .getFullList({ sort: 'name' })
      .then((rows) => {
        if (cancelled) return
        setTripSuggestions((rows as unknown as TripRecord[]).map((t) => t.name).filter(Boolean))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  // Reset sempre que o modal abrir
  useEffect(() => {
    if (!open) return
    setBookingCode('')
    setStatus('confirmada')
    setHotel('')
    setCity('')
    setCountry('')
    setCheckIn('')
    setCheckOut('')
    setRoom('')
    setGuests('')
    setPaymentMode('milhas')
    setProgramId('')
    setMilesUsed('')
    setFees('')
    setCustoMode('programa')
    setMilheiro('')
    setReferenceValue('')
    setCashAmount('')
    setTrip('')
    setIssuedAt(todayISO())
    setNotes('')
    setErrors({})
  }, [open])

  const milheiroNum = useMemo(() => {
    if (custoMode === 'programa') return selectedProgram?.cost_per_thousand || 0
    return parseNumberInput(milheiro) || 0
  }, [custoMode, selectedProgram, milheiro])

  const milesNum = parseNumberInput(milesUsed) || 0
  const feesNum = parseNumberInput(fees) || 0
  const refNum = parseNumberInput(referenceValue) || 0

  // Mesmo cálculo do formulário de passagem, ao vivo
  const milhasEmReais = (milesNum / 1000) * milheiroNum
  const custoReal = milhasEmReais + feesNum
  const economia = refNum > 0 ? refNum - custoReal : 0

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!hotel.trim()) errs.hotel = 'Informe o hotel'
    if (!checkIn) errs.check_in = 'Informe o check-in'
    if (!checkOut) errs.check_out = 'Informe o check-out'
    if (checkIn && checkOut && checkOut < checkIn) {
      errs.check_out = 'O check-out deve ser depois do check-in'
    }

    if (paymentMode === 'milhas') {
      if (!programId) errs.program = 'Escolha o programa'
      if (milesNum <= 0) errs.miles_used = 'Informe as milhas usadas'
      if (selectedProgram && milesNum > (selectedProgram.balance || 0)) {
        errs.miles_used = `Saldo insuficiente: ${selectedProgram.balance.toLocaleString('pt-BR')} milhas`
      }
      if (custoMode === 'informar' && milheiroNum <= 0) {
        errs.milheiro = 'Informe o milheiro'
      }
    } else {
      const cash = parseNumberInput(cashAmount)
      if (cash == null || cash <= 0) errs.cash_amount = 'Informe o valor pago'
    }
    if (!issuedAt) errs.issued_at = 'Informe a data da emissão'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const checkInStr = `${checkIn} 12:00:00.000Z`
      let entryId: string | undefined

      if (paymentMode === 'milhas') {
        // Débito no extrato do programa (mesmo fluxo da passagem)
        const entry = await pb.collection('program_entries').create({
          program: programId,
          type: 'saida',
          description: `Hospedagem ${hotel.trim()}`,
          quantity: milesNum,
          cost_per_thousand: milheiroNum,
          date: checkInStr,
        })
        entryId = entry.id
        await pb
          .collection('programs')
          .update(programId, { balance: (selectedProgram?.balance || 0) - milesNum })
      }

      await pb.collection('hotels').create({
        hotel: hotel.trim(),
        destination: city.trim() || undefined,
        country: country.trim() || undefined,
        booking_code: bookingCode.trim() || undefined,
        status,
        check_in: checkInStr,
        check_out: `${checkOut} 12:00:00.000Z`,
        room: room.trim() || undefined,
        guests: guests.trim() || undefined,
        payment_method: paymentMode,
        miles_used: paymentMode === 'milhas' ? milesNum : 0,
        fees: paymentMode === 'milhas' ? feesNum : 0,
        total_value: paymentMode === 'dinheiro' ? parseNumberInput(cashAmount) || 0 : 0,
        reference_value: refNum,
        milheiro_custom:
          paymentMode === 'milhas' && custoMode === 'informar' ? milheiroNum : undefined,
        trip: trip.trim() || undefined,
        issued_at: `${issuedAt} 12:00:00.000Z`,
        notes: notes.trim() || undefined,
        ...(paymentMode === 'milhas' ? { program: programId, entry: entryId } : {}),
      })
      toast({
        title: 'Reserva registrada',
        description:
          paymentMode === 'milhas'
            ? 'O extrato do programa foi debitado.'
            : 'A hospedagem foi salva como compra em dinheiro.',
      })
      onClose()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[88vh] overflow-y-auto rounded-2xl bg-white">
        <DialogHeader className="pb-1">
          <DialogTitle className="font-serif text-xl font-bold text-[#23201A]">
            Nova hospedagem
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Código + situação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ht-code" className={labelCls}>
                Código da reserva
              </Label>
              <Input
                id="ht-code"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                maxLength={20}
                placeholder="Ex.: ABC123"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ht-status" className={labelCls}>
                Situação
              </Label>
              <select
                id="ht-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer"
              >
                {SITUACOES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hotel */}
          <div className="space-y-1.5">
            <Label htmlFor="ht-hotel" className={labelCls}>
              Hotel
            </Label>
            <Input
              id="ht-hotel"
              value={hotel}
              onChange={(e) => setHotel(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Hotel de Russie"
              className="rrmilhas-input"
            />
            {errors.hotel && <p className="text-xs text-[#C4452F]">{errors.hotel}</p>}
          </div>

          {/* Cidade / País */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ht-city" className={labelCls}>
                Cidade
              </Label>
              <Input
                id="ht-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={120}
                placeholder="Ex.: Roma"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ht-country" className={labelCls}>
                País
              </Label>
              <Input
                id="ht-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={80}
                placeholder="Ex.: Itália"
                className="rrmilhas-input"
              />
            </div>
          </div>

          {/* Check-in / check-out */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ht-checkin" className={labelCls}>
                Check-in
              </Label>
              <Input
                id="ht-checkin"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rrmilhas-input"
              />
              {errors.check_in && <p className="text-xs text-[#C4452F]">{errors.check_in}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ht-checkout" className={labelCls}>
                Check-out
              </Label>
              <Input
                id="ht-checkout"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rrmilhas-input"
              />
              {errors.check_out && <p className="text-xs text-[#C4452F]">{errors.check_out}</p>}
            </div>
          </div>

          {/* Quarto */}
          <div className="space-y-1.5">
            <Label htmlFor="ht-room" className={labelCls}>
              Quarto (opcional)
            </Label>
            <Input
              id="ht-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Deluxe com café"
              className="rrmilhas-input"
            />
          </div>

          {/* Hóspedes */}
          <div className="space-y-1.5">
            <Label htmlFor="ht-guests" className={labelCls}>
              Hóspedes
            </Label>
            <Input
              id="ht-guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              maxLength={500}
              placeholder="Ex.: Ana Silva, João Silva"
              list="ht-guests-list"
              className="rrmilhas-input"
            />
            <datalist id="ht-guests-list">
              {allPassengers.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <p className="text-[11px] text-[#6E6A5E]">Separe os nomes por vírgula.</p>
          </div>

          {/* Pagamento */}
          <div className="rounded-2xl border border-[#E8E2D6] bg-[#FBF8F1] p-4 space-y-4">
            <SegToggle
              value={paymentMode}
              onChange={(v) => setPaymentMode(v)}
              options={[
                { value: 'milhas', label: 'Milhas ou pontos' },
                { value: 'dinheiro', label: 'Dinheiro' },
              ]}
            />

            {paymentMode === 'milhas' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ht-program" className={labelCls}>
                    Programa
                  </Label>
                  <select
                    id="ht-program"
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer"
                  >
                    <option value="">Escolha o programa</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {(p.balance || 0).toLocaleString('pt-BR')}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#6E6A5E]">
                    Programa cadastrado desconta do extrato. Outro programa só registra.
                  </p>
                  {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ht-miles" className={labelCls}>
                      Milhas usadas
                    </Label>
                    <Input
                      id="ht-miles"
                      inputMode="numeric"
                      value={milesUsed}
                      onChange={(e) => setMilesUsed(e.target.value)}
                      placeholder="Ex.: 60000"
                      className="rrmilhas-input"
                    />
                    {errors.miles_used && (
                      <p className="text-xs text-[#C4452F]">{errors.miles_used}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ht-fees" className={labelCls}>
                      Taxas (R$)
                    </Label>
                    <Input
                      id="ht-fees"
                      inputMode="decimal"
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                      placeholder="Ex.: 180,00"
                      className="rrmilhas-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <SegToggle
                    value={custoMode}
                    onChange={(v) => setCustoMode(v)}
                    options={[
                      { value: 'programa', label: 'Custo médio do programa' },
                      { value: 'informar', label: 'Informar custo' },
                    ]}
                  />
                  {custoMode === 'informar' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ht-milheiro" className={labelCls}>
                        Milheiro (R$)
                      </Label>
                      <Input
                        id="ht-milheiro"
                        inputMode="decimal"
                        value={milheiro}
                        onChange={(e) => setMilheiro(e.target.value)}
                        placeholder="Ex.: 25,00"
                        className="rrmilhas-input"
                      />
                      {errors.milheiro && (
                        <p className="text-xs text-[#C4452F]">{errors.milheiro}</p>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-[#6E6A5E]">
                    Milheiro considerado: {formatBRL(milheiroNum)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ht-ref" className={labelCls}>
                    Quanto custaria em dinheiro (R$)
                  </Label>
                  <Input
                    id="ht-ref"
                    inputMode="decimal"
                    value={referenceValue}
                    onChange={(e) => setReferenceValue(e.target.value)}
                    placeholder="Ex.: 3.400,00"
                    className="rrmilhas-input"
                  />
                  <p className="text-[11px] text-[#6E6A5E]">Para calcular a economia. Opcional.</p>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-white border border-[#E8E2D6] p-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A5E]">
                      Milhas em R$
                    </p>
                    <p className="text-sm font-semibold text-[#23201A] mt-1">
                      {formatBRL(milhasEmReais)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A5E]">
                      Custo real
                    </p>
                    <p className="text-sm font-semibold text-[#23201A] mt-1">
                      {formatBRL(custoReal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A5E]">
                      Economia
                    </p>
                    <p
                      className={`text-sm font-semibold mt-1 ${economia > 0 ? 'text-[#2E7D4F]' : 'text-[#23201A]'}`}
                    >
                      {formatBRL(economia)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ht-cash" className={labelCls}>
                  Valor pago (R$)
                </Label>
                <Input
                  id="ht-cash"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Ex.: 3.400,00"
                  className="rrmilhas-input"
                />
                {errors.cash_amount && (
                  <p className="text-xs text-[#C4452F]">{errors.cash_amount}</p>
                )}
              </div>
            )}
          </div>

          {/* Viagem / emissão */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ht-trip" className={labelCls}>
                Viagem
              </Label>
              <Input
                id="ht-trip"
                value={trip}
                onChange={(e) => setTrip(e.target.value)}
                maxLength={120}
                placeholder="Sem viagem"
                list="hotel-trip-suggestions"
                className="rrmilhas-input"
              />
              <datalist id="hotel-trip-suggestions">
                {tripSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ht-issued" className={labelCls}>
                Data da emissão
              </Label>
              <Input
                id="ht-issued"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="rrmilhas-input"
              />
              {errors.issued_at && <p className="text-xs text-[#C4452F]">{errors.issued_at}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ht-notes" className={labelCls}>
              Observações (opcional)
            </Label>
            <Textarea
              id="ht-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rrmilhas-input"
            />
          </div>

          {errors.form && <p className="text-sm text-[#C4452F]">{errors.form}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-semibold"
          >
            {saving ? 'Registrando...' : 'Registrar reserva'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
