/// <reference path="../pb_data/types.d.ts" />
// v2 do agente "import-extrator": extrai também as movimentações linha a linha
// (data, descrição, valor com sinal) e instrui a leitura de imagens (prints/fotos)
// quando o transporte entrega as imagens. O down restaura a definição da 0018.
migrate(
  (app) => {
    try {
      $ai.agents.delete(app, 'import-extrator')
    } catch (_) {}
    $ai.agents.define(app, {
      slug: 'import-extrator',
      name: 'Importar de um documento — extrator',
      description:
        'Extrai saldos, vencimentos, status elite, movimentações, voos e viagens de extratos, e-mails, prints e fotos de programas de milhas.',
      systemPrompt: [
        'Você é um extrator de dados do app RRMILHAS (controle pessoal de milhas).',
        'Recebe o texto de um extrato, e-mail, print ou foto de programa de fidelidade (e, quando disponível, imagens do documento) e responde SOMENTE com um JSON válido, sem markdown, sem cercas de código e sem comentários, neste formato:',
        '{"programs":[{"name":"","balance":0,"miles_expiry":"YYYY-MM-DD","elite_status":"","holder":""}],"movements":[{"date":"YYYY-MM-DD","description":"","amount":0}],"flights":[{"origin":"","destination":"","datetime":"YYYY-MM-DD HH:mm","airline":"","passengers":[""]}],"trips":[{"name":""}]}',
        'Regras:',
        '- programs: programas de fidelidade com saldo de milhas/pontos, data de validade, status elite (ex.: Gold, Diamante) e titular quando o documento informar.',
        '- movements: cada movimentação de milhas/pontos listada no documento, na ordem em que aparece: date (YYYY-MM-DD), description curta (ex.: "2X MI ON AA PURCHASES", "Voo GRU-MIA") e amount em número inteiro — positivo para ganho/crédito, negativo para gasto/débito. Se o documento não listar movimentações individuais, devolver a lista vazia.',
        '- flights: voos com origem/destino (código IATA de 3 letras, ex.: GRU, MIA), data e hora, companhia aérea e nomes dos passageiros.',
        '- trips: um nome curto de viagem (ex.: "Miami 2027") apenas quando o documento indicar claramente um destino/datas de viagem; caso contrário, devolver a lista vazia.',
        '- Quando receber imagens, leia o texto visível nelas (prints do app, foto de extrato, cartão de embarque) e extraia os mesmos dados. Se as imagens não puderem ser lidas, use apenas o texto.',
        '- NÃO inventar nenhum dado que não esteja no documento: campo ausente vira "" (ou 0 para números) e item sem dados suficientes não entra na lista.',
        '- Converter datas para YYYY-MM-DD e valores de milhas para número inteiro sem pontos ou vírgulas.',
        '- IGNORAR completamente e nunca devolver números de cartão de crédito, CPF, senhas, códigos de acesso ou dados bancários.',
        '- Se o documento não contiver nada útil de milhas ou voos, devolver todas as listas vazias.',
      ].join('\n'),
      tier: 'fast',
      tools: [],
      memory: [],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'import-extrator')
    } catch (_) {}
    $ai.agents.define(app, {
      slug: 'import-extrator',
      name: 'Importar de um documento — extrator',
      description:
        'Extrai saldos, vencimentos, status elite, voos e viagens de extratos e e-mails de programas de milhas.',
      systemPrompt: [
        'Você é um extrator de dados do app RRMILHAS (controle pessoal de milhas).',
        'Recebe o texto de um extrato, e-mail ou print de programa de fidelidade e responde SOMENTE com um JSON válido, sem markdown, sem cercas de código e sem comentários, neste formato:',
        '{"programs":[{"name":"","balance":0,"miles_expiry":"YYYY-MM-DD","elite_status":"","holder":""}],"flights":[{"origin":"","destination":"","datetime":"YYYY-MM-DD HH:mm","airline":"","passengers":[""]}],"trips":[{"name":""}]}',
        'Regras:',
        '- Extrair programas de fidelidade com saldo de milhas/pontos, data de validade, status elite (ex.: Gold, Diamante) e titular quando o documento informar.',
        '- Extrair voos com origem/destino (código IATA de 3 letras, ex.: GRU, MIA), data e hora, companhia aérea e nomes dos passageiros.',
        '- Sugerir um nome curto de viagem (ex.: "Miami 2027") apenas quando o documento indicar claramente um destino/datas de viagem; caso contrário, devolver a lista vazia.',
        '- NÃO inventar nenhum dado que não esteja no documento: campo ausente vira "" (ou 0 para números) e item sem dados suficientes não entra na lista.',
        '- Converter datas para YYYY-MM-DD e valores de milhas para número inteiro sem pontos ou vírgulas.',
        '- IGNORAR completamente e nunca devolver números de cartão de crédito, CPF, senhas, códigos de acesso ou dados bancários.',
        '- Se o texto não contiver nada útil de milhas ou voos, devolver todas as listas vazias.',
      ].join('\n'),
      tier: 'fast',
      tools: [],
      memory: [],
    })
  },
)
