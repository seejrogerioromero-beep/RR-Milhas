import pb from '@/lib/pocketbase/client'
import type {
  InsuranceBandeira,
  InsuranceCoverageRecord,
  TravelRightCategoria,
  TravelRightPais,
  TravelRightRecord,
} from '@/types/database'

/**
 * Direitos do passageiro e seguros de viagem (collections travel_rights e
 * insurance_coverage). Mesmo padrão de src/lib/salasVip.ts.
 */

export const TRAVEL_RIGHTS_STALE_MONTHS = 6

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
  return m === null || m > TRAVEL_RIGHTS_STALE_MONTHS
}

/** Carrega todos os direitos do passageiro, ordenado por país/categoria/gatilho. */
export async function fetchTravelRights(): Promise<TravelRightRecord[]> {
  const res = await pb.collection('travel_rights').getFullList({
    sort: 'pais,categoria,gatilho',
  })
  return res as unknown as TravelRightRecord[]
}

/** Carrega todas as coberturas de seguro, ordenado por bandeira/cobertura. */
export async function fetchInsuranceCoverage(): Promise<InsuranceCoverageRecord[]> {
  const res = await pb.collection('insurance_coverage').getFullList({
    sort: 'bandeira,cobertura',
  })
  return res as unknown as InsuranceCoverageRecord[]
}

/** Direitos de um par país + categoria (ex.: BR + atraso). */
export function rightsFor(
  rights: TravelRightRecord[],
  pais: TravelRightPais,
  categoria: TravelRightCategoria,
): TravelRightRecord[] {
  return rights.filter((r) => r.pais === pais && r.categoria === categoria)
}

/** Rótulo legível de cada categoria. */
export const CATEGORIA_LABEL: Record<TravelRightCategoria, string> = {
  atraso: 'Atraso',
  cancelamento: 'Cancelamento',
  pretericao: 'Preterição (overbooking)',
  bagagem: 'Bagagem',
  medico: 'Emergência médica',
}

/** Rótulo legível de cada país. */
export const PAIS_LABEL: Record<TravelRightPais, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
}

/** Norma de referência de cada país (mostrada no resultado). */
export const PAIS_NORMA: Record<TravelRightPais, string> = {
  BR: 'ANAC Resolução 400',
  US: 'US DOT',
}

/**
 * Filtra as coberturas relevantes para a situação escolhida:
 * - medico: despesas médicas, odontológicas, traslados, internação, regresso;
 * - bagagem: atraso/perda de bagagem;
 * - atraso/cancelamento: atraso de embarque, cancelamento de viagem e
 *   a linha de pré-requisito (Bilhete de Seguro).
 */
export function relevantInsurance(
  insurance: InsuranceCoverageRecord[],
  categoria: TravelRightCategoria,
): InsuranceCoverageRecord[] {
  const terms: Record<TravelRightCategoria, string[]> = {
    medico: [
      'despesas médicas',
      'odont',
      'traslado',
      'regresso',
      'internação',
      'paciente internado',
      'acompanhante',
      'retorno',
      'prorrogação',
      'bilhete de seguro',
    ],
    bagagem: ['bagagem', 'bilhete de seguro'],
    atraso: ['atraso', 'bilhete de seguro'],
    cancelamento: ['cancelamento', 'atraso de embarque', 'bilhete de seguro'],
    pretericao: [],
  }
  const wanted = terms[categoria]
  return insurance.filter((i) => wanted.some((t) => i.cobertura?.toLowerCase().includes(t)))
}

/** Bandeira com nome e cor para exibição. */
export const BANDEIRA_META: Record<InsuranceBandeira, { label: string; className: string }> = {
  visa_infinite: {
    label: 'Visa Infinite',
    className: 'bg-[#16418F]/10 text-[#16418F] border-[#16418F]/30',
  },
  mastercard_black: {
    label: 'Mastercard Black',
    className: 'bg-[#C9A24B]/10 text-[#8A6D1F] border-[#C9A24B]/40',
  },
}

/**
 * Normaliza um texto de telefone para o href de link tel: — remove letras
 * (notas como "a cobrar, em português") e sinais não discáveis, mantendo
 * dígitos e o "+" inicial.
 */
export function telHref(raw?: string): string | null {
  if (!raw) return null
  // pega a primeira sequência com dígitos/+, descartando texto depois
  const m = raw.match(/\+?\d[\d\s().-]*\d/)
  if (!m) return null
  const digits = m[0].replace(/[^\d+]/g, '')
  return digits.length >= 8 ? `tel:${digits}` : null
}
