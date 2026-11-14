import pb from '@/lib/pocketbase/client'
import type { TripChecklistItemRecord, TripChecklistPhase, TripRecord } from '@/types/database'

/** Fases na ordem de exibição, com o rótulo mostrado ao usuário. */
export const CHECKLIST_PHASES: { key: TripChecklistPhase; label: string }[] = [
  { key: 'antes_de_emitir', label: 'Antes de emitir' },
  { key: 'apos_emitir', label: 'Após emitir' },
  { key: 'documentos_seguros', label: 'Documentos e seguros' },
  { key: 'semana_antes', label: '1 semana antes' },
  { key: 'dois_dias', label: '2 dias antes' },
  { key: 'dia_voo', label: 'Dia do voo' },
  { key: 'volta', label: 'Na volta' },
]

/** Itens padrão gerados ao criar uma viagem. */
export const DEFAULT_CHECKLIST: Record<TripChecklistPhase, string[]> = {
  antes_de_emitir: [
    'Verificar validade do passaporte (mín. 6 meses após a volta)',
    'Conferir se o destino exige visto/ETA',
    'Conferir vacinas exigidas e Certificado Internacional',
    'Comparar milheiro do programa antes de emitir',
  ],
  apos_emitir: [
    'Confirmar o voo na companhia (localizador e horários)',
    'Conferir nome no bilhete = nome no passaporte',
    'Reservar hospedagem',
    'Alugar carro ou transfer aeroporto↔hotel',
    'Contratar seguro viagem',
    'Solicitar visto/eTA',
    'Verificar salas VIP nos aeroportos da rota',
  ],
  documentos_seguros: [
    'Emitir bilhete de seguro Visa Infinite (PDF salvo no celular)',
    'Emitir bilhete de seguro Mastercard Black (PDF salvo no celular)',
    'Salvar telefones das centrais de assistência offline',
    'Conferir que a passagem foi paga com o cartão certo (para valer o seguro)',
    'Em problema: motivo por escrito, fotos do painel, protocolo e recibos',
    'Bagagem: registrar RIR/PIR antes de sair da área de bagagem',
    'Guardar cartões de embarque até concluir qualquer pedido',
  ],
  semana_antes: [
    'Avisar o banco das datas de viagem',
    'Conferir limite do cartão',
    'Trocar/comprar moeda estrangeira',
    'Baixar maps offline e apps de transporte',
    'Comprar chip/eSIM internacional',
    'Resolver pendências em casa (contas, pets, correios)',
  ],
  dois_dias: [
    'Fazer a mala (conferir limite de bagagem)',
    'Separar remédios: kit pessoal + receitas',
    'Separar documentos: passaporte, CNH, vouchers',
    'Levar adaptador de tomada e carregador portátil',
    'Conferir clima do destino e ajustar roupas',
    'Fazer check-in online (24–48h antes)',
  ],
  dia_voo: [
    'Chegar com antecedência (3h internacional / 2h doméstico)',
    'Passaporte e cartão de embarque em mão',
    'Usar fast track / sala VIP (se tiver acesso)',
    'Confirmar transporte até o aeroporto',
  ],
  volta: [
    'Conferir milhas creditadas na companhia',
    'Lançar gastos da viagem no controle',
    'Conferir fatura do cartão (moeda estrangeira)',
  ],
}

const DAY_MS = 86400000

/** Data de hoje em YYYY-MM-DD (fuso local). */
export function todayKey(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Extrai YYYY-MM-DD de um campo date do PocketBase (ou null). */
export function dateKey(value?: string | null): string | null {
  if (!value) return null
  const k = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : null
}

/** Soma dias a uma data YYYY-MM-DD. */
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** "DD/MM" a partir de YYYY-MM-DD. */
export function shortDM(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`
}

/** Dias entre hoje e o início da viagem (null sem data de ida). */
export function daysUntilStart(
  trip: Pick<TripRecord, 'start_date'>,
  today = todayKey(),
): number | null {
  const start = dateKey(trip.start_date)
  if (!start) return null
  const [ty, tm, td] = today.split('-').map(Number)
  const [sy, sm, sd] = start.split('-').map(Number)
  return Math.round((Date.UTC(sy, sm - 1, sd) - Date.UTC(ty, tm - 1, td)) / DAY_MS)
}

export interface PhaseState {
  /** A fase já está visível (a data chegou). */
  open: boolean
  /** Data em que a fase abre (null = sem data ou sempre visível). */
  date: string | null
}

/** Estado de visibilidade de uma fase conforme as datas da viagem. */
export function phaseState(
  phase: TripChecklistPhase,
  trip: Pick<TripRecord, 'start_date' | 'end_date'>,
  today = todayKey(),
): PhaseState {
  const start = dateKey(trip.start_date)
  const end = dateKey(trip.end_date)
  let date: string | null = null
  switch (phase) {
    case 'antes_de_emitir':
    case 'apos_emitir':
    case 'documentos_seguros':
      return { open: true, date: null }
    case 'semana_antes':
      date = start ? addDaysKey(start, -7) : null
      break
    case 'dois_dias':
      date = start ? addDaysKey(start, -2) : null
      break
    case 'dia_voo':
      date = start
      break
    case 'volta':
      date = end
      break
  }
  return { open: date !== null && today >= date, date }
}

/** Resumo da checklist de uma viagem para o Início. */
export function summarizeChecklist(
  items: TripChecklistItemRecord[],
  trip: Pick<TripRecord, 'start_date'>,
): { total: number; done: number; pendingWeek: string[] } {
  const days = daysUntilStart(trip)
  const pendingWeek =
    days !== null && days >= 0 && days <= 7
      ? items.filter((i) => i.phase === 'semana_antes' && !i.done).map((i) => i.title)
      : []
  return {
    total: items.length,
    done: items.filter((i) => i.done).length,
    pendingWeek,
  }
}

/** Cria os itens padrão da checklist para uma viagem (ordem por sort_order). */
export async function generateTripChecklist(tripId: string): Promise<void> {
  let order = 0
  const jobs: Promise<unknown>[] = []
  for (const phase of CHECKLIST_PHASES) {
    for (const title of DEFAULT_CHECKLIST[phase.key]) {
      jobs.push(
        pb.collection('trip_checklist_items').create({
          trip: tripId,
          phase: phase.key,
          title,
          done: false,
          sort_order: order++,
        }),
      )
    }
  }
  await Promise.all(jobs)
}
