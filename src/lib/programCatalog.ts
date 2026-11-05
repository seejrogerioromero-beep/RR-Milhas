export interface PredefinedProgram {
  id: string
  name: string
  category: 'aerea' | 'banco' | 'hotel'
  categoryLabel: string
}

/**
 * Catálogo-base de programas de fidelidade para seleção no RRMILHAS.
 *
 * REGRA ESTRITA: NUNCA incluir os 8 programas expressamente proibidos pelo usuário:
 * - Caixa
 * - C6 Átomos
 * - Capital One
 * - Centurion Card
 * - Nubank
 * - Sicredi
 * - Porto
 * - Aeroplan
 */
export const FORBIDDEN_PROGRAM_NAMES = [
  'caixa',
  'c6',
  'c6 átomos',
  'c6 atomos',
  'capital one',
  'centurion',
  'centurion card',
  'nubank',
  'sicredi',
  'porto',
  'porto seguro',
  'aeroplan',
] as const

export const PREDEFINED_PROGRAMS: PredefinedProgram[] = [
  // Aéreas
  { id: 'smiles', name: 'Smiles', category: 'aerea', categoryLabel: 'Companhias Aéreas' },
  { id: 'latam_pass', name: 'LATAM Pass', category: 'aerea', categoryLabel: 'Companhias Aéreas' },
  { id: 'tudoazul', name: 'TudoAzul', category: 'aerea', categoryLabel: 'Companhias Aéreas' },
  {
    id: 'tap_miles_go',
    name: 'TAP Miles&Go',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'flying_blue',
    name: 'Flying Blue (Air France/KLM)',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  { id: 'iberia_plus', name: 'Iberia Plus', category: 'aerea', categoryLabel: 'Companhias Aéreas' },
  {
    id: 'ba_avios',
    name: 'British Airways Executive Club (Avios)',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'miles_and_more',
    name: 'Lufthansa Miles & More',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'mileage_plus',
    name: 'United MileagePlus',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'aadvantage',
    name: 'American Airlines AAdvantage',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'delta_skymiles',
    name: 'Delta SkyMiles',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'emirates_skywards',
    name: 'Emirates Skywards',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'qatar_privilege',
    name: 'Qatar Airways Privilege Club',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'avianca_lifemiles',
    name: 'Avianca LifeMiles',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'copa_connectmiles',
    name: 'Copa ConnectMiles',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },
  {
    id: 'aeromexico_premier',
    name: 'Aeromexico Club Premier',
    category: 'aerea',
    categoryLabel: 'Companhias Aéreas',
  },

  // Bancos / Financeiras
  { id: 'livelo', name: 'Livelo', category: 'banco', categoryLabel: 'Bancos e Financeiras' },
  {
    id: 'esfera',
    name: 'Esfera (Santander)',
    category: 'banco',
    categoryLabel: 'Bancos e Financeiras',
  },
  { id: 'iupp', name: 'Iupp (Itaú)', category: 'banco', categoryLabel: 'Bancos e Financeiras' },
  { id: 'dotz', name: 'Dotz', category: 'banco', categoryLabel: 'Bancos e Financeiras' },
  {
    id: 'mastercard_surpreenda',
    name: 'Mastercard Surpreenda',
    category: 'banco',
    categoryLabel: 'Bancos e Financeiras',
  },
  {
    id: 'banco_do_brasil',
    name: 'Banco do Brasil',
    category: 'banco',
    categoryLabel: 'Bancos e Financeiras',
  },
  {
    id: 'bradesco_cartoes',
    name: 'Bradesco Cartões',
    category: 'banco',
    categoryLabel: 'Bancos e Financeiras',
  },
  {
    id: 'itau_cartoes',
    name: 'Itaú Cartões',
    category: 'banco',
    categoryLabel: 'Bancos e Financeiras',
  },
  {
    id: 'xp_investimentos',
    name: 'XP Investimentos',
    category: 'banco',
    categoryLabel: 'Bancos e Financeiras',
  },
  { id: 'btg_plus', name: 'BTG+', category: 'banco', categoryLabel: 'Bancos e Financeiras' },

  // Hotéis
  {
    id: 'accor_all',
    name: 'Accor Live Limitless (ALL)',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
  {
    id: 'marriott_bonvoy',
    name: 'Marriott Bonvoy',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
  {
    id: 'hilton_honors',
    name: 'Hilton Honors',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
  {
    id: 'ihg_one_rewards',
    name: 'IHG One Rewards',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
  {
    id: 'world_of_hyatt',
    name: 'World of Hyatt',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
  {
    id: 'wyndham_rewards',
    name: 'Wyndham Rewards',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
  {
    id: 'melia_rewards',
    name: 'Meliá Rewards',
    category: 'hotel',
    categoryLabel: 'Redes de Hotéis',
  },
]

/** Verifica se um nome digitado livremente infringe a lista de programas proibidos */
export function isForbiddenProgramName(name: string): boolean {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return FORBIDDEN_PROGRAM_NAMES.some((forbidden) => {
    const normForbidden = forbidden
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    // Compara palavra inteira ou início
    if (normalized === normForbidden) return true
    // Evita falsos positivos como "aeroporto" bloqueado por "porto", usando regex de palavra
    const regex = new RegExp(`(^|\\s)${normForbidden}(\\s|$)`, 'i')
    return regex.test(normalized)
  })
}
