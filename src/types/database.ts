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
  /** marcado como clube/banco — pode ser origem de transferência de pontos */
  is_club?: boolean
  /** data de validade das milhas (opcional) */
  miles_expiry?: string
  /** status elite no programa (ex.: Gold, Diamante) — opcional */
  elite_status?: string
}

export interface CreditCardRecord extends RecordModel {
  name: string
  brand?: string
  program?: string
  /** pontos acumulados por R$ 1 gasto no cartão */
  pontos_por_real?: number
  /** anuidade anual em R$ */
  anuidade?: number
  /** dia de fechamento da fatura */
  fechamento?: string
  /** cartão ativo? */
  ativo?: boolean
  expand?: {
    program?: ProgramRecord
  }
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

export type FlightStatus = 'confirmada' | 'em_espera' | 'cancelada' | 'utilizada'
export type FlightCabin = 'economica' | 'premium' | 'executiva' | 'primeira'

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
  /** código da reserva (PNR) */
  booking_code?: string
  status?: FlightStatus
  origin?: string
  destination?: string
  cabin?: FlightCabin
  roundtrip?: boolean
  outbound_date?: string
  outbound_departure?: string
  outbound_arrival?: string
  return_date?: string
  return_departure?: string
  return_arrival?: string
  layovers?: string
  passengers?: string
  /** milheiro informado manualmente no formulário (R$ por 1.000 milhas) */
  milheiro_custom?: number
  issued_at?: string
  notes?: string
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
  /** fiel ao print "Nova hospedagem" */
  booking_code?: string
  status?: FlightStatus
  country?: string
  room?: string
  guests?: string
  trip?: string
  /** taxas em R$ (modo milhas) */
  fees?: number
  /** valor de referência em dinheiro, para calcular a economia */
  reference_value?: number
  /** milheiro informado manualmente (R$ por 1.000 milhas) */
  milheiro_custom?: number
  issued_at?: string
  notes?: string
  program?: string
  entry?: string
  expand?: {
    program?: ProgramRecord
  }
}

export type ClubBilling = 'mensal' | 'anual'

/** Plano de clube: mensalidade/anuidade de um programa (ex.: Livelo). */
export interface ClubPlanRecord extends RecordModel {
  program: string
  plan_name: string
  points_per_month?: number
  billing_day?: number
  billing: ClubBilling
  /** valor da cobrança (mensal ou anual, conforme `billing`) em R$ */
  monthly_value?: number
  active?: boolean
  expand?: {
    program?: ProgramRecord
  }
}

/** Viagem cadastrada no módulo Viagens — agrupa passagens e hospedagens pelo nome. */
export interface TripRecord extends RecordModel {
  name: string
  destination?: string
  start_date?: string
  end_date?: string
  notes?: string
}

/** Ponto esperado ("milhas a chegar") — versão manual do Balance Watch. */
export type ExpectedPointStatus = 'pendente' | 'confirmado'

export interface ExpectedPointRecord extends RecordModel {
  program: string
  miles: number
  description?: string
  expected_date?: string
  status: ExpectedPointStatus
  expand?: {
    program?: ProgramRecord
  }
}

export interface PassengerRecord extends RecordModel {
  name: string
  document?: string
  birth_date?: string
  notes?: string
  cpf?: string
  tem_passaporte?: boolean
  numero_passaporte?: string
  pais_emissor?: string
  emissao?: string
  validade?: string
}

/** Fase da checklist de viagem — define quando cada grupo de itens aparece. */
export type TripChecklistPhase =
  | 'antes_de_emitir'
  | 'apos_emitir'
  | 'semana_antes'
  | 'dois_dias'
  | 'dia_voo'
  | 'volta'

/** Item da checklist de uma viagem (collection trip_checklist_items). */
export interface TripChecklistItemRecord extends RecordModel {
  trip: string
  phase: TripChecklistPhase
  title: string
  done: boolean
  done_at?: string
  sort_order?: number
}
