import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import type { ProgramRecord } from '@/types/database'
import { maskBRL, parseNumberInput, formatBRL } from '@/lib/miles'
import { cn } from '@/lib/utils'

/** Confirmação de exclusão genérica do RRMILHAS. */
export function ConfirmDelete({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string
  description: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="rounded-xl bg-[#C4452F] hover:bg-[#A93A26] text-white"
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Formulário (em Sheet) de novo programa de milhas. */
export function ProgramFormSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [costPerThousand, setCostPerThousand] = useState('')
  const [marketPerThousand, setMarketPerThousand] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setBalance('')
    setCostPerThousand('')
    setMarketPerThousand('')
    setErrors({})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nome do programa é obrigatório'
    const bal = parseNumberInput(balance)
    if (bal == null || bal < 0) errs.balance = 'Informe o saldo atual de milhas'
    const cost = parseNumberInput(costPerThousand)
    if (cost == null || cost < 0) errs.cost_per_thousand = 'Informe o custo do milheiro'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      await pb.collection('programs').create({
        name: name.trim(),
        balance: bal,
        cost_per_thousand: cost,
        market_per_thousand: parseNumberInput(marketPerThousand) || 0,
      })
      toast({
        title: 'Programa cadastrado',
        description: `${name.trim()} já aparece na sua lista.`,
      })
      reset()
      onClose()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Novo programa de milhas">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="program-name" className="text-xs font-semibold text-[#23201A]">
            Nome do programa *
          </Label>
          <Input
            id="program-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Ex: Smiles, LATAM Pass, Azul Fidelidade"
            className={cn('rrmilhas-input', errors.name && 'border-[#C4452F]')}
          />
          {errors.name && <p className="text-xs text-[#C4452F]">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="program-balance" className="text-xs font-semibold text-[#23201A]">
            Saldo atual de milhas *
          </Label>
          <Input
            id="program-balance"
            inputMode="numeric"
            value={balance}
            onChange={(e) => setBalance(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 25000"
            className={cn('rrmilhas-input tabular-nums', errors.balance && 'border-[#C4452F]')}
          />
          {errors.balance && <p className="text-xs text-[#C4452F]">{errors.balance}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="program-cost" className="text-xs font-semibold text-[#23201A]">
              Custo do milheiro (R$) *
            </Label>
            <Input
              id="program-cost"
              inputMode="decimal"
              value={costPerThousand}
              onChange={(e) => setCostPerThousand(maskBRL(e.target.value))}
              placeholder="Ex: 64,70"
              className={cn(
                'ovv-input tabular-nums',
                errors.cost_per_thousand && 'border-[#C4452F]',
              )}
            />
            {errors.cost_per_thousand && (
              <p className="text-xs text-[#C4452F]">{errors.cost_per_thousand}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="program-market" className="text-xs font-semibold text-[#23201A]">
              Milheiro de mercado (R$)
            </Label>
            <Input
              id="program-market"
              inputMode="decimal"
              value={marketPerThousand}
              onChange={(e) => setMarketPerThousand(maskBRL(e.target.value))}
              placeholder="Ex: 72,00"
              className="rrmilhas-input tabular-nums"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
        >
          {saving ? 'Salvando...' : 'Cadastrar programa'}
        </Button>
      </form>
    </Sheet>
  )
}

/** Formulário (em Sheet) de nova passagem. Paga com milhas: debita o extrato do programa. */
export function FlightFormSheet({
  open,
  onClose,
  programs,
}: {
  open: boolean
  onClose: () => void
  programs: ProgramRecord[]
}) {
  const { toast } = useToast()
  const [route, setRoute] = useState('')
  const [airline, setAirline] = useState('')
  const [departure, setDeparture] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'milhas' | 'dinheiro'>('milhas')
  const [programId, setProgramId] = useState('')
  const [milesUsed, setMilesUsed] = useState('')
  const [fees, setFees] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [referenceValue, setReferenceValue] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selectedProgram = programs.find((p) => p.id === programId)
  const referenceNum = parseNumberInput(referenceValue)
  const feesNum = parseNumberInput(fees)
  const milesNum = parseNumberInput(milesUsed)

  const reset = () => {
    setRoute('')
    setAirline('')
    setDeparture('')
    setPaymentMethod('milhas')
    setProgramId('')
    setMilesUsed('')
    setFees('')
    setCashAmount('')
    setReferenceValue('')
    setErrors({})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!route.trim()) errs.route = 'Informe o trecho/destino'
    if (!departure) errs.departure = 'Informe a data e hora de embarque'
    if (paymentMethod === 'milhas') {
      if (!programId) errs.program = 'Vincule o programa de milhas'
      const miles = parseNumberInput(milesUsed)
      if (miles == null || miles <= 0) errs.miles_used = 'Informe as milhas debitadas'
      if (selectedProgram && miles != null && miles > (selectedProgram.balance || 0)) {
        errs.miles_used = `Saldo insuficiente: ${selectedProgram.balance.toLocaleString('pt-BR')} milhas`
      }
    } else {
      const cash = parseNumberInput(cashAmount)
      if (cash == null || cash <= 0) errs.cash_amount = 'Informe o valor pago em dinheiro'
    }
    const ref = parseNumberInput(referenceValue)
    if (ref == null || ref <= 0) errs.reference_value = 'Informe o valor de referência em dinheiro'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const departureStr = `${departure}:00.000Z`
      let entryId: string | undefined
      let miles = parseNumberInput(milesUsed)

      if (paymentMethod === 'milhas') {
        // Débito no extrato do programa
        const entry = await pb.collection('program_entries').create({
          program: programId,
          type: 'saida',
          description: `Passagem ${route.trim()}`,
          quantity: miles,
          cost_per_thousand: selectedProgram?.cost_per_thousand || 0,
          date: departureStr,
        })
        entryId = entry.id
        await pb
          .collection('programs')
          .update(programId, { balance: (selectedProgram?.balance || 0) - (miles || 0) })
      }

      await pb.collection('flights').create({
        route: route.trim(),
        airline: airline.trim() || undefined,
        departure: departureStr,
        payment_method: paymentMethod,
        miles_used: paymentMethod === 'milhas' ? miles : 0,
        fees: paymentMethod === 'milhas' ? parseNumberInput(fees) || 0 : 0,
        cash_amount: paymentMethod === 'dinheiro' ? parseNumberInput(cashAmount) || 0 : 0,
        reference_value: ref,
        ...(paymentMethod === 'milhas' ? { program: programId, entry: entryId } : {}),
      })
      toast({
        title: 'Passagem registrada',
        description:
          paymentMethod === 'milhas'
            ? 'O extrato do programa foi debitado e a economia calculada.'
            : 'A emissão foi salva com a economia em dinheiro.',
      })
      reset()
      onClose()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova passagem">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="flight-route" className="text-xs font-semibold text-[#23201A]">
            Trecho / destino *
          </Label>
          <Input
            id="flight-route"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            maxLength={120}
            placeholder="Ex: GRU → MAD"
            className={cn('ovv-input', errors.route && 'border-[#C4452F]')}
          />
          {errors.route && <p className="text-xs text-[#C4452F]">{errors.route}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="flight-airline" className="text-xs font-semibold text-[#23201A]">
              Companhia
            </Label>
            <Input
              id="flight-airline"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              maxLength={80}
              placeholder="Ex: LATAM"
              className="rrmilhas-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flight-departure" className="text-xs font-semibold text-[#23201A]">
              Embarque *
            </Label>
            <Input
              id="flight-departure"
              type="datetime-local"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className={cn('ovv-input', errors.departure && 'border-[#C4452F]')}
            />
            {errors.departure && <p className="text-xs text-[#C4452F]">{errors.departure}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#23201A]">Forma de pagamento *</Label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
            {(['milhas', 'dinheiro'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={cn(
                  'h-10 rounded-lg text-sm font-semibold capitalize transition-all',
                  paymentMethod === m
                    ? 'bg-[#16418F] text-white shadow-sm'
                    : 'text-[#6E6A5E] hover:bg-white',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'milhas' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="flight-program" className="text-xs font-semibold text-[#23201A]">
                Programa de milhas *
              </Label>
              <select
                id="flight-program"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className={cn(
                  'rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white',
                  errors.program && 'border-[#C4452F]',
                )}
              >
                <option value="">Selecione o programa</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.balance.toLocaleString('pt-BR')} milhas
                  </option>
                ))}
              </select>
              {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="flight-miles" className="text-xs font-semibold text-[#23201A]">
                  Milhas debitadas *
                </Label>
                <Input
                  id="flight-miles"
                  inputMode="numeric"
                  value={milesUsed}
                  onChange={(e) => setMilesUsed(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 25000"
                  className={cn('ovv-input tabular-nums', errors.miles_used && 'border-[#C4452F]')}
                />
                {errors.miles_used && <p className="text-xs text-[#C4452F]">{errors.miles_used}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flight-fees" className="text-xs font-semibold text-[#23201A]">
                  Taxas (R$)
                </Label>
                <Input
                  id="flight-fees"
                  inputMode="decimal"
                  value={fees}
                  onChange={(e) => setFees(maskBRL(e.target.value))}
                  placeholder="Ex: 89,90"
                  className="ovv-input tabular-nums"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="flight-cash" className="text-xs font-semibold text-[#23201A]">
              Valor pago em dinheiro (R$) *
            </Label>
            <Input
              id="flight-cash"
              inputMode="decimal"
              value={cashAmount}
              onChange={(e) => setCashAmount(maskBRL(e.target.value))}
              placeholder="Ex: 780,00"
              className={cn('ovv-input tabular-nums', errors.cash_amount && 'border-[#C4452F]')}
            />
            {errors.cash_amount && <p className="text-xs text-[#C4452F]">{errors.cash_amount}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="flight-reference" className="text-xs font-semibold text-[#23201A]">
            Valor de referência da passagem (R$) *
          </Label>
          <Input
            id="flight-reference"
            inputMode="decimal"
            value={referenceValue}
            onChange={(e) => setReferenceValue(maskBRL(e.target.value))}
            placeholder="Preço da passagem paga em dinheiro"
            className={cn('ovv-input tabular-nums', errors.reference_value && 'border-[#C4452F]')}
          />
          {errors.reference_value && (
            <p className="text-xs text-[#C4452F]">{errors.reference_value}</p>
          )}
          {paymentMethod === 'milhas' &&
            selectedProgram &&
            referenceNum != null &&
            referenceNum > 0 && (
              <p className="text-xs text-[#0E8FB8]">
                Economia estimada:{' '}
                {formatBRL(
                  referenceNum -
                    (((milesNum || 0) / 1000) * selectedProgram.cost_per_thousand + (feesNum || 0)),
                )}
              </p>
            )}
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
        >
          {saving ? 'Salvando...' : 'Registrar passagem'}
        </Button>
      </form>
    </Sheet>
  )
}

/** Formulário (em Sheet) de nova hospedagem. */
export function HotelFormSheet({
  open,
  onClose,
  programs,
}: {
  open: boolean
  onClose: () => void
  programs: ProgramRecord[]
}) {
  const { toast } = useToast()
  const [hotel, setHotel] = useState('')
  const [destination, setDestination] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'milhas'>('dinheiro')
  const [programId, setProgramId] = useState('')
  const [milesUsed, setMilesUsed] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selectedProgram = programs.find((p) => p.id === programId)

  const reset = () => {
    setHotel('')
    setDestination('')
    setCheckIn('')
    setCheckOut('')
    setTotalValue('')
    setPaymentMethod('dinheiro')
    setProgramId('')
    setMilesUsed('')
    setErrors({})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!hotel.trim()) errs.hotel = 'Informe o hotel/local'
    if (!checkIn) errs.check_in = 'Informe o check-in'
    if (!checkOut) errs.check_out = 'Informe o check-out'
    if (checkIn && checkOut && checkOut <= checkIn) {
      errs.check_out = 'O check-out deve ser depois do check-in'
    }
    if (paymentMethod === 'dinheiro') {
      const value = parseNumberInput(totalValue)
      if (value == null || value <= 0) errs.total_value = 'Informe o valor total'
    } else {
      if (!programId) errs.program = 'Vincule o programa de milhas'
      const miles = parseNumberInput(milesUsed)
      if (miles == null || miles <= 0) errs.miles_used = 'Informe as milhas usadas'
      if (selectedProgram && miles != null && miles > (selectedProgram.balance || 0)) {
        errs.miles_used = `Saldo insuficiente: ${selectedProgram.balance.toLocaleString('pt-BR')} milhas`
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const checkInStr = `${checkIn} 12:00:00.000Z`
      const checkOutStr = `${checkOut} 12:00:00.000Z`
      let entryId: string | undefined
      const miles = parseNumberInput(milesUsed)

      if (paymentMethod === 'milhas') {
        const entry = await pb.collection('program_entries').create({
          program: programId,
          type: 'saida',
          description: `Hospedagem — ${hotel.trim()}`,
          quantity: miles,
          cost_per_thousand: selectedProgram?.cost_per_thousand || 0,
          date: checkInStr,
        })
        entryId = entry.id
        await pb
          .collection('programs')
          .update(programId, { balance: (selectedProgram?.balance || 0) - (miles || 0) })
      }

      await pb.collection('hotels').create({
        hotel: hotel.trim(),
        destination: destination.trim() || undefined,
        check_in: checkInStr,
        check_out: checkOutStr,
        total_value: parseNumberInput(totalValue) || 0,
        payment_method: paymentMethod,
        miles_used: paymentMethod === 'milhas' ? miles : 0,
        ...(paymentMethod === 'milhas' ? { program: programId, entry: entryId } : {}),
      })
      toast({ title: 'Hospedagem registrada', description: `${hotel.trim()} foi salva.` })
      reset()
      onClose()
    } catch (err) {
      setErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova hospedagem">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="hotel-name" className="text-xs font-semibold text-[#23201A]">
            Hotel / local *
          </Label>
          <Input
            id="hotel-name"
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
            maxLength={120}
            placeholder="Ex: Fasano Rio de Janeiro"
            className={cn('ovv-input', errors.hotel && 'border-[#C4452F]')}
          />
          {errors.hotel && <p className="text-xs text-[#C4452F]">{errors.hotel}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hotel-destination" className="text-xs font-semibold text-[#23201A]">
            Destino
          </Label>
          <Input
            id="hotel-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            maxLength={120}
            placeholder="Ex: Rio de Janeiro, RJ"
            className="ovv-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="hotel-checkin" className="text-xs font-semibold text-[#23201A]">
              Check-in *
            </Label>
            <Input
              id="hotel-checkin"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={cn('ovv-input', errors.check_in && 'border-[#C4452F]')}
            />
            {errors.check_in && <p className="text-xs text-[#C4452F]">{errors.check_in}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-checkout" className="text-xs font-semibold text-[#23201A]">
              Check-out *
            </Label>
            <Input
              id="hotel-checkout"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className={cn('ovv-input', errors.check_out && 'border-[#C4452F]')}
            />
            {errors.check_out && <p className="text-xs text-[#C4452F]">{errors.check_out}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#23201A]">Pago com *</Label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
            {(['dinheiro', 'milhas'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={cn(
                  'h-10 rounded-lg text-sm font-semibold capitalize transition-all',
                  paymentMethod === m
                    ? 'bg-[#16418F] text-white shadow-sm'
                    : 'text-[#6E6A5E] hover:bg-white',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'dinheiro' ? (
          <div className="space-y-1.5">
            <Label htmlFor="hotel-value" className="text-xs font-semibold text-[#23201A]">
              Valor total (R$) *
            </Label>
            <Input
              id="hotel-value"
              inputMode="decimal"
              value={totalValue}
              onChange={(e) => setTotalValue(maskBRL(e.target.value))}
              placeholder="Ex: 4.850,00"
              className={cn('ovv-input tabular-nums', errors.total_value && 'border-[#C4452F]')}
            />
            {errors.total_value && <p className="text-xs text-[#C4452F]">{errors.total_value}</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="hotel-program" className="text-xs font-semibold text-[#23201A]">
              Programa de milhas *
            </Label>
            <select
              id="hotel-program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className={cn(
                'ovv-input w-full h-11 px-3 text-sm text-[#23201A] bg-white',
                errors.program && 'border-[#C4452F]',
              )}
            >
              <option value="">Selecione o programa</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.balance.toLocaleString('pt-BR')} milhas
                </option>
              ))}
            </select>
            {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="hotel-miles" className="text-xs font-semibold text-[#23201A]">
                Milhas usadas *
              </Label>
              <Input
                id="hotel-miles"
                inputMode="numeric"
                value={milesUsed}
                onChange={(e) => setMilesUsed(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 60000"
                className={cn('ovv-input tabular-nums', errors.miles_used && 'border-[#C4452F]')}
              />
              {errors.miles_used && <p className="text-xs text-[#C4452F]">{errors.miles_used}</p>}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
        >
          {saving ? 'Salvando...' : 'Registrar hospedagem'}
        </Button>
      </form>
    </Sheet>
  )
}
