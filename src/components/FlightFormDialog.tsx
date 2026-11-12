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
import { formatBRL, maskBRL, parseNumberInput } from '@/lib/miles'
import { cn } from '@/lib/utils'

const SITUACOES = [
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'em_espera', label: 'Em espera' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'utilizada', label: 'Utilizada' },
] as const

const CABINES = [
  { value: 'economica', label: 'Econômica' },
  { value: 'premium', label: 'Premium' },
  { value: 'executiva', label: 'Executiva' },
  { value: 'primeira', label: 'Primeira' },
] as const

type PaymentMode = 'milhas' | 'dinheiro'
type CustoMode = 'programa' | 'informar'

const todayISO = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Toggle segmentado pill (padrão visual do app). */
function SegToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-flow-col auto-cols-fr gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-10 rounded-lg text-sm font-semibold transition-all',
            value === o.value
              ? 'bg-[#16418F] text-white shadow-sm'
              : 'text-[#6E6A5E] hover:bg-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Formulário "Nova passagem" (modal), fiel ao print: código da reserva,
 * situação, origem/destino, companhia, cabine, ida e volta/só ida,
 * conexões, passageiros, bloco de pagamento (milhas ou dinheiro) e emissão.
 */
export function FlightFormDialog({
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
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [airline, setAirline] = useState('')
  const [cabin, setCabin] = useState<string>('economica')
  const [roundtrip, setRoundtrip] = useState(true)
  const [outboundDate, setOutboundDate] = useState('')
  const [outboundDep, setOutboundDep] = useState('')
  const [outboundArr, setOutboundArr] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [returnDep, setReturnDep] = useState('')
  const [returnArr, setReturnArr] = useState('')
  const [layovers, setLayovers] = useState('')
  const [passengersInput, setPassengersInput] = useState('')
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
    setOrigin('')
    setDestination('')
    setAirline('')
    setCabin('economica')
    setRoundtrip(true)
    setOutboundDate('')
    setOutboundDep('')
    setOutboundArr('')
    setReturnDate('')
    setReturnDep('')
    setReturnArr('')
    setLayovers('')
    setPassengersInput('')
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

  const milhasEmReais = (milesNum / 1000) * milheiroNum
  const custoReal = milhasEmReais + feesNum
  const economia = refNum > 0 ? refNum - custoReal : 0

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

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
    if (!outboundDate) errs.outbound_date = 'Informe a data de ida'
    if (!issuedAt) errs.issued_at = 'Informe a data da emissão'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const route =
        origin || destination ? `${origin.toUpperCase()} → ${destination.toUpperCase()}` : ''
      const outboundStr = `${outboundDate} 12:00:00.000Z`
      let entryId: string | undefined

      if (paymentMode === 'milhas') {
        // Débito no extrato do programa (mesmo mecanismo da versão anterior)
        const entry = await pb.collection('program_entries').create({
          program: programId,
          type: 'saida',
          description: `Passagem ${route || bookingCode || 'reserva'}`,
          quantity: milesNum,
          cost_per_thousand: selectedProgram?.cost_per_thousand || 0,
          date: outboundStr,
        })
        entryId = entry.id
        await pb
          .collection('programs')
          .update(programId, { balance: (selectedProgram?.balance || 0) - milesNum })
      }

      await pb.collection('flights').create({
        route: route || '—',
        airline: airline.trim() || undefined,
        departure: outboundStr,
        payment_method: paymentMode,
        miles_used: paymentMode === 'milhas' ? milesNum : 0,
        fees: paymentMode === 'milhas' ? feesNum : 0,
        cash_amount: paymentMode === 'dinheiro' ? parseNumberInput(cashAmount) || 0 : 0,
        reference_value: refNum,
        booking_code: bookingCode.trim() || undefined,
        status,
        origin: origin.trim().toUpperCase() || undefined,
        destination: destination.trim().toUpperCase() || undefined,
        cabin,
        roundtrip,
        outbound_date: outboundStr,
        outbound_departure: outboundDep || undefined,
        outbound_arrival: outboundArr || undefined,
        return_date: roundtrip && returnDate ? `${returnDate} 12:00:00.000Z` : undefined,
        return_departure: roundtrip ? returnDep || undefined : undefined,
        return_arrival: roundtrip ? returnArr || undefined : undefined,
        layovers: layovers.trim() || undefined,
        passengers: passengersInput.trim() || undefined,
        milheiro_custom:
          paymentMode === 'milhas' && custoMode === 'informar' ? milheiroNum : undefined,
        issued_at: `${issuedAt} 12:00:00.000Z`,
        notes: notes.trim() || undefined,
        trip: trip.trim() || undefined,
        ...(paymentMode === 'milhas' ? { program: programId, entry: entryId } : {}),
      })

      toast({
        title: 'Reserva registrada',
        description:
          paymentMode === 'milhas'
            ? 'O extrato do programa foi debitado.'
            : 'A passagem foi salva como compra em dinheiro.',
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
            Nova passagem
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* 1–2: código da reserva + situação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-code" className="text-xs font-semibold text-[#23201A]">
                Código da reserva
              </Label>
              <Input
                id="fl-code"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                maxLength={20}
                placeholder="Ex.: ABC123"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-status" className="text-xs font-semibold text-[#23201A]">
                Situação
              </Label>
              <select
                id="fl-status"
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

          {/* 3–4: origem / destino */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-origin" className="text-xs font-semibold text-[#23201A]">
                Origem
              </Label>
              <Input
                id="fl-origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="GRU"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-dest" className="text-xs font-semibold text-[#23201A]">
                Destino
              </Label>
              <Input
                id="fl-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="FCO"
                className="rrmilhas-input"
              />
            </div>
          </div>

          {/* 5–6: companhia / cabine */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-airline" className="text-xs font-semibold text-[#23201A]">
                Companhia
              </Label>
              <Input
                id="fl-airline"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                maxLength={80}
                placeholder="Ex.: LATAM"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-cabin" className="text-xs font-semibold text-[#23201A]">
                Cabine
              </Label>
              <select
                id="fl-cabin"
                value={cabin}
                onChange={(e) => setCabin(e.target.value)}
                className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer"
              >
                {CABINES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7: Ida e volta / Só ida */}
          <SegToggle
            value={roundtrip ? 'volta' : 'ida'}
            onChange={(v) => setRoundtrip(v === 'volta')}
            options={[
              { value: 'volta', label: 'Ida e volta' },
              { value: 'ida', label: 'Só ida' },
            ]}
          />

          <div className="space-y-3">
            {/* linha Ida */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fl-out-date" className="text-xs font-semibold text-[#23201A]">
                  Ida
                </Label>
                <Input
                  id="fl-out-date"
                  type="date"
                  value={outboundDate}
                  onChange={(e) => setOutboundDate(e.target.value)}
                  className={cn('rrmilhas-input', errors.outbound_date && 'border-[#C4452F]')}
                />
                {errors.outbound_date && (
                  <p className="text-xs text-[#C4452F]">{errors.outbound_date}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fl-out-dep" className="text-xs font-semibold text-[#23201A]">
                  Saída
                </Label>
                <Input
                  id="fl-out-dep"
                  type="time"
                  value={outboundDep}
                  onChange={(e) => setOutboundDep(e.target.value)}
                  className="rrmilhas-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fl-out-arr" className="text-xs font-semibold text-[#23201A]">
                  Chegada
                </Label>
                <Input
                  id="fl-out-arr"
                  type="time"
                  value={outboundArr}
                  onChange={(e) => setOutboundArr(e.target.value)}
                  className="rrmilhas-input"
                />
              </div>
            </div>

            {/* linha Volta */}
            {roundtrip && (
              <div className="grid grid-cols-3 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <Label htmlFor="fl-ret-date" className="text-xs font-semibold text-[#23201A]">
                    Volta
                  </Label>
                  <Input
                    id="fl-ret-date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="rrmilhas-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fl-ret-dep" className="text-xs font-semibold text-[#23201A]">
                    Saída
                  </Label>
                  <Input
                    id="fl-ret-dep"
                    type="time"
                    value={returnDep}
                    onChange={(e) => setReturnDep(e.target.value)}
                    className="rrmilhas-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fl-ret-arr" className="text-xs font-semibold text-[#23201A]">
                    Chegada
                  </Label>
                  <Input
                    id="fl-ret-arr"
                    type="time"
                    value={returnArr}
                    onChange={(e) => setReturnArr(e.target.value)}
                    className="rrmilhas-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8: conexões */}
          <div className="space-y-1.5">
            <Label htmlFor="fl-layovers" className="text-xs font-semibold text-[#23201A]">
              Conexões (opcional)
            </Label>
            <Input
              id="fl-layovers"
              value={layovers}
              onChange={(e) => setLayovers(e.target.value)}
              maxLength={300}
              placeholder="Ex.: 1 em Lisboa, 2h40"
              className="rrmilhas-input"
            />
          </div>

          {/* 9: passageiros */}
          <div className="space-y-1.5">
            <Label htmlFor="fl-passengers" className="text-xs font-semibold text-[#23201A]">
              Passageiros
            </Label>
            <Input
              id="fl-passengers"
              value={passengersInput}
              onChange={(e) => setPassengersInput(e.target.value)}
              list="fl-passenger-suggestions"
              placeholder="Ex.: Ana Silva, João Silva"
              className="rrmilhas-input"
            />
            <datalist id="fl-passenger-suggestions">
              {allPassengers.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <p className="text-xs text-[#6E6A5E]">Separe os nomes por vírgula.</p>
          </div>

          {/* 10: bloco de pagamento */}
          <div className="rounded-2xl bg-[#FAF7F0] border border-[#E8E2D6] p-4 space-y-4">
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
                  <Label htmlFor="fl-program" className="text-xs font-semibold text-[#23201A]">
                    Programa
                  </Label>
                  <select
                    id="fl-program"
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className={cn(
                      'rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white cursor-pointer',
                      errors.program && 'border-[#C4452F]',
                    )}
                  >
                    <option value="">Escolha o programa</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
                  <p className="text-xs text-[#6E6A5E]">
                    Programa cadastrado desconta do extrato. Outro programa só registra.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fl-miles" className="text-xs font-semibold text-[#23201A]">
                      Milhas usadas
                    </Label>
                    <Input
                      id="fl-miles"
                      inputMode="numeric"
                      value={milesUsed}
                      onChange={(e) => setMilesUsed(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex.: 60000"
                      className={cn(
                        'rrmilhas-input tabular-nums',
                        errors.miles_used && 'border-[#C4452F]',
                      )}
                    />
                    {errors.miles_used && (
                      <p className="text-xs text-[#C4452F]">{errors.miles_used}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fl-fees" className="text-xs font-semibold text-[#23201A]">
                      Taxas (R$)
                    </Label>
                    <Input
                      id="fl-fees"
                      inputMode="decimal"
                      value={fees}
                      onChange={(e) => setFees(maskBRL(e.target.value))}
                      placeholder="Ex.: 180,00"
                      className="rrmilhas-input tabular-nums"
                    />
                  </div>
                </div>

                {/* custo do milheiro: programa ou informado */}
                <div className="space-y-2">
                  <SegToggle
                    value={custoMode}
                    onChange={(v) => setCustoMode(v)}
                    options={[
                      { value: 'programa', label: 'Custo médio do programa' },
                      { value: 'informar', label: 'Informar custo' },
                    ]}
                  />
                  {custoMode === 'programa' ? (
                    <p className="text-xs text-[#6E6A5E]">
                      Milheiro considerado:{' '}
                      <span className="font-semibold text-[#23201A]">
                        R$ {milheiroNum.toFixed(2).replace('.', ',')}
                      </span>
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="fl-milheiro" className="text-xs font-semibold text-[#23201A]">
                        Milheiro considerado (R$)
                      </Label>
                      <Input
                        id="fl-milheiro"
                        inputMode="decimal"
                        value={milheiro}
                        onChange={(e) => setMilheiro(maskBRL(e.target.value))}
                        placeholder="Ex.: 45,00"
                        className={cn(
                          'rrmilhas-input tabular-nums',
                          errors.milheiro && 'border-[#C4452F]',
                        )}
                      />
                      {errors.milheiro && (
                        <p className="text-xs text-[#C4452F]">{errors.milheiro}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fl-reference" className="text-xs font-semibold text-[#23201A]">
                    Quanto custaria em dinheiro (R$)
                  </Label>
                  <Input
                    id="fl-reference"
                    inputMode="decimal"
                    value={referenceValue}
                    onChange={(e) => setReferenceValue(maskBRL(e.target.value))}
                    placeholder="Ex.: 3.400,00"
                    className="rrmilhas-input tabular-nums"
                  />
                  <p className="text-xs text-[#6E6A5E]">Para calcular a economia. Opcional.</p>
                </div>

                {/* rodapé AO VIVO */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-white border border-[#E8E2D6] p-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A5E]">
                      Milhas em R$
                    </p>
                    <p className="text-sm font-bold text-[#23201A] tabular-nums mt-0.5">
                      {formatBRL(milhasEmReais)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A5E]">
                      Custo real
                    </p>
                    <p className="text-sm font-bold text-[#23201A] tabular-nums mt-0.5">
                      {formatBRL(custoReal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6A5E]">
                      Economia
                    </p>
                    <p
                      className={cn(
                        'text-sm font-bold tabular-nums mt-0.5',
                        economia > 0 ? 'text-[#1B7F4B]' : 'text-[#6E6A5E]',
                      )}
                    >
                      {formatBRL(economia)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="fl-cash" className="text-xs font-semibold text-[#23201A]">
                  Valor pago (R$)
                </Label>
                <Input
                  id="fl-cash"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(maskBRL(e.target.value))}
                  placeholder="Ex.: 3.400,00"
                  className={cn(
                    'rrmilhas-input tabular-nums',
                    errors.cash_amount && 'border-[#C4452F]',
                  )}
                />
                {errors.cash_amount && (
                  <p className="text-xs text-[#C4452F]">{errors.cash_amount}</p>
                )}
              </div>
            )}
          </div>

          {/* 11–12: viagem + data da emissão */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-trip" className="text-xs font-semibold text-[#23201A]">
                Viagem
              </Label>
              <Input
                id="fl-trip"
                value={trip}
                onChange={(e) => setTrip(e.target.value)}
                maxLength={120}
                placeholder="Sem viagem"
                list="flight-trip-suggestions"
                className="rrmilhas-input"
              />
              <datalist id="flight-trip-suggestions">
                {tripSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-issued" className="text-xs font-semibold text-[#23201A]">
                Data da emissão
              </Label>
              <Input
                id="fl-issued"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className={cn('rrmilhas-input', errors.issued_at && 'border-[#C4452F]')}
              />
              {errors.issued_at && <p className="text-xs text-[#C4452F]">{errors.issued_at}</p>}
            </div>
          </div>

          {/* 13: observações */}
          <div className="space-y-1.5">
            <Label htmlFor="fl-notes" className="text-xs font-semibold text-[#23201A]">
              Observações (opcional)
            </Label>
            <Textarea
              id="fl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              className="rrmilhas-input resize-none"
            />
          </div>

          {/* 14: registrar */}
          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#D9A93F] to-[#B98A28] text-[#23201A] font-semibold hover:opacity-90 active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : 'Registrar reserva'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
