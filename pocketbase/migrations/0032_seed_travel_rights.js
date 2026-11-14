// 0032 — Seed da aba "Se algo der errado": regras ANAC 400 (BR) e US DOT (EUA)
// em travel_rights, coberturas Visa Infinite / Mastercard Black em insurance_coverage,
// e itens de "Documentos e seguros" na checklist das viagens existentes.
// Idempotente: atualiza o registro quando ele já existe (chave pais+gatilho / bandeira+cobertura).
// Coleções criadas na 0031 (padrão do projeto: cria numa, semeia na seguinte).

const REVISAO = '2026-11-14 12:00:00.000Z'

const BR_OBS =
  ' Nota: a ANAC aprovou em 22/09/2026 uma atualização da Resolução 400 — depende de publicação no DOU e vale 30 dias após; confirme a vigência na data do voo.'

// [pais, categoria, gatilho, direito, prazo, observacao, fonte]
const RIGHTS = [
  // ---- Brasil (ANAC Resolução 400/2016) ----
  [
    'BR',
    'atraso',
    'Atraso +1h',
    'Facilidades de comunicação (internet, telefone).',
    'Após 1h de espera',
    'Se a companhia não oferecer, compre o razoável e guarde os recibos para reembolso.',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'atraso',
    'Atraso +2h',
    'Alimentação (voucher ou refeição).',
    'Após 2h de espera',
    '',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'atraso',
    'Atraso +4h ou pernoite',
    'Hospedagem (pernoite) + traslado de ida e volta.',
    'Após 4h de espera ou pernoite',
    '',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'cancelamento',
    'Cancelamento, atraso +4h, interrupção ou preterição',
    'Escolha do passageiro entre: reacomodação no próximo voo (próprio ou de terceiros) ou em data de sua conveniência, reembolso integral ou remarcação sem custo.',
    'Reembolso em até 7 dias',
    'A escolha é do passageiro, não da companhia. Reembolso integral se pedido na origem; proporcional ao trecho não usado se parte da viagem foi aproveitada; em crédito só com concordância.',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'pretericao',
    'Preterição involuntária (negaram o embarque)',
    'Compensação imediata de 250 DES (voo doméstico) ou 500 DES (internacional), além da reacomodação/reembolso.',
    'Na hora',
    'DES convertido em reais pela cotação do Banco Central do dia (referência: 1 DES ≈ R$ 7 → 250 DES ≈ R$ 1.750; 500 DES ≈ R$ 3.500 — confirmar a cotação na data). Busca de voluntários com compensação combinada não é preterição.',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'bagagem',
    'Bagagem atrasada — voo doméstico',
    'Entrega da bagagem em até 7 dias; passou o prazo, é extravio, com indenização.',
    '7 dias',
    'Registrar RIR/PIR no balcão antes de sair do aeroporto — sem isso perde o direito.',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'bagagem',
    'Bagagem atrasada — voo internacional',
    'Entrega da bagagem em até 21 dias; passou o prazo, é extravio, com indenização.',
    '21 dias',
    'Registrar RIR/PIR no balcão antes de sair do aeroporto.',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'bagagem',
    'Antes de sair da área de bagagem',
    'Registrar o RIR/PIR (Relatório de Irregularidade) no balcão da companhia — bagagem atrasada, avariada ou extraviada.',
    'Imediato',
    'Sem esse registro o direito se perde. Guarde a etiqueta de bagagem, comprovantes e fotos.',
    'ANAC Resolução 400/2016',
  ],
  [
    'BR',
    'medico',
    'Emergência médica durante a viagem',
    'Não é responsabilidade da companhia aérea — acione o seguro do cartão; em risco de vida, procure o serviço de emergência local primeiro.',
    '—',
    'Ligue para a central do seguro antes de pagar: eles orientam a rede e o reembolso. O Bilhete de Seguro precisa ter sido emitido antes da viagem.',
    '—',
  ],

  // ---- EUA (US DOT) ----
  [
    'US',
    'atraso',
    'Atraso — qualquer duração',
    'Sem assistência material obrigatória por lei federal (hotel e comida dependem da política de cada companhia — customer service plans).',
    '—',
    'Peça mesmo assim: algumas companhias oferecem. Registrando despesas, avalie o seguro do cartão.',
    'US DOT',
  ],
  [
    'US',
    'atraso',
    'Avião parado em solo (tarmac delay)',
    'A companhia não pode manter o avião em solo mais de 3h (doméstico) ou 4h (internacional) sem permitir o desembarque; comida e água após 2h.',
    '3h doméstico / 4h internacional',
    'Valores e limites a confirmar na fonte oficial do DOT.',
    'US DOT',
  ],
  [
    'US',
    'cancelamento',
    'Cancelamento ou mudança significativa sem aceitar reacomodação',
    'Reembolso AUTOMÁTICO, sem você pedir, na forma original de pagamento.',
    '7 dias úteis (cartão) / 20 dias corridos (outros meios)',
    'Mudança significativa: partida/chegada +3h (doméstico) ou +6h (internacional), troca de aeroporto, mais conexões ou downgrade. Aceitar reacomodação ou voucher abre mão do reembolso. Em vigor desde 28/10/2024.',
    'US DOT',
  ],
  [
    'US',
    'bagagem',
    'Bagagem despachada não entregue em 12h (voo doméstico)',
    'Devolução da taxa de bagagem.',
    '12 horas',
    '',
    'US DOT',
  ],
  [
    'US',
    'bagagem',
    'Bagagem despachada não entregue em 15–30h (voo internacional)',
    'Devolução da taxa de bagagem.',
    '15 a 30 horas',
    '',
    'US DOT',
  ],
  [
    'US',
    'pretericao',
    'Preterição involuntária — atraso de 1–2h (doméstico) ou 1–4h (internacional)',
    'Compensação de 200% da tarifa de ida, com teto de US$ 1.075.',
    'Imediata',
    'Chegada em até 1h do previsto: sem compensação. Valores a confirmar na fonte oficial (DOT).',
    'US DOT',
  ],
  [
    'US',
    'pretericao',
    'Preterição involuntária — atraso acima de 2h (doméstico) / 4h (internacional)',
    'Compensação de 400% da tarifa de ida, com teto de US$ 2.150.',
    'Imediata',
    'Valores a confirmar na fonte oficial (DOT).',
    'US DOT',
  ],
  [
    'US',
    'medico',
    'Emergência médica durante a viagem',
    'Não é responsabilidade da companhia aérea — acione o seguro do cartão; em risco de vida, procure o serviço de emergência local primeiro.',
    '—',
    'Ligue para a central do seguro antes de pagar: eles orientam a rede e o reembolso. O Bilhete de Seguro precisa ter sido emitido antes da viagem.',
    '—',
  ],
]

// Metadados de acionamento por bandeira (aplicados a todas as linhas da bandeira).
const VISA = {
  emissao: 'visa.com.br/portaldebeneficios → "Bilhetes de seguro"',
  telefone_br: '0800 891 3679',
  telefone_exterior: 'EUA/Canadá 1 800 396 9665; outros países +1 303 967 1098 (a cobrar)',
  condicao:
    'Passagem paga integralmente com o Visa Infinite (com milhas, pagar as taxas com o cartão; sem taxas, os pontos devem ter origem no cartão). Cobre o titular e passageiros com passagem paga no cartão. Restrição: não cobre viagens para/por Cuba, Irã, Síria, Coreia do Norte, Crimeia e Venezuela.',
}
const MC = {
  emissao:
    'aig.com/Mastercard/pt (gratuita) — informe número do cartão, CPF/passaporte e e-mail e cadastre cada segurado',
  telefone_br: '0800 725 2025',
  telefone_exterior:
    '+1 636 722 8881 (a cobrar, em português); Mastercard Global Service (perda/roubo do cartão) +1 636 722 7111',
  condicao:
    'Passagem paga integralmente com o Mastercard Black, sem exigir parentesco; cada passageiro precisa do próprio bilhete (MasterAssist Black — AIG).',
}

const PREREQ =
  'Bilhete de Seguro emitido ANTES da viagem (não retroativo), um por passageiro, gratuito; validade de 12 meses; cada viagem limitada a 60 dias consecutivos; guarde o PDF no celular.'

// [bandeira, cobertura, limite_usd]
const INSURANCE = [
  ['visa_infinite', 'Pré-requisito — Bilhete de Seguro', PREREQ],
  ['visa_infinite', 'Despesas médicas e hospitalares', 'US$ 175.000'],
  ['visa_infinite', 'Despesas odontológicas', 'US$ 7.500'],
  ['visa_infinite', 'Traslado médico', 'US$ 100.000'],
  ['visa_infinite', 'Regresso sanitário', 'US$ 100.000'],
  ['visa_infinite', 'Traslado de corpo', 'US$ 100.000'],
  ['visa_infinite', 'Retorno de pessoa elegível', 'US$ 30.000'],
  ['visa_infinite', 'Prorrogação de estadia', 'US$ 2.000'],
  ['visa_infinite', 'Acompanhante (internação prolongada)', 'US$ 12.000'],
  ['visa_infinite', 'Paciente internado', 'US$ 200/dia, até 30 dias'],
  ['visa_infinite', 'Retorno em classe executiva', 'US$ 7.500'],
  ['visa_infinite', 'Hospedagem de pet', 'US$ 650'],
  ['visa_infinite', 'Transporte VIP', 'US$ 2.500 por incidente'],
  [
    'visa_infinite',
    'Atraso/cancelamento de voo e atraso/extravio de bagagem',
    'Valores não publicados — confirmar no Portal Visa',
  ],
  ['mastercard_black', 'Pré-requisito — Bilhete de Seguro', PREREQ],
  ['mastercard_black', 'Despesas médicas e hospitalares', 'US$ 175.000'],
  ['mastercard_black', 'Odontológico', 'US$ 100 por dente'],
  ['mastercard_black', 'Traslado médico', 'US$ 100.000'],
  ['mastercard_black', 'Regresso sanitário', 'US$ 100.000'],
  ['mastercard_black', 'Traslado de corpo', 'US$ 100.000'],
  ['mastercard_black', 'Internação (diária)', 'US$ 200/dia, até 30 dias'],
  ['mastercard_black', 'Atraso de embarque (a partir de 4h)', 'US$ 200'],
  ['mastercard_black', 'Atraso de bagagem', 'US$ 600'],
  ['mastercard_black', 'Perda de bagagem', 'US$ 3.000'],
  ['mastercard_black', 'Cancelamento de viagem', 'US$ 3.000'],
]

// Itens da seção "Documentos e seguros" da checklist de cada viagem.
const DOC_ITEMS = [
  'Bilhete de seguro Visa Infinite emitido (PDF salvo)',
  'Bilhete de seguro Mastercard Black emitido (PDF salvo)',
  'Telefones das centrais de seguro salvos offline',
  'Passagem paga com o cartão certo (para valer o seguro)',
  'Em problema: motivo por escrito, fotos do painel, protocolo, recibos',
  'Bagagem: RIR/PIR registrado antes de sair do aeroporto',
  'Guardar cartões de embarque até concluir pedidos',
]

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

function ensureRight(app, [pais, categoria, gatilho, direito, prazo, observacao, fonte]) {
  let obs = observacao || ''
  if (pais === 'BR') obs = (obs + BR_OBS).trim()
  let rec = null
  try {
    rec = app.findFirstRecordByFilter(
      'travel_rights',
      `pais = "${pais}" && gatilho = "${esc(gatilho)}"`,
    )
  } catch (_) {
    rec = null
  }
  if (!rec) rec = new Record(app.findCollectionByNameOrId('travel_rights'))
  rec.set('pais', pais)
  rec.set('categoria', categoria)
  rec.set('gatilho', gatilho)
  rec.set('direito', direito)
  rec.set('prazo', prazo || '')
  rec.set('observacao', obs)
  rec.set('fonte', fonte || '')
  rec.set('revisado_em', REVISAO)
  app.save(rec)
}

function ensureInsurance(app, [bandeira, cobertura, limite]) {
  const meta = bandeira === 'visa_infinite' ? VISA : MC
  let rec = null
  try {
    rec = app.findFirstRecordByFilter(
      'insurance_coverage',
      `bandeira = "${bandeira}" && cobertura = "${esc(cobertura)}"`,
    )
  } catch (_) {
    rec = null
  }
  if (!rec) rec = new Record(app.findCollectionByNameOrId('insurance_coverage'))
  rec.set('bandeira', bandeira)
  rec.set('cobertura', cobertura)
  rec.set('limite_usd', limite || '')
  rec.set('emissao', meta.emissao)
  rec.set('telefone_br', meta.telefone_br)
  rec.set('telefone_exterior', meta.telefone_exterior)
  rec.set('condicao', meta.condicao)
  rec.set('revisado_em', REVISAO)
  app.save(rec)
}

// Semeia os itens de documentos/seguros em cada viagem existente (fase liberada na 0031).
function ensureDocumentsItems(app) {
  try {
    const col = app.findCollectionByNameOrId('trip_checklist_items')
    const trips = app.findRecordsByFilter('trips', '', '', 0, 0)
    for (const trip of trips) {
      const existing = app.findRecordsByFilter(
        'trip_checklist_items',
        `trip = "${trip.id}" && phase = "documentos_seguros"`,
        '',
        0,
        0,
      )
      if (existing.length > 0) continue
      const docs = app.findRecordsByFilter(
        'trip_checklist_items',
        `trip = "${trip.id}"`,
        '-sort_order',
        1,
        0,
      )
      let order = docs.length > 0 ? (docs[0].get('sort_order') || 0) + 1 : 0
      for (const title of DOC_ITEMS) {
        const rec = new Record(col)
        rec.set('trip', trip.id)
        rec.set('phase', 'documentos_seguros')
        rec.set('title', title)
        rec.set('done', false)
        rec.set('sort_order', order++)
        app.save(rec)
      }
    }
  } catch (err) {
    console.error('0032 ensureDocumentsItems:', err)
  }
}

migrate(
  (app) => {
    for (const r of RIGHTS) ensureRight(app, r)
    for (const i of INSURANCE) ensureInsurance(app, i)
    ensureDocumentsItems(app)
    console.log(
      '0032: travel_rights (' +
        RIGHTS.length +
        ' regras) e insurance_coverage (' +
        INSURANCE.length +
        ' coberturas) semeadas.',
    )
  },
  (app) => {
    for (const [col, paisOuBandeira] of [
      ['travel_rights', null],
      ['insurance_coverage', null],
    ]) {
      try {
        const records = app.findRecordsByFilter(col, paisOuBandeira || '', '', 0, 0)
        for (const rec of records) app.delete(rec)
      } catch (_) {}
    }
  },
)
