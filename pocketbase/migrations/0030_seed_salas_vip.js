// 0030 — Seed da base de salas VIP Santander (seções 1 a 6 do doc), pesquisa 14/11/2026.
// Idempotente: não duplica registros já existentes.
const REVISAO = '2026-11-14 12:00:00.000Z'

function ensureCard(app, p) {
  const col = app.findCollectionByNameOrId('card_profiles')
  let rec
  try {
    rec = app.findFirstRecordByFilter('card_profiles', `codigo = "${p.codigo}"`)
    // atualiza campos do seed em registros já existentes
    rec.set('nome', p.nome)
    rec.set('bandeira', p.bandeira)
    rec.set('rede', p.rede)
    if (p.acessos_ano != null) rec.set('acessos_ano', p.acessos_ano)
    rec.set('convidados_ano', p.convidados_ano)
    rec.set('gasto_trimestral_minimo', p.gasto_trimestral_minimo)
    rec.set('anuidade', p.anuidade)
    rec.set('regras', p.regras)
    rec.set('outros_beneficios', p.outros_beneficios)
    app.save(rec)
    return rec.id
  } catch (_) {
    rec = new Record(col)
    rec.set('codigo', p.codigo)
    rec.set('nome', p.nome)
    rec.set('bandeira', p.bandeira)
    rec.set('rede', p.rede)
    if (p.acessos_ano != null) rec.set('acessos_ano', p.acessos_ano)
    rec.set('convidados_ano', p.convidados_ano)
    rec.set('gasto_trimestral_minimo', p.gasto_trimestral_minimo)
    rec.set('anuidade', p.anuidade)
    rec.set('regras', p.regras)
    rec.set('outros_beneficios', p.outros_beneficios)
    app.save(rec)
    return rec.id
  }
}

function ensureAirport(app, codigo, cidade, pais) {
  try {
    return app.findFirstRecordByFilter('airports', `codigo = "${codigo}"`).id
  } catch (_) {
    const rec = new Record(app.findCollectionByNameOrId('airports'))
    rec.set('codigo', codigo)
    rec.set('cidade', cidade)
    rec.set('pais', pais)
    app.save(rec)
    return rec.id
  }
}

function ensureLounge(app, entry) {
  // dedupe: mesmo aeroporto + nome + tipo
  const airportId = entry.airportId
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const filtro = `aeroporto = "${airportId}" && nome = "${esc(entry.nome)}" && tipo = "${entry.tipo}"`
  let rec
  try {
    rec = app.findFirstRecordByFilter('lounges', filtro)
    rec.set('terminal', entry.terminal || '')
    rec.set('area', entry.area || '')
    rec.set('redes', entry.redes)
    rec.set('status', entry.status)
    rec.set('observacoes', entry.observacoes || '')
    rec.set('revisado_em', REVISAO)
    app.save(rec)
    return rec.id
  } catch (_) {
    rec = new Record(app.findCollectionByNameOrId('lounges'))
    rec.set('aeroporto', airportId)
    rec.set('terminal', entry.terminal || '')
    rec.set('area', entry.area || '')
    rec.set('nome', entry.nome)
    rec.set('tipo', entry.tipo)
    rec.set('redes', entry.redes)
    rec.set('status', entry.status)
    rec.set('observacoes', entry.observacoes || '')
    rec.set('revisado_em', REVISAO)
    app.save(rec)
    return rec.id
  }
}

const LK = ['loungekey']
const DP = ['dragonpass']
const LKDP = ['loungekey', 'dragonpass']

const CARDS = [
  {
    codigo: 'UNL-MC',
    nome: 'Santander Unlimited Mastercard Black',
    bandeira: 'Mastercard',
    rede: 'loungekey',
    acessos_ano: null,
    convidados_ano: '8 por ano; após o 8º, tarifa da sala',
    gasto_trimestral_minimo: 'R$ 30 mil na soma das 3 últimas faturas fechadas',
    anuidade: 'R$ 2.200 (isenção com R$ 30 mil/mês de gasto ou R$ 5 milhões investidos)',
    regras:
      'Acesso ilimitado via LoungeKey (app Mastercard Airport Experiences). Na entrada: cartão físico + cartão de embarque. Private Banking é isento do gasto mínimo. Cartão ativo e fatura em dia; atraso ou rotativo derruba o acesso no trimestre.',
    outros_beneficios:
      'Pontos: Esfera 3 a 4,5 pts/US$ nacional, 3,6 a 5,4 internacional (Santander Rewards); não expiram. Viagem/aeroporto: Airport Concierge (Meet and Greet; em alguns aeroportos, fila rápida na segurança e imigração). Seguros: Masterassist Black (médico em viagem), Proteção de Bagagem, MasterSeguro de Automóveis (locação), Cartão Protegido grátis, proteção contra roubo em caixa eletrônico. Restaurantes/lazer: isenção de rolha em mais de 200 restaurantes; Surpreenda Restaurantes; Mastercard Surpreenda. Outros: Priceless Cities; Mastercard Travel Rewards (cashback); até 7 adicionais sem custo.',
  },
  {
    codigo: 'UNL-VI',
    nome: 'Santander Unlimited Visa Infinite',
    bandeira: 'Visa',
    rede: 'dragonpass',
    acessos_ano: null,
    convidados_ano: '8 por ano no DragonPass; até 3 no Visa Infinite Lounge (3h cada)',
    gasto_trimestral_minimo: 'R$ 30 mil na soma das 3 últimas faturas fechadas',
    anuidade: 'R$ 2.200 (mesma regra de isenção do UNL-MC)',
    regras:
      'Acesso ilimitado via DragonPass (app Visa Airport Companion). Gere o QR Code só na porta da sala (emitir pode registrar a visita). Na entrada: QR Code + cartão de embarque + documento. Private Banking é isento do gasto mínimo.',
    outros_beneficios:
      'Pontos: Esfera 3 a 4,5 pts/US$ nacional, 3,6 a 5,4 internacional (Santander Rewards); não expiram. Viagem/aeroporto: Fast Pass Visa (fila exclusiva no raio-X de GRU T2 e T3 e do Galeão, 3h às 23h, titular + até 5 acompanhantes). Seguros: Visa Infinite (médico em viagem, locação de carro, proteção de compra, garantia estendida); Cartão Protegido grátis. Outros: Visa Concierge 24h; Visa Luxury Hotel Collection; Visa Médico Online; até 7 adicionais sem custo.',
  },
  {
    codigo: 'AAB',
    nome: 'Santander AAdvantage Mastercard Black',
    bandeira: 'Mastercard',
    rede: 'loungekey',
    acessos_ano: 4,
    convidados_ano: 'Consomem a franquia',
    gasto_trimestral_minimo: 'R$ 15 mil na soma das 3 últimas faturas fechadas',
    anuidade: 'R$ 1.632 (12x R$ 136); 50% de desconto com R$ 150 mil investidos',
    regras:
      '4 acessos gratuitos por ano via LoungeKey, não cumulativos; convidados consomem a franquia; a partir do 5º acesso, tarifa da sala. Admirals Club NÃO está incluído. Private Banking é isento do gasto mínimo.',
    outros_beneficios:
      'Pontos: AAdvantage 2 milhas/US$ + 1 extra em moeda estrangeira; dobro em compras na American Airlines; Loyalty Points para status; milhas não expiram com cartão ativo. Viagem/aeroporto: Airport Concierge. Seguros: Masterassist Black, MasterSeguro de Automóveis, Proteção de Bagagem e Inconveniência de Viagem, Compra Protegida, Garantia Estendida. Restaurantes/lazer: isenção de rolha; Surpreenda. Outros: Priceless Cities; Travel Rewards; até 5 adicionais sem anuidade.',
  },
  {
    codigo: 'SMI-VI',
    nome: 'Santander GOL Smiles Visa Infinite',
    bandeira: 'Visa',
    rede: 'dragonpass',
    acessos_ano: 1,
    convidados_ano: 'Consomem a franquia no DragonPass',
    gasto_trimestral_minimo: 'R$ 15 mil na soma das 3 últimas faturas fechadas',
    anuidade: 'R$ 1.495,92',
    regras:
      '1 acesso por ano via DragonPass. GOL Premium Lounge: ilimitado em voo GOL ou parceira Smiles, com 1 acompanhante. A partir do 2º acesso, tarifa da sala. Fast Pass Visa (GRU e Galeão). Private Banking é isento do gasto mínimo.',
    outros_beneficios:
      'Pontos: Smiles 3 milhas/US$; 5,5 para Clube Smiles ou Diamante; não expiram. Viagem/aeroporto: 2 bagagens grátis, check-in e embarque preferenciais na GOL; Fast Pass Visa (GRU e Galeão). Seguros: Visa Infinite (médico, locação, compra, garantia). Outros: Concierge 24h; adicionais grátis só no 1º ano.',
  },
  {
    codigo: 'UNQ-MC',
    nome: 'Santander Unique Mastercard Black',
    bandeira: 'Mastercard',
    rede: 'loungekey',
    acessos_ano: 2,
    convidados_ano: 'Consomem a franquia',
    gasto_trimestral_minimo: 'R$ 15 mil na soma das 3 últimas faturas fechadas',
    anuidade:
      'R$ 1.155 (desconto de 50% ou isenção conforme correntista, R$ 8 mil/fatura ou R$ 50 mil investidos)',
    regras:
      '2 acessos gratuitos por ano via LoungeKey; convidados consomem a franquia; a partir do 3º acesso, tarifa da sala. Private Banking é isento do gasto mínimo.',
    outros_beneficios:
      'Pontos: Esfera 2,2 pts/US$ nacional e 3 internacional, até 4,5 com Rewards; expiram em 3 anos; opção de cashback de 1,2% (teto de R$ 500 por fatura). Viagem/aeroporto: Airport Concierge. Seguros: médico internacional de US$ 175 mil; locação de veículo (US$ 75 mil no exterior); atraso de embarque (US$ 200); atraso de bagagem (US$ 600); perda de bagagem (até US$ 3 mil); proteção de compra de 90 dias. Restaurantes/lazer: isenção de rolha; Surpreenda. Outros: até 5 adicionais grátis.',
  },
  {
    codigo: 'UNQ-VI',
    nome: 'Santander Unique Visa Infinite',
    bandeira: 'Visa',
    rede: 'dragonpass',
    acessos_ano: 2,
    convidados_ano: 'Consomem a franquia',
    gasto_trimestral_minimo: 'R$ 15 mil na soma das 3 últimas faturas fechadas',
    anuidade: 'R$ 1.155 (mesma regra do UNQ-MC)',
    regras:
      '2 acessos gratuitos por ano via DragonPass; convidados consomem a franquia; a partir do 3º acesso, tarifa da sala. Fast Pass Visa (GRU e Galeão). Private Banking é isento do gasto mínimo.',
    outros_beneficios:
      'Pontos: iguais ao UNQ-MC. Viagem/aeroporto: Fast Pass Visa (GRU e Galeão). Seguros: iguais ao UNQ-MC, com locação de veículo de US$ 90 mil e perda de bagagem de até US$ 3,5 mil.',
  },
  {
    codigo: 'AAP',
    nome: 'Santander AAdvantage Mastercard Platinum',
    bandeira: 'Mastercard',
    rede: 'nenhuma',
    acessos_ano: 0,
    convidados_ano: '—',
    gasto_trimestral_minimo: '—',
    anuidade: 'R$ 660 (12x R$ 55); 50% de desconto para correntista',
    regras:
      'Sem rede de salas VIP: acesso só pago, direto na sala. Restaurantes/lazer: Surpreenda (compre 1, leve 2); Surpreenda Restaurantes; isenção de rolha.',
    outros_beneficios:
      'Pontos: AAdvantage 1,5 milha/US$ + 1 extra em moeda estrangeira; dobro na American Airlines. Viagem/aeroporto: Airport Concierge. Seguros: MasterAssist Plus (médico em viagem), MasterSeguro de Automóveis. Outros: Concierge Mastercard 24h; Priceless Cities; até 5 adicionais grátis.',
  },
]

const AIRPORTS = [
  ['GRU', 'São Paulo/Guarulhos', 'Brasil'],
  ['CNF', 'Belo Horizonte/Confins', 'Brasil'],
  ['CGH', 'São Paulo/Congonhas', 'Brasil'],
  ['VCP', 'Campinas/Viracopos', 'Brasil'],
  ['GIG', 'Rio de Janeiro/Galeão', 'Brasil'],
  ['SDU', 'Rio de Janeiro/Santos Dumont', 'Brasil'],
  ['BSB', 'Brasília', 'Brasil'],
  ['SSA', 'Salvador', 'Brasil'],
  ['REC', 'Recife', 'Brasil'],
  ['FOR', 'Fortaleza', 'Brasil'],
  ['POA', 'Porto Alegre', 'Brasil'],
  ['CWB', 'Curitiba', 'Brasil'],
  ['FLN', 'Florianópolis', 'Brasil'],
  ['MIA', 'Miami', 'Estados Unidos'],
  ['MCO', 'Orlando', 'Estados Unidos'],
  ['JFK', 'Nova York', 'Estados Unidos'],
  ['ATL', 'Atlanta', 'Estados Unidos'],
  ['DFW', 'Dallas/Fort Worth', 'Estados Unidos'],
  ['LAS', 'Las Vegas', 'Estados Unidos'],
  ['SEA', 'Seattle', 'Estados Unidos'],
  ['SFO', 'São Francisco', 'Estados Unidos'],
  ['CLT', 'Charlotte', 'Estados Unidos'],
  ['BOS', 'Boston', 'Estados Unidos'],
  ['LGA', 'Nova York/LaGuardia', 'Estados Unidos'],
  ['DSM', 'Des Moines', 'Estados Unidos'],
]

// [aeroporto, terminal, area, nome, tipo, redes, status, observacoes]
const LOUNGES = [
  // GRU
  ['GRU', 'T1', 'dom', 'W Premium Lounge', 'sala', LKDP, 'confirmado', '24h, até 3h'],
  ['GRU', 'T1', 'publica', 'Living HNK', 'restaurante', LKDP, 'confirmado', ''],
  ['GRU', 'T2', 'dom', 'Advantage', 'sala', LK, 'confirmado', '24h, até 3h'],
  [
    'GRU',
    'T2',
    'dom',
    'GOL Premium Lounge',
    'sala',
    ['loungekey', 'dragonpass'],
    'confirmado',
    '6h às 23h, até 4h. SMI-VI ilimitado com voo GOL ou parceira Smiles',
  ],
  ['GRU', 'T2', 'dom', 'Plaza Premium Lounge', 'sala', LKDP, 'confirmado', '5h às 23h, até 2h'],
  ['GRU', 'T2', 'dom', 'The Lounge', 'sala', LKDP, 'confirmado', '24h'],
  ['GRU', 'T2', 'dom', 'W Premium Lounge The West', 'sala', LKDP, 'confirmado', '24h, até 3h'],
  [
    'GRU',
    'T2',
    'publica',
    'Urban Lounge & Work',
    'coworking',
    LK,
    'confirmado',
    'Antes do embarque',
  ],
  [
    'GRU',
    'T2',
    'int',
    'GOL Premium Lounge (internacional)',
    'sala',
    LKDP,
    'confirmado',
    '6h às 23h. SMI-VI ilimitado com voo GOL ou parceira Smiles',
  ],
  ['GRU', 'T2', 'int', 'The Lounge Internacional', 'sala', LKDP, 'confirmado', '24h'],
  ['GRU', 'T2', 'dom', 'A Saideira', 'restaurante', DP, 'confirmado', 'Menu fixo'],
  ['GRU', 'T2', 'dom', 'Burger Boss (Píer Leste e Oeste)', 'restaurante', DP, 'confirmado', ''],
  [
    'GRU',
    'T2',
    'dom',
    'Forneria Ouro Preto (Píer Leste e Oeste)',
    'restaurante',
    DP,
    'confirmado',
    '',
  ],
  ['GRU', 'T2', 'publica', 'General Prime Steak & Burger', 'restaurante', DP, 'confirmado', ''],
  [
    'GRU',
    'T2',
    'dom',
    'Rokkon',
    'restaurante',
    DP,
    'a_confirmar',
    'Relatos de que passou a oferecer só promoções, sem crédito',
  ],
  ['GRU', 'T2', 'dom', 'Seara Gourmet', 'restaurante', DP, 'confirmado', ''],
  ['GRU', 'T2', 'dom', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  ['GRU', 'T2', 'dom', 'Bleriot Bar & Lounge', 'restaurante', LK, 'confirmado', ''],
  [
    'GRU',
    'T3',
    'int',
    'Sala Mastercard Black',
    'sala_exclusiva',
    ['mastercard_black'],
    'confirmado',
    '10h às 23h30, até 4h. Acompanhante paga R$ 200; criança até 2 anos não paga',
  ],
  [
    'GRU',
    'T3',
    'int',
    'The Club by Mastercard',
    'sala_exclusiva',
    ['mastercard_black'],
    'a_confirmar',
    'Citada em artigo do próprio Santander com 1 acompanhante grátis; confirmar se é a mesma sala da Sala Mastercard Black',
  ],
  [
    'GRU',
    'T3',
    'int',
    'Visa Infinite Lounge',
    'sala_exclusiva',
    ['visa_infinite'],
    'confirmado',
    '24h, até 6h. Até 3 acompanhantes por 3h; criança menor de 6 anos não paga',
  ],
  [
    'GRU',
    'T3',
    'int',
    'W Premium Lounge The Pier',
    'sala',
    LKDP,
    'confirmado',
    'Portões 327 e 328, 24h',
  ],
  [
    'GRU',
    'T3',
    'int',
    'LATAM VIP Lounge',
    'sala',
    DP,
    'confirmado',
    'DragonPass só pago, das 18h às 22h30',
  ],
  [
    'GRU',
    'T3',
    'int',
    'A Saideira',
    'restaurante',
    DP,
    'a_confirmar',
    'LoungeKey aceito desde 26/08/2026 por cerca de 90 dias, durante a reforma do Paris 6',
  ],
  ['GRU', 'T3', 'int', 'Living HNK', 'restaurante', LKDP, 'confirmado', ''],
  ['GRU', 'T3', 'int', 'General Prime Steak & Burger', 'restaurante', DP, 'confirmado', ''],
  ['GRU', 'T3', 'int', 'Tryp GRU Airport', 'restaurante', LK, 'confirmado', ''],
  ['GRU', 'T3', 'int', 'Bleriot Bar & Lounge', 'restaurante', LK, 'confirmado', ''],
  ['GRU', 'T3', 'int', 'Paris 6', 'restaurante', LK, 'fechado_temporariamente', 'Em reforma'],
  // CNF
  [
    'CNF',
    'T1',
    'dom',
    'Advantage VIP Lounge',
    'sala',
    LK,
    'confirmado',
    '24h, 2º andar, junto ao portão 2',
  ],
  ['CNF', 'T1', 'dom', 'Ambaar Lounge (portão 1)', 'sala', LKDP, 'confirmado', '4h30 às 23h'],
  ['CNF', 'T1', 'dom', 'Ambaar Lounge (portão 7)', 'sala', LKDP, 'confirmado', '4h30 às 23h'],
  [
    'CNF',
    'T1',
    'dom',
    'BRT / Banco Inter Lounge',
    'sala',
    DP,
    'a_confirmar',
    'Entrada DP listada na rede',
  ],
  ['CNF', 'T1', 'publica', 'BRT Lounges', 'sala', DP, 'a_confirmar', ''],
  [
    'CNF',
    'T2',
    'int',
    'Ambaar Lounge Internacional',
    'sala',
    LKDP,
    'confirmado',
    'Abre conforme os voos internacionais',
  ],
  ['CNF', 'T1', 'dom', 'Belo Bar', 'restaurante', DP, 'confirmado', ''],
  ['CNF', 'T1', 'dom', 'LIQD Bar', 'restaurante', DP, 'confirmado', ''],
  ['CNF', 'T1', 'publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  [
    'CNF',
    '',
    '',
    'Plaza Premium Lounge',
    'sala',
    [],
    'previsto',
    'Anunciada para 2026, sem data nem redes definidas',
  ],
  // CGH
  ['CGH', '', 'dom', 'Ambaar Club', 'sala', LK, 'confirmado', ''],
  ['CGH', '', 'dom', 'Advantage VIP Lounge', 'sala', LK, 'confirmado', ''],
  ['CGH', '', 'publica', 'Emerald VIP Lounge', 'sala', DP, 'confirmado', ''],
  ['CGH', '', 'publica', 'W Premium Lounge Congonhas', 'sala', DP, 'confirmado', ''],
  ['CGH', '', 'publica', "A'dam Lounge", 'restaurante', DP, 'confirmado', ''],
  ['CGH', '', 'dom', 'A Saideira', 'restaurante', DP, 'confirmado', 'Menu fixo'],
  ['CGH', '', 'publica', 'Forneria Ouro Preto', 'restaurante', DP, 'confirmado', ''],
  ['CGH', '', '', 'Casa Qualycom', 'restaurante', DP, 'confirmado', ''],
  // VCP
  ['VCP', '', '', 'Ambaar Club', 'sala', LK, 'confirmado', ''],
  ['VCP', '', '', 'Advantage VIP Lounge', 'sala', LK, 'confirmado', ''],
  ['VCP', '', '', 'The Lounge Viracopos', 'sala', LK, 'confirmado', ''],
  ['VCP', '', 'int', 'Lounge Azul', 'sala', LK, 'confirmado', ''],
  ['VCP', '', 'int', 'BRT Lounges', 'sala', DP, 'confirmado', ''],
  ['VCP', '', 'int', 'Nino Panino Osteria & Bar', 'restaurante', LKDP, 'confirmado', ''],
  ['VCP', '', '', 'Forneria Ouro Preto', 'restaurante', LK, 'confirmado', ''],
  ['VCP', '', 'publica', 'Umrry', 'restaurante', DP, 'confirmado', ''],
  ['VCP', '', 'dom e publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  ['VCP', '', 'publica', 'Aero Sleep', 'descanso', DP, 'confirmado', ''],
  // GIG
  [
    'GIG',
    '',
    'dom e int',
    'GOL Premium Lounge',
    'sala',
    LKDP,
    'fechado_temporariamente',
    'Fontes indicam fechamento temporário; confirmar. SMI-VI ilimitado com voo GOL ou parceira Smiles',
  ],
  ['GIG', '', 'dom', 'Plaza Premium Lounge', 'sala', LKDP, 'confirmado', ''],
  ['GIG', '', 'int', 'Plaza Premium Lounge (internacional)', 'sala', DP, 'confirmado', ''],
  ['GIG', '', 'publica', 'Plaza Premium Arrivals', 'sala', DP, 'confirmado', 'Desembarque'],
  ['GIG', '', 'dom e int', 'A Saideira', 'restaurante', DP, 'confirmado', 'Menu fixo'],
  ['GIG', '', '', 'Grand Cru', 'restaurante', LK, 'confirmado', ''],
  // SDU
  ['SDU', '', '', 'Advantage VIP Lounge (2 unidades)', 'sala', LK, 'confirmado', ''],
  ['SDU', '', 'publica', 'Emerald VIP Lounge', 'sala', DP, 'confirmado', ''],
  ['SDU', '', 'publica', 'Harmony Lounge', 'sala', DP, 'confirmado', ''],
  ['SDU', '', 'publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  // BSB
  ['BSB', '', 'dom e int', 'Aeroportos VIP Club', 'sala', LKDP, 'confirmado', ''],
  ['BSB', '', 'dom', 'VIP Express Club Pier Norte', 'sala', LKDP, 'confirmado', ''],
  ['BSB', '', 'dom', 'VIP Express Club Pier Sul', 'sala', LKDP, 'confirmado', ''],
  ['BSB', '', 'publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  // SSA
  ['SSA', '', 'dom e publica', 'Ambaar Club', 'sala', LK, 'confirmado', ''],
  ['SSA', '', 'dom', 'Amaní Lounge', 'sala', DP, 'confirmado', ''],
  ['SSA', '', 'dom', 'Barzetti', 'restaurante', DP, 'confirmado', ''],
  ['SSA', '', 'publica', 'Mesa de Tereza', 'restaurante', DP, 'confirmado', ''],
  // REC
  ['REC', '', 'int', 'W Premium Lounge Frevo', 'sala', LKDP, 'confirmado', ''],
  ['REC', '', 'dom', 'W Premium Lounge São João', 'sala', LKDP, 'confirmado', ''],
  ['REC', '', 'publica', 'Bonaparte Restaurante & Lounge', 'restaurante', DP, 'confirmado', ''],
  ['REC', '', 'publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  ['REC', '', '', 'Paço Real', 'restaurante', LK, 'confirmado', ''],
  ['REC', '', 'dom e int', 'Paço Píer', 'restaurante', LK, 'confirmado', ''],
  // FOR
  ['FOR', '', 'dom e int', 'Ambaar Club', 'sala', LK, 'confirmado', ''],
  ['FOR', '', 'dom', 'W Premium Lounge Fortaleza', 'sala', DP, 'confirmado', ''],
  ['FOR', '', 'int', 'W Premium Lounge Beira-Mar e Iracema', 'sala', DP, 'confirmado', ''],
  ['FOR', '', 'publica', 'W Arrival Lounge', 'sala', DP, 'confirmado', ''],
  ['FOR', '', 'dom', 'A Saideira', 'restaurante', DP, 'confirmado', 'Menu fixo'],
  [
    'FOR',
    '',
    'dom e publica',
    'Vignoli Cucina',
    'restaurante',
    DP,
    'a_confirmar',
    'Relatos de que dá só suco ou água com a refeição, sem crédito',
  ],
  ['FOR', '', 'dom', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  // POA
  ['POA', '', 'dom e int', 'Ambaar Club', 'sala', LK, 'confirmado', ''],
  ['POA', '', 'dom', 'W Premium Lounge Porto Alegre', 'sala', DP, 'confirmado', ''],
  [
    'POA',
    '',
    'dom',
    'Rokkon',
    'restaurante',
    DP,
    'a_confirmar',
    'Relatos de que passou a oferecer só promoções, sem crédito',
  ],
  ['POA', '', 'dom e publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  ['POA', '', 'dom', 'A Saideira', 'restaurante', DP, 'confirmado', 'Menu fixo'],
  // CWB
  ['CWB', '', 'dom e int', 'Advantage VIP Lounge', 'sala', LK, 'confirmado', ''],
  ['CWB', '', 'dom', 'W Premium Lounge Curitiba', 'sala', DP, 'confirmado', ''],
  ['CWB', '', 'publica', 'Break Travel Lounge', 'sala', DP, 'confirmado', ''],
  ['CWB', '', 'dom e publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  // FLN
  ['FLN', '', 'dom e int', 'The Lounge Florianópolis', 'sala', LK, 'confirmado', ''],
  ['FLN', '', 'publica', 'AMAE Lounge', 'sala', DP, 'confirmado', ''],
  ['FLN', '', 'dom', 'A Saideira', 'restaurante', DP, 'confirmado', 'Menu fixo'],
  ['FLN', '', 'publica', 'Living HNK', 'restaurante', DP, 'confirmado', ''],
  // MIA
  [
    'MIA',
    'North, Concourse D/E',
    '',
    'Turkish Airlines Lounge',
    'sala',
    LK,
    'confirmado',
    '5h às 22h',
  ],
  [
    'MIA',
    'South, Concourse H/J',
    '',
    'Turkish Airlines Lounge (South)',
    'sala',
    LK,
    'confirmado',
    '24h, entrada até 3h antes do voo',
  ],
  ['MIA', 'South, Concourse J', '', 'Avianca/TAP VIP Lounge', 'sala', LK, 'confirmado', '24h'],
  [
    'MIA',
    '',
    '',
    'DragonPass em MIA',
    'sala',
    DP,
    'a_confirmar',
    'Nenhuma fonte listou salas; pesquisar no app',
  ],
  [
    'MIA',
    'Concourse D',
    '',
    'Admirals Club e Flagship',
    'sala',
    [],
    'nao_incluso',
    'Não estão incluídas no AAB',
  ],
  // MCO
  [
    'MCO',
    'A, portões 1 a 29',
    '',
    'The Club MCO (A)',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar. 5h às 21h',
  ],
  [
    'MCO',
    'B, portão 91',
    '',
    'The Club MCO (B)',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar. 5h às 21h',
  ],
  [
    'MCO',
    'C, portão C241',
    '',
    'Plaza Premium Lounge',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar. 7h às 21h; avulso a partir de US$ 75',
  ],
  // JFK
  ['JFK', 'T1', '', 'Air France Lounge', 'sala', LK, 'confirmado', ''],
  ['JFK', 'T1', '', 'Lufthansa Business Lounge', 'sala', LK, 'confirmado', ''],
  ['JFK', 'T1', '', 'VIP ONE Lounge', 'sala', LK, 'confirmado', ''],
  ['JFK', 'T1', '', 'Turkish Airlines Lounge', 'sala', LK, 'confirmado', ''],
  ['JFK', 'T1', '', 'Primeclass Lounge', 'sala', LK, 'confirmado', ''],
  ['JFK', 'T4', '', 'Air India Lounge', 'sala', LK, 'confirmado', ''],
  [
    'JFK',
    'T4',
    '',
    'Virgin Atlantic Clubhouse',
    'sala',
    LK,
    'confirmado',
    'Só até 13h30 para LoungeKey',
  ],
  [
    'JFK',
    'T4',
    '',
    'Chase Sapphire Lounge by The Club with Etihad',
    'sala',
    LK,
    'a_confirmar',
    'Operação temporariamente limitada',
  ],
  ['JFK', 'T4 e T8', '', 'Minute Suites', 'descanso', LK, 'confirmado', 'Suíte de descanso'],
  ['JFK', 'T1', '', 'Be Relax Spa', 'spa', LK, 'confirmado', ''],
  ['JFK', 'T5 e T8', '', 'Gameway', 'sala', LK, 'confirmado', 'Videogame'],
  ['JFK', '', '', 'DragonPass em JFK', 'sala', DP, 'a_confirmar', 'Pesquisar no app'],
  // Outros EUA — The Club (Priority Pass)
  [
    'ATL',
    'Concourse F',
    '',
    'The Club at ATL',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'DFW',
    'Terminal D',
    '',
    'The Club at DFW',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'LAS',
    'Concourses D e E',
    '',
    'The Club at LAS',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'SEA',
    'Concourse A e Satellite S',
    '',
    'The Club at SEA',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'SFO',
    'Terminal 1',
    '',
    'The Club SFO',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'CLT',
    'Concourse A',
    '',
    'The Club CLT',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'BOS',
    'Terminal B',
    '',
    'Chase Sapphire Lounge by The Club',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
  [
    'LGA',
    'Terminal B',
    '',
    'Chase Sapphire Lounge by The Club (LGA)',
    'sala',
    [],
    'a_confirmar',
    'Priority Pass; aceitação LK/DP a confirmar',
  ],
]

// [cartaoCodigo, area_do_terminal, nome_da_sala, condicao]
const ACCESS = [
  [
    'UNL-MC',
    'Sala Mastercard Black',
    'Titular ilimitado; acompanhante paga R$ 200 (criança até 2 anos não paga); 10h às 23h30, até 4h',
  ],
  [
    'UNL-MC',
    'The Club by Mastercard',
    'A confirmar se é a mesma sala da Sala Mastercard Black; artigo do Santander cita 1 acompanhante grátis',
  ],
  [
    'UNQ-MC',
    'Sala Mastercard Black',
    'Dentro da franquia (2 acessos/ano, não cumulativos); acompanhante consome a franquia',
  ],
  [
    'AAB',
    'Sala Mastercard Black',
    'Dentro da franquia (4 acessos/ano, não cumulativos); acompanhante consome a franquia',
  ],
  ['UNL-VI', 'Visa Infinite Lounge', 'Titular ilimitado; até 3 acompanhantes por 3h'],
  ['UNQ-VI', 'Visa Infinite Lounge', 'Dentro da franquia (2 acessos/ano)'],
  ['SMI-VI', 'Visa Infinite Lounge', 'Dentro da franquia (1 acesso/ano)'],
  ['UNL-MC', 'GOL Premium Lounge', 'Via LoungeKey'],
  ['AAB', 'GOL Premium Lounge', 'Via LoungeKey, dentro da franquia'],
  ['UNQ-MC', 'GOL Premium Lounge', 'Via LoungeKey, dentro da franquia'],
  [
    'SMI-VI',
    'GOL Premium Lounge',
    'Ilimitado com voo GOL ou parceira Smiles, com 1 acompanhante; fora disso, usa a franquia DragonPass',
  ],
  ['UNL-VI', 'GOL Premium Lounge', 'Via DragonPass'],
  ['UNQ-VI', 'GOL Premium Lounge', 'Via DragonPass, dentro da franquia'],
]

migrate(
  (app) => {
    // --- Cartões ---
    const cardIds = {}
    for (const c of CARDS) cardIds[c.codigo] = ensureCard(app, c)

    // --- Aeroportos ---
    const airportIds = {}
    for (const [codigo, cidade, pais] of AIRPORTS) {
      airportIds[codigo] = ensureAirport(app, codigo, cidade, pais)
    }

    // --- Salas ---
    const salaIds = {}
    for (const [aero, terminal, area, nome, tipo, redes, status, obs] of LOUNGES) {
      const key = `${aero}|${nome}`
      salaIds[key] = ensureLounge(app, {
        airportId: airportIds[aero],
        terminal,
        area,
        nome,
        tipo,
        redes,
        status,
        observacoes: obs,
      })
    }

    // --- Acessos por cartão ---
    const accessCol = app.findCollectionByNameOrId('lounge_access')
    for (const [codigo, salaNome, condicao] of ACCESS) {
      const salaId = salaIds[`GRU|${salaNome}`]
      if (!salaId || !cardIds[codigo]) continue
      const filtro = `sala = "${salaId}" && cartao = "${cardIds[codigo]}"`
      try {
        app.findFirstRecordByFilter('lounge_access', filtro)
        continue // já existe
      } catch (_) {
        const rec = new Record(accessCol)
        rec.set('sala', salaId)
        rec.set('cartao', cardIds[codigo])
        rec.set('condicao', condicao)
        app.save(rec)
      }
    }

    // --- Vínculo credit_cards → card_profiles (por nome parecido) ---
    const mapping = [
      ['santander aadvantage black', 'AAB'],
      ['aadvantage mastercard black', 'AAB'],
      ['smiles visa infinite', 'SMI-VI'],
      ['gol smiles visa infinite', 'SMI-VI'],
      ['unlimited mastercard', 'UNL-MC'],
      ['unlimited visa', 'UNL-VI'],
      ['unique mastercard', 'UNQ-MC'],
      ['unique visa', 'UNQ-VI'],
      ['aadvantage mastercard platinum', 'AAP'],
      ['aadvantage platinum', 'AAP'],
    ]
    const cards = app.findRecordsByFilter('credit_cards', '', '', 500, 0)
    for (const card of cards) {
      const nome = (card.getString('name') || '').toLowerCase()
      if (!nome) continue
      let perfilId = ''
      for (const [needle, code] of mapping) {
        if (nome.includes(needle)) {
          perfilId = cardIds[code]
          break
        }
      }
      if (!perfilId) continue
      if (card.getString('perfil') === perfilId) continue
      card.set('perfil', perfilId)
      app.save(card)
    }

    console.log(
      '0030: base de salas VIP semeada —',
      CARDS.length,
      'cartões,',
      AIRPORTS.length,
      'aeroportos,',
      LOUNGES.length,
      'salas/restaurantes.',
    )
  },
  (app) => {
    // down: remove o que o seed criou (mantém collections)
    try {
      app.db().newQuery('DELETE FROM lounge_access').execute()
      app.db().newQuery('DELETE FROM lounges').execute()
      app.db().newQuery('DELETE FROM airports').execute()
      app.db().newQuery('DELETE FROM card_profiles').execute()
    } catch (err) {
      console.error('0030 down:', err)
    }
  },
)
