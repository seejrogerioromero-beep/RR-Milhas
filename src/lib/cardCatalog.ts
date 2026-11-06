/**
 * Catálogo estático de cartões do ranking "CARTÕES" da página Salas VIP.
 * Fonte: Melhores Cartões (guias "Cartões Santander", "salas VIP" e "pontos e milhas")
 * e páginas oficiais do Santander. Dados de referência — confirme as regras no banco.
 */

export type LoungeProgram =
  | 'LoungeKey'
  | 'Dragon Pass'
  | 'Priority Pass'
  | 'Outras salas'
  | 'Sem salas'

export interface VipCardCatalog {
  id: string
  position: number
  name: string
  bank: string
  brand: 'Mastercard' | 'Visa'
  segment: 'Alta renda' | 'Intermediário' | 'Entrada'
  loungeProgram: LoungeProgram
  annualFee: string
  /** Destaques resumidos exibidos no card do ranking */
  highlights: string[]
  salasVip: string[]
  alimentacao: string[]
  fastTrack: string[]
  pontuacao: string[]
  outros: string[]
  tags: string[]
}

export const VIP_CARDS: VipCardCatalog[] = [
  {
    id: 'unlimited-mc-black',
    position: 26,
    name: 'Santander Unlimited Mastercard Black',
    bank: 'Santander',
    brand: 'Mastercard',
    segment: 'Intermediário',
    loungeProgram: 'LoungeKey',
    annualFee: 'R$ 2.200',
    highlights: [
      'Anuidade grátis com gasto acima de R$ 30 mil/mês ou R$ 5 mi em investimentos',
      'Até 50% de bônus no Santander Rewards',
      '7 adicionais',
    ],
    salasVip: [
      'LoungeKey ilimitado com 8 convidados/ano (mediante média de R$ 10 mil/mês)',
      'Sala Mastercard Black no GRU (ilimitada)',
    ],
    alimentacao: [
      'Mastercard Surpreenda: compre 1 e leve 2 em restaurantes e parceiros',
      'Ofertas e experiências gastronômicas pelo app Mastercard Surpreenda',
    ],
    fastTrack: ['Sem fast track documentado — confira salas com entrada expressa no app LoungeKey'],
    pontuacao: [
      '3 a 6 pontos por dólar (bônus do Santander Rewards)',
      '3,6 pts/dólar em compras no exterior (perfil Select) e 4 pts (Private)',
      'Pontos nunca expiram',
      'Transferência Esfera para Azul, LATAM Pass, Smiles e parceiros internacionais (Iberia, TAP, Flying Blue…)',
    ],
    outros: [
      'Anuidade grátis com gastos acima de R$ 30 mil/mês ou R$ 5 milhões investidos',
      'Até 50% de bônus na pontuação com o Santander Rewards (níveis de 15% a 50%)',
      '7 cartões adicionais grátis',
      'Seguro de viagem, garantia estendida e concierge 24h Mastercard Black',
    ],
    tags: ['LoungeKey', 'Salas próprias', 'Mastercard', 'Santander', 'Intermediário'],
  },
  {
    id: 'unlimited-visa-infinite',
    position: 27,
    name: 'Santander Unlimited Visa Infinite',
    bank: 'Santander',
    brand: 'Visa',
    segment: 'Alta renda',
    loungeProgram: 'Dragon Pass',
    annualFee: 'R$ 2.200',
    highlights: [
      'Mesmas regras de anuidade e pontos do Mastercard Black',
      'Até 50% de bônus no Santander Rewards',
      '7 adicionais',
    ],
    salasVip: [
      'Dragon Pass (Visa Airport Companion) ilimitado com 8 convidados/ano (mediante média de R$ 10 mil/mês)',
    ],
    alimentacao: [
      'Visa Descontos: ofertas em restaurantes parceiros selecionados',
      'Experiências e menu exclusivo via programa Visa Infinite',
    ],
    fastTrack: ['Sem fast track documentado'],
    pontuacao: [
      '3 a 6 pontos por dólar (bônus do Santander Rewards)',
      '3,6 pts/dólar em compras no exterior (Select) e 4 pts (Private)',
      'Pontos nunca expiram',
      'Transferência Esfera para Azul, LATAM Pass, Smiles e parceiros internacionais',
    ],
    outros: [
      'Anuidade grátis com gastos acima de R$ 30 mil/mês ou R$ 5 milhões investidos',
      'Até 50% de bônus na pontuação com o Santander Rewards',
      '7 cartões adicionais grátis',
      'Seguro de viagem e concierge Visa Infinite',
    ],
    tags: ['Dragon Pass', 'Visa', 'Santander', 'Alta renda'],
  },
  {
    id: 'aadvantage-mc-black',
    position: 55,
    name: 'Santander AAdvantage Mastercard Black',
    bank: 'Santander',
    brand: 'Mastercard',
    segment: 'Alta renda',
    loungeProgram: 'LoungeKey',
    annualFee: 'R$ 1.632',
    highlights: [
      'Até 5 milhas AAdvantage por dólar',
      '50% de desconto na anuidade com R$ 150 mil investidos',
      '4 acessos anuais ao LoungeKey',
    ],
    salasVip: [
      '4 acessos anuais às salas VIP pelo LoungeKey (mediante gastos mensais de R$ 5 mil)',
      'Sala Mastercard Black no GRU',
    ],
    alimentacao: ['Mastercard Surpreenda: compre 1 e leve 2 em restaurantes e parceiros'],
    fastTrack: ['Sem fast track documentado'],
    pontuacao: [
      '2 a 5 milhas AAdvantage por dólar',
      'Dobro de milhas em compras na American Airlines',
      '+1 milha por dólar em compras internacionais',
      'Milhas vão direto ao programa AAdvantage e não expiram com o cartão ativo',
    ],
    outros: [
      'Anuidade R$ 1.632 com 50% de desconto para correntista com R$ 150 mil investidos',
      'Emissão restrita a correntistas com R$ 1 milhão investidos no Santander',
      'Desconto em resgates de voos da American Airlines',
      'Seguro de viagem, garantia estendida e concierge Mastercard Black',
    ],
    tags: ['LoungeKey', 'Salas próprias', 'Mastercard', 'Santander', 'Alta renda'],
  },
  {
    id: 'gol-smiles-visa-infinite',
    position: 56,
    name: 'Santander GOL Smiles Visa Infinite',
    bank: 'Santander',
    brand: 'Visa',
    segment: 'Alta renda',
    loungeProgram: 'Outras salas',
    annualFee: 'R$ 1.496',
    highlights: [
      '3 a 5,5 milhas Smiles por dólar',
      'GOL Premium Lounge ilimitado em GRU e GIG',
      '2 bagagens despachadas grátis na GOL',
    ],
    salasVip: [
      '1 acesso anual à sala VIP pelo DragonPass (mediante gastos)',
      'GOL Premium Lounge ilimitado nos aeroportos de Guarulhos (GRU) e Galeão (GIG)',
    ],
    alimentacao: ['Sem programa de alimentação documentado'],
    fastTrack: ['Check-in e embarque preferencial em voos GOL'],
    pontuacao: [
      '3 a 5,5 milhas Smiles por dólar (turbinada para Clube Smiles ou cliente Diamante)',
      'Milhas vão direto para a Smiles e nunca expiram',
    ],
    outros: [
      'Anuidade R$ 1.496 sem regra de desconto ou isenção',
      '1ª e 2ª bagagens despachadas grátis em voos GOL',
      'Seguro de viagem e concierge Visa Infinite',
    ],
    tags: ['Dragon Pass', 'Salas GOL', 'Visa', 'Santander', 'Alta renda'],
  },
  {
    id: 'unique-mc-black',
    position: 58,
    name: 'Santander Unique Mastercard Black',
    bank: 'Santander',
    brand: 'Mastercard',
    segment: 'Intermediário',
    loungeProgram: 'LoungeKey',
    annualFee: 'R$ 1.155',
    highlights: [
      '2,2 a 4,5 pontos por dólar',
      '2 acessos anuais ao LoungeKey',
      'Anuidade grátis cumprindo 2 de 3 critérios',
    ],
    salasVip: [
      '2 acessos anuais às salas VIP pelo LoungeKey (mediante média de R$ 5 mil/mês)',
      'Sala Mastercard Black no GRU',
    ],
    alimentacao: ['Mastercard Surpreenda: compre 1 e leve 2 em restaurantes e parceiros'],
    fastTrack: ['Sem fast track documentado'],
    pontuacao: [
      '2,2 a 4,5 pontos por dólar (com Santander Rewards)',
      '3 pontos por dólar em compras internacionais',
      'Pontos expiram em 3 anos',
      'Transferência Esfera para Azul, LATAM Pass, Smiles e parceiros internacionais',
    ],
    outros: [
      'Anuidade grátis cumprindo 2 de 3 critérios: pacote de serviços, gasto de R$ 8 mil/fatura ou R$ 50 mil investidos (1 critério = 50%)',
      'Versão alternativa com 1,2% de cashback (limite de R$ 500/fatura)',
      '5 cartões adicionais grátis',
      'Seguro de viagem e concierge Mastercard Black',
    ],
    tags: ['LoungeKey', 'Salas próprias', 'Mastercard', 'Santander', 'Intermediário'],
  },
  {
    id: 'unique-visa-infinite',
    position: 59,
    name: 'Santander Unique Visa Infinite',
    bank: 'Santander',
    brand: 'Visa',
    segment: 'Intermediário',
    loungeProgram: 'Dragon Pass',
    annualFee: 'R$ 1.155',
    highlights: [
      '2,2 a 4,5 pontos por dólar',
      '2 acessos anuais ao DragonPass',
      'Anuidade grátis cumprindo 2 de 3 critérios',
    ],
    salasVip: [
      '2 acessos anuais às salas Visa Airport Companion / DragonPass (mediante média de R$ 5 mil/mês)',
    ],
    alimentacao: ['Visa Descontos: ofertas em restaurantes parceiros selecionados'],
    fastTrack: ['Sem fast track documentado'],
    pontuacao: [
      '2,2 a 4,5 pontos por dólar (com Santander Rewards)',
      '3 pontos por dólar em compras internacionais',
      'Pontos expiram em 3 anos',
      'Transferência Esfera para Azul, LATAM Pass, Smiles e parceiros internacionais',
    ],
    outros: [
      'Anuidade grátis cumprindo 2 de 3 critérios: pacote de serviços, gasto de R$ 8 mil/fatura ou R$ 50 mil investidos',
      'Versão alternativa com 1,2% de cashback (limite de R$ 500/fatura)',
      '5 cartões adicionais grátis',
      'Seguro de viagem e concierge Visa Infinite',
    ],
    tags: ['Dragon Pass', 'Visa', 'Santander', 'Intermediário'],
  },
  {
    id: 'aadvantage-mc-platinum',
    position: 63,
    name: 'Santander AAdvantage Mastercard Platinum',
    bank: 'Santander',
    brand: 'Mastercard',
    segment: 'Intermediário',
    loungeProgram: 'Sem salas',
    annualFee: 'R$ 660',
    highlights: [
      '1,5 a 4 milhas AAdvantage por dólar',
      'Anuidade grátis nos 3 primeiros meses',
      'Sem acesso a salas VIP',
    ],
    salasVip: ['Sem acesso a salas VIP'],
    alimentacao: ['Sem programa de alimentação documentado'],
    fastTrack: ['Sem fast track documentado'],
    pontuacao: [
      '1,5 a 4 milhas AAdvantage por dólar',
      'Dobro de milhas em compras na American Airlines',
      '+1 milha por dólar em compras internacionais',
      'Milhas não expiram com o cartão ativo',
    ],
    outros: [
      'Anuidade R$ 660 com 50% de desconto para correntistas',
      '3 primeiros meses de anuidade grátis nas novas contratações',
      'Desconto em resgates de voos da American Airlines',
    ],
    tags: ['Sem salas', 'Mastercard', 'Santander', 'Intermediário'],
  },
]

export const LOUNGE_FILTERS: { value: LoungeProgram | 'Todas'; label: string }[] = [
  { value: 'Todas', label: 'Todas' },
  { value: 'LoungeKey', label: 'LoungeKey' },
  { value: 'Dragon Pass', label: 'Dragon Pass' },
  { value: 'Priority Pass', label: 'Priority Pass' },
  { value: 'Outras salas', label: 'Outras salas' },
  { value: 'Sem salas', label: 'Sem salas' },
]

export const BRAND_FILTERS = ['Todas', 'Mastercard', 'Visa'] as const
export const BANK_FILTERS = ['Todos', 'Santander'] as const
export const SEGMENT_FILTERS = ['Todos', 'Alta renda', 'Intermediário', 'Entrada'] as const
