// Helpers financeiros do RRMILHAS: formatação e cálculo de economia de milhas.

export const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatMiles = (value: number) => Math.round(value).toLocaleString('pt-BR')

export const formatDateBR = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTimeBR = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const parseNumberInput = (raw: string): number | null => {
  if (!raw.trim()) return null
  const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

/** Máscara BRL: aceita só dígitos e devolve "1.234,56" */
export const maskBRL = (raw: string): string => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const numeric = parseInt(digits, 10) / 100
  return numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface FlightSavings {
  spent: number
  savings: number
}

/**
 * Economia de uma passagem:
 *  - milhas: valor de referência − (milhas/1000 × custo médio do programa + taxas)
 *  - dinheiro: valor de referência − valor pago
 */
export const computeFlightSavings = (flight: {
  payment_method: 'milhas' | 'dinheiro'
  miles_used?: number
  fees?: number
  cash_amount?: number
  reference_value?: number
  program_cost_per_thousand?: number
}): FlightSavings | null => {
  if (flight.reference_value == null || flight.reference_value <= 0) return null

  const spent =
    flight.payment_method === 'milhas'
      ? ((flight.miles_used || 0) / 1000) * (flight.program_cost_per_thousand || 0) +
        (flight.fees || 0)
      : flight.cash_amount || 0

  return { spent, savings: flight.reference_value - spent }
}

export const nightsBetween = (checkIn: string, checkOut: string): number => {
  const a = new Date(checkIn).getTime()
  const b = new Date(checkOut).getTime()
  if (isNaN(a) || isNaN(b) || b <= a) return 0
  return Math.round((b - a) / 86400000)
}
