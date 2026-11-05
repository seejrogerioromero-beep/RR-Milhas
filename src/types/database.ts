import type { RecordModel } from 'pocketbase'

export interface UserRecord extends RecordModel {
  email: string
  name: string
  avatar?: string
  verified: boolean
}

/* ------------------------------ RRMILHAS ---------------------------------- */

export interface ProgramRecord extends RecordModel {
  name: string
  balance: number
  /** R$ pagos, em média, por 1.000 milhas */
  cost_per_thousand: number
  /** Valor de mercado estimado de 1.000 milhas */
  market_per_thousand: number
}

export type ProgramEntryType = 'entrada' | 'saida'

export interface ProgramEntryRecord extends RecordModel {
  program: string
  type: ProgramEntryType
  description: string
  quantity: number
  /** custo do milheiro registrado na entrada (R$ por 1.000 milhas) */
  cost_per_thousand?: number
  date: string
  expand?: {
    program?: ProgramRecord
  }
}

export type PaymentMethod = 'milhas' | 'dinheiro'

export interface FlightRecord extends RecordModel {
  route: string
  airline?: string
  departure: string
  payment_method: PaymentMethod
  miles_used?: number
  /** taxas de embarque em R$ */
  fees?: number
  /** valor pago em dinheiro (quando não usa milhas) */
  cash_amount?: number
  /** valor de referência da passagem em dinheiro, para calcular a economia */
  reference_value?: number
  program?: string
  entry?: string
  expand?: {
    program?: ProgramRecord
  }
}

export interface HotelRecord extends RecordModel {
  hotel: string
  destination?: string
  check_in: string
  check_out: string
  total_value?: number
  payment_method: PaymentMethod
  miles_used?: number
  program?: string
  entry?: string
  expand?: {
    program?: ProgramRecord
  }
}
