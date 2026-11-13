import type {
  ExtractResult,
  ExtractedProgram,
  ExtractedMovement,
  ExtractedFlight,
  ExtractedHotel,
  ExtractedPassenger,
  ExtractedTrip,
} from '@/services/importExtract'
import type {
  ProgramRecord,
  FlightRecord,
  HotelRecord,
  PassengerRecord,
  TripRecord,
} from '@/types/database'

/** Como resolver um item extraído que já existe no app. */
export type DupAction = 'add' | 'replace' | 'skip'

export function normalize(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function onlyDate(s?: string): string {
  return (s || '').slice(0, 10)
}

/** Rota da passagem: "GIG → CNF · GIG → CNF" (ordem dos trechos). */
export function flightRouteOf(f: Pick<FlightRecord, 'route' | 'origin' | 'destination'>): string {
  if (f.route && f.route.includes('→')) return normalize(f.route)
  return f.origin && f.destination ? normalize(`${f.origin} → ${f.destination}`) : ''
}

/* --------------------------- Detectores ---------------------------------- */

/** Programa: mesmo nome (normalizado). */
export function findDupProgram(
  p: ExtractedProgram,
  existing: ProgramRecord[],
): ProgramRecord | null {
  const n = normalize(p.name)
  if (!n) return null
  return existing.find((e) => normalize(e.name) === n) || null
}

/**
 * Movimentação: mesmo programa + data + valor (mesma quantidade e sinal).
 * description é um desempate fraco — extratos abreviam descrições.
 */
export function findDupMovement(
  m: ExtractedMovement,
  existing: { id: string; program: string; date: string; quantity: number; type: string }[],
  programId: string,
): { id: string } | null {
  const d = onlyDate(m.date)
  const q = Math.abs(m.amount || 0)
  if (!d || !q) return null
  const type = m.amount >= 0 ? 'entrada' : 'saida'
  return (
    existing.find(
      (e) =>
        e.program === programId &&
        onlyDate(e.date) === d &&
        Math.abs(e.quantity || 0) === q &&
        e.type === type,
    ) || null
  )
}

/**
 * Passagem: mesmo localizador OU mesma companhia+origem+destino+data
 * (primeira trecho). Sem companhia conhecida, rota+data idêntica conta.
 */
export function findDupFlight(f: ExtractedFlight, existing: FlightRecord[]): FlightRecord | null {
  const code = normalize(f.booking_code)
  const first = f.segments[0]
  if (!code && !(first && first.origin && first.destination)) return null
  const depDate = onlyDate(first?.datetime)
  const route = normalize(
    f.segments
      .map((s) => `${s.origin} → ${s.destination}`)
      .filter(Boolean)
      .join(' · '),
  )
  return (
    existing.find((e) => {
      if (code && normalize(e.booking_code) === code) return true
      if (depDate && onlyDate(e.departure) === depDate) {
        if (route && flightRouteOf(e) === route) return true
        const airline = normalize(f.airline)
        if (
          airline &&
          normalize(e.airline) === airline &&
          normalize(e.origin) === normalize(first.origin) &&
          normalize(e.destination) === normalize(first.destination)
        )
          return true
      }
      return false
    }) || null
  )
}

/** Hospedagem: mesmo hotel + check-in (ou mesmo localizador). */
export function findDupHotel(h: ExtractedHotel, existing: HotelRecord[]): HotelRecord | null {
  const code = normalize(h.booking_code)
  if (code) {
    const byCode = existing.find((e) => normalize(e.booking_code) === code)
    if (byCode) return byCode
  }
  const name = normalize(h.name)
  const cin = onlyDate(h.check_in)
  if (!name || !cin) return null
  return existing.find((e) => normalize(e.hotel) === name && onlyDate(e.check_in) === cin) || null
}

/** Passageiro: mesmo nome OU mesmo CPF (quando ambos têm CPF). */
export function findDupPassenger(
  p: ExtractedPassenger,
  existing: PassengerRecord[],
): PassengerRecord | null {
  const name = normalize(p.name)
  const cpf = normalize(p.cpf).replace(/\D/g, '')
  if (!name && !cpf) return null
  return (
    existing.find((e) => {
      if (cpf && e.cpf && normalize(e.cpf).replace(/\D/g, '') === cpf) return true
      return name !== '' && normalize(e.name) === name
    }) || null
  )
}

/** Viagem: mesmo nome (normalizado). */
export function findDupTrip(t: ExtractedTrip, existing: TripRecord[]): TripRecord | null {
  const n = normalize(t.name)
  if (!n) return null
  return existing.find((e) => normalize(e.name) === n) || null
}

/* ----------------------- Comparação para SUBSTITUIR ----------------------- */

/**
 * O item extraído traz algo que o cadastro atual não tem? Só aí vale a pena
 * substituir — evita sobrescrever dados bons com dados vazios.
 */
export function replaceWouldChangeFlight(f: ExtractedFlight, e: FlightRecord): boolean {
  if (f.miles > 0 && (e.miles_used || 0) !== f.miles) return true
  if (f.fees > 0 && Math.abs((e.fees || 0) - f.fees) > 0.01) return true
  const code = normalize(f.booking_code)
  if (code && normalize(e.booking_code) !== code) return true
  const pax = f.passengers.join(', ')
  if (pax && normalize(e.passengers || '') !== normalize(pax)) return true
  // Partida do primeiro trecho: o cadastro não guarda assento, mas guarda
  // horário de partida/chegada — diferença de horário também é dado novo.
  const depTime = (f.segments[0]?.datetime || '').slice(11)
  if (depTime && normalize(e.outbound_departure || '') !== normalize(depTime)) return true
  const arrTime = (f.segments[0]?.arrival_datetime || '').slice(11)
  if (arrTime && normalize(e.outbound_arrival || '') !== normalize(arrTime)) return true
  return false
}

export function replaceWouldChangeHotel(h: ExtractedHotel, e: HotelRecord): boolean {
  if (h.miles > 0 && (e.miles_used || 0) !== h.miles) return true
  if (h.fees > 0 && Math.abs((e.fees || 0) - h.fees) > 0.01) return true
  if (h.cash_amount > 0 && Math.abs((e.total_value || 0) - h.cash_amount) > 0.01) return true
  const code = normalize(h.booking_code)
  if (code && normalize(e.booking_code) !== code) return true
  if (normalize(h.guests) && normalize(e.guests || '') !== normalize(h.guests)) return true
  // Datas diferentes de check-in/out = dados novos.
  if (onlyDate(h.check_in) && onlyDate(e.check_in) !== onlyDate(h.check_in)) return true
  if (onlyDate(h.check_out) && onlyDate(e.check_out) !== onlyDate(h.check_out)) return true
  return false
}

export function replaceWouldChangeProgram(p: ExtractedProgram, e: ProgramRecord): boolean {
  if (p.balance > 0 && (e.balance || 0) !== p.balance) return true
  if (p.miles_expiry && onlyDate(e.miles_expiry) !== onlyDate(p.miles_expiry)) return true
  if (normalize(p.elite_status) && normalize(e.elite_status || '') !== normalize(p.elite_status))
    return true
  return false
}

/* --------------------------- Rótulo do alerta ----------------------------- */

export interface DupInfo {
  /** id do registro existente (para substituir) */
  existingId: string
  /** descrição curta do que já existe */
  label: string
  /** substituir traria dados novos? */
  wouldChange: boolean
}

export function dupLabelFlight(e: FlightRecord): string {
  const bits = [flightRouteOf(e) || 'passagem']
  const d = onlyDate(e.departure)
  if (d) bits.push(d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4))
  if (e.booking_code) bits.push(`localizador ${e.booking_code}`)
  return bits.join(' · ')
}

export function dupLabelHotel(e: HotelRecord): string {
  const bits = [e.hotel || 'hospedagem']
  const cin = onlyDate(e.check_in)
  if (cin) bits.push('check-in ' + cin.slice(8, 10) + '/' + cin.slice(5, 7) + '/' + cin.slice(0, 4))
  return bits.join(' · ')
}

export function dupLabelProgram(e: ProgramRecord): string {
  return `${e.name} · ${new Intl.NumberFormat('pt-BR').format(e.balance || 0)} milhas`
}

export function dupLabelPassenger(e: PassengerRecord): string {
  return e.name
}

export function dupLabelTrip(e: TripRecord): string {
  return e.name
}

/** Resumo de duplicidades de TODO o resultado (para o aviso do topo). */
export function countDuplicates(result: ExtractResult): number {
  const all = [
    ...result.programs.map((p) => p.duplicate_of),
    ...result.movements.map((m) => m.duplicate_of),
    ...result.flights.map((f) => f.duplicate_of),
    ...result.hotels.map((h) => h.duplicate_of),
    ...result.passengers.map((p) => p.duplicate_of),
    ...result.trips.map((t) => t.duplicate_of),
  ]
  return all.filter((d) => d && d.trim().length > 0).length
}
