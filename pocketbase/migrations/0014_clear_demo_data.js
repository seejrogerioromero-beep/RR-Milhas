// Limpeza dos dados de demonstração semeados pelas migrations 0002 e 0006.
// Idempotente: em banco vazio é no-op. Preserva o usuário dono e as collections/campos.
// Reaplica as regras de negócio de saldo/custo médio (os programas voltam a 0).
migrate(
  (app) => {
    // Coleções de dados semeados — limpar tudo, sempre (só há dados de exemplo nelas).
    const truncate = (name) => {
      try {
        if (!app.hasTable(name)) return
        const col = app.findCollectionByNameOrId(name)
        if (app.countRecords(name) > 0) {
          app.truncateCollection(col)
          console.log(`0014: ${name} limpa`)
        }
      } catch (err) {
        throw new Error(`0014: falha ao limpar ${name}: ${err}`)
      }
    }

    // Ordem segura: filhos antes dos pais (relações).
    truncate('habit_logs')
    truncate('habits')
    truncate('program_entries')
    truncate('flights')
    truncate('hotels')
    truncate('programs')
    truncate('passengers')
    truncate('vip_lounges')
    truncate('credit_cards')
    truncate('club_plans')
    truncate('tasks')
    truncate('transactions')
    truncate('notes')

    // O usuário dono criado em 0002 é preservado — nada a fazer aqui (não tocamos em users).

    // Sanity check: o dono continua autenticável.
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'seej.rogerio.romero@gmail.com')
      console.log('0014: dono seej.rogerio.romero@gmail.com preservado')
    } catch (_) {
      console.log('0014: aviso — usuário dono não encontrado (banco recém-criado?)')
    }
  },
  (app) => {
    // down: nada a restaurar — os seeds originais (0002/0006) podem reaplicar se necessário.
  },
)
