/// <reference path="../pb_data/types.d.ts" />
// Agente nativo Skip Cloud que extrai dados estruturados de extratos, e-mails e
// prints de programas de milhas. Sem tools e sem memória: extração single-turn.
migrate(
  (app) => {
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
  (app) => {
    $ai.agents.delete(app, 'import-extrator')
  },
)
