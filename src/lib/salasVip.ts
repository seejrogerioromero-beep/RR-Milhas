import pb from '@/lib/pocketbase/client'
import type {
  CardProfileRecord,
  LoungeRecord,
  AirportRecord,
  CreditCardRecord,
  LoungeAccessRecord,
} from '@/types/database'

/**
 * Base de salas VIP/restaurantes (collections card_profiles, airports, lounges,
 * lounge_access). Carregada uma vez por tela e recarregada via realtime.
 */

export const SALAS_VIP_STALE_MONTHS = 6

/** Meses desde a última revisão (revisado_em) — null quando sem data. */
export function monthsSinceReview(revisadoEm?: string): number | null {
  if (!revisadoEm) return null
  const d = new Date(revisadoEm)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

/** true quando revisado_em tem mais de 6 meses (ou está vazio). */
export function reviewIsStale(revisadoEm?: string): boolean {
  const m = monthsSinceReview(revisadoEm)
  return m === null || m > SALAS_VIP_STALE_MONTHS
}

/** Carrega todos os perfis de cartão da base (ordenado por codigo). */
export async function fetchCardProfiles(): Promise<CardProfileRecord[]> {
  const res = await pb.collection('card_profiles').getFullList({ sort: 'codigo' })
  return res as unknown as CardProfileRecord[]
}

/** Carrega todos os aeroportos (ordenado por codigo). */
export async function fetchAirports(): Promise<AirportRecord[]> {
  const res = await pb.collection('airports').getFullList({ sort: 'codigo' })
  return res as unknown as AirportRecord[]
}

/** Carrega todas as salas/restaurantes, expandido com o aeroporto. */
export async function fetchLounges(): Promise<LoungeRecord[]> {
  const res = await pb.collection('lounges').getFullList({
    sort: 'terminal,nome',
    expand: 'aeroporto',
  })
  return res as unknown as LoungeRecord[]
}

/** Carrega os vínculos sala↔cartão (lounge_access). */
export async function fetchLoungeAccess(): Promise<LoungeAccessRecord[]> {
  const res = await pb.collection('lounge_access').getFullList()
  return res as unknown as LoungeAccessRecord[]
}

/** Carrega os cartões cadastrados (credit_cards), expandido com o perfil. */
export async function fetchCreditCards(): Promise<CreditCardRecord[]> {
  const res = await pb.collection('credit_cards').getFullList({ sort: 'name' })
  return res as unknown as CreditCardRecord[]
}

/**
 * Perfis que dão acesso ao lounge: os vínculos explícitos em lounge_access
 * OU todo perfil cuja rede está na lista `redes` do registro (LK = UNL-MC,
 * AAB, UNQ-MC; DP = UNL-VI, SMI-VI, UNQ-VI).
 */
export function loungeProfileIds(
  lounge: LoungeRecord,
  profiles: CardProfileRecord[],
  access: LoungeAccessRecord[] = [],
): string[] {
  const ids: string[] = []
  for (const a of access) {
    if (a.sala === lounge.id && !ids.includes(a.cartao)) ids.push(a.cartao)
  }
  for (const rede of lounge.redes || []) {
    for (const p of profiles) {
      if (p.rede === rede && !ids.includes(p.id)) ids.push(p.id)
    }
  }
  return ids
}

/** true quando o lounge é utilizável por pelo menos um dos perfis informados. */
export function loungeMatchesProfiles(
  lounge: LoungeRecord,
  profiles: CardProfileRecord[],
  profileIds: string[],
  access: LoungeAccessRecord[] = [],
): boolean {
  if (profileIds.length === 0) return false
  return loungeProfileIds(lounge, profiles, access).some((id) => profileIds.includes(id))
}

/** Nome curto da área de embarque. */
export const AREA_LABEL: Record<string, string> = {
  dom: 'Doméstico',
  int: 'Internacional',
  publica: 'Pública',
}

/** Rótulo e cor de cada status de sala. */
export const STATUS_META: Record<string, { label: string; className: string }> = {
  confirmado: {
    label: 'Confirmado',
    className: 'bg-[#16418F]/10 text-[#16418F] border-[#16418F]/30',
  },
  a_confirmar: {
    label: 'A confirmar',
    className: 'bg-[#C9A24B]/10 text-[#8A6D1F] border-[#C9A24B]/40',
  },
  fechado_temporariamente: {
    label: 'Fechado temporariamente',
    className: 'bg-[#C4452F]/10 text-[#C4452F] border-[#C4452F]/30',
  },
  previsto: {
    label: 'Previsto',
    className: 'bg-[#6E6A5E]/10 text-[#6E6A5E] border-[#6E6A5E]/30',
  },
  nao_incluso: {
    label: 'Não incluso',
    className: 'bg-[#6E6A5E]/10 text-[#6E6A5E] border-[#6E6A5E]/30',
  },
}

export const TIPO_LABEL: Record<string, string> = {
  sala: 'Sala',
  sala_exclusiva: 'Sala exclusiva',
  restaurante: 'Restaurante',
  descanso: 'Descanso',
  spa: 'Spa',
  coworking: 'Coworking',
}

export const REDE_LABEL: Record<string, string> = {
  loungekey: 'LoungeKey',
  dragonpass: 'DragonPass',
  nenhuma: 'Nenhuma',
}

/** Marca "conferido hoje": atualiza revisado_em para a data de hoje. */
export async function markReviewedToday(collection: 'lounges' | 'card_profiles', id: string) {
  const today = new Date().toISOString().slice(0, 10)
  await pb.collection(collection).update(id, { revisado_em: today })
}
