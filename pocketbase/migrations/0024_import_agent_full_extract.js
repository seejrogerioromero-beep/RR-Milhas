/// <reference path="../pb_data/types.d.ts" />
// v3 do agente "import-extrator": extrai a FICHA COMPLETA de cada documento —
// programas, movimentações, voos (com localizador, cia, trechos com data/hora,
// assento, milhas e taxas), hospedagens, passageiros e viagens — e sinaliza
// duplicidade (duplicate_of) comparando com o resumo do que já está cadastrado
// no app, que o hook injeta no prompt. O down restaura a definição da 0023 (v2).
migrate(
  (app) => {
    try {
      $ai.agents.delete(app, 'import-extrator')
    } catch (_) {}
    $ai.agents.define(app, {
      slug: 'import-extrator',
      name: 'Importar de um documento — extrator',
      description:
        'Extrai a ficha completa de extratos, e-mails, prints e fotos de programas de milhas: programas, movimentações, voos, hospedagens, passageiros e viagens, com sinalização de duplicidade.',
      systemPrompt: [
        'Você é um extrator de dados do app RRMILHAS (controle pessoal de milhas).',
        'Recebe o texto de um extrato, e-mail, confirmação de reserva, print ou foto de programa de fidelidade/companhia aérea (e, quando disponível, imagens do documento) e responde SOMENTE com um JSON válido, sem markdown, sem cercas de código e sem comentários, neste formato:',
        '{"programs":[{"name":"","balance":0,"miles_expiry":"YYYY-MM-DD","elite_status":"","holder":"","duplicate_of":""}],"movements":[{"date":"YYYY-MM-DD","description":"","amount":0,"duplicate_of":""}],"flights":[{"booking_code":"","airline":"","passengers":[""],"segments":[{"origin":"","destination":"","datetime":"YYYY-MM-DD HH:mm","arrival_datetime":"","seat":""}],"miles":0,"fees":0,"duplicate_of":""}],"hotels":[{"name":"","destination":"","check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD","miles":0,"fees":0,"cash_amount":0,"booking_code":"","guests":"","duplicate_of":""}],"passengers":[{"name":"","duplicate_of":""}],"trips":[{"name":"","duplicate_of":""}]}',
        'Extraia o MÁXIMO de dados que o documento permitir — ficha completa, não só o custo em milhas.',
        'Regras por seção:',
        '- programs: programas de fidelidade com saldo de milhas/pontos, data de validade, status elite (ex.: Gold, Diamante) e titular quando o documento informar.',
        '- movements: cada movimentação de milhas/pontos listada no documento, na ordem em que aparece: date (YYYY-MM-DD), description curta e amount inteiro — positivo para ganho/crédito, negativo para gasto/débito. Sem movimentações individuais, devolver a lista vazia.',
        '- flights: CADA voo do documento (reserva de ida e volta = 1 voo com 2 segments). Para cada voo: booking_code (localizador/PNR), airline, passengers (nomes completos), segments (cada trecho: origin e destination em código IATA de 3 letras ex. GIG, CNF; datetime de partida e arrival_datetime de chegada em "YYYY-MM-DD HH:mm"; seat quando informado, ex. 3C), miles (milhas/pontos usados na compra, inteiro) e fees (taxas em reais, número — ex. 35.91).',
        '- hotels: hospedagens com nome do hotel, destination (cidade), check_in, check_out, miles (milhas usadas), fees e cash_amount (valor em reais), booking_code (localizador), guests. Hotel com pagamento em dinheiro: miles 0 e cash_amount preenchido.',
        '- passengers: os nomes de passageiros completos que aparecem no documento, mesmo que o voo/hotel já os cite.',
        '- trips: um nome curto de viagem (ex.: "Miami 2027") apenas quando o documento indicar claramente um destino/datas de viagem.',
        '- DUPLICIDADE: o texto pode começar com um resumo "Dados já cadastrados no app:". Se um item extraído corresponder a um item já cadastrado (mesmo programa; passageiro com o mesmo nome; voo com o mesmo localizador OU mesma rota+data; hospedagem com o mesmo localizador OU mesmo hotel+check_in), preencha duplicate_of do item com o texto do item já cadastrado correspondente (ex.: "passageiro: Rogerio Romero", "- passagem: GIG → CNF 2027-03-10 localizador YI2LPY"). Se não houver correspondência, duplicate_of = "".',
        '- Quando receber imagens, leia o texto visível nelas (prints do app, foto de extrato, cartão de embarque, confirmação de reserva) e extraia os mesmos dados. Se as imagens não puderem ser lidas, use apenas o texto.',
        '- NÃO inventar nenhum dado que não esteja no documento: campo ausente vira "" (ou 0 para números) e item sem dados suficientes não entra na lista.',
        '- Converter datas para YYYY-MM-DD, horários para HH:mm e valores de milhas para número inteiro sem pontos ou vírgulas. Valores em reais mantêm as casas decimais (ex.: 35.91).',
        '- IGNORAR completamente e nunca devolver números de cartão de crédito, CPF, senhas, códigos de acesso ou dados bancários.',
        '- Se o documento não contiver nada útil de milhas, voos ou hospedagens, devolver todas as listas vazias.',
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
)
