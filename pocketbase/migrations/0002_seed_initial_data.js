migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Helper date format: YYYY-MM-DD 12:00:00.000Z
    const formatDate = (daysAgo) => {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - daysAgo)
      const yr = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${yr}-${mo}-${day} 12:00:00.000Z`
    }

    const formatDateOnly = (daysFromNow) => {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() + daysFromNow)
      const yr = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${yr}-${mo}-${day} 12:00:00.000Z`
    }

    // 1. Seed user: seej.rogerio.romero@gmail.com / Skip@Pass
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'seej.rogerio.romero@gmail.com')
    } catch (_) {
      const userRec = new Record(users)
      userRec.setEmail('seej.rogerio.romero@gmail.com')
      userRec.setPassword('Skip@Pass')
      userRec.setVerified(true)
      userRec.set('name', 'Rogério Romero')
      app.save(userRec)
    }

    // 2. Seed Tasks (5 realistic tasks)
    const tasksCol = app.findCollectionByNameOrId('tasks')
    const existingTasks = app.countRecords('tasks')
    if (existingTasks === 0) {
      const sampleTasks = [
        {
          title: 'Renovar licença do carro',
          notes: 'Verificar taxas pendentes e agendar vistoria no Detran online.',
          done: false,
          priority: 'alta',
          due: formatDateOnly(2),
        },
        {
          title: 'Marcar consulta oftalmologista',
          notes: 'Levar exame antigo e receitas anteriores.',
          done: false,
          priority: 'media',
          due: formatDateOnly(5),
        },
        {
          title: 'Pagar conta de luz',
          notes: 'Vencimento hoje pelo aplicativo bancário.',
          done: false,
          priority: 'alta',
          due: formatDateOnly(0),
        },
        {
          title: 'Comprar presente de aniversário da Ana',
          notes: 'Livro de design ou fone bluetooth que ela comentou.',
          done: false,
          priority: 'baixa',
          due: formatDateOnly(7),
        },
        {
          title: 'Revisar plano de saúde',
          notes: 'Comparar coparticipação e nova tabela de valores anuais.',
          done: true,
          priority: 'media',
          due: formatDateOnly(-2),
        },
      ]

      for (const t of sampleTasks) {
        const rec = new Record(tasksCol)
        rec.set('title', t.title)
        rec.set('notes', t.notes)
        rec.set('done', t.done)
        rec.set('priority', t.priority)
        rec.set('due', t.due)
        app.save(rec)
      }
    }

    // 3. Seed Transactions (8 transactions across last month: 1 receita salario, 7 despesas)
    const txCol = app.findCollectionByNameOrId('transactions')
    const existingTx = app.countRecords('transactions')
    if (existingTx === 0) {
      const sampleTx = [
        {
          description: 'Salário mensal OVV Tech',
          amount: 8500.0,
          type: 'receita',
          category: 'salario',
          date: formatDate(15),
        },
        {
          description: 'Aluguel e condomínio',
          amount: 2450.0,
          type: 'despesa',
          category: 'moradia',
          date: formatDate(14),
        },
        {
          description: 'Supermercado Mensal Pão de Açúcar',
          amount: 980.5,
          type: 'despesa',
          category: 'alimentacao',
          date: formatDate(12),
        },
        {
          description: 'Abastecimento Carro Posto Shell',
          amount: 280.0,
          type: 'despesa',
          category: 'transporte',
          date: formatDate(9),
        },
        {
          description: 'Farmácia Droga Raia - Vitaminas',
          amount: 145.9,
          type: 'despesa',
          category: 'saude',
          date: formatDate(7),
        },
        {
          description: 'Jantar Restaurante Cantina Bella',
          amount: 210.0,
          type: 'despesa',
          category: 'lazer',
          date: formatDate(4),
        },
        {
          description: 'Internet Fibra Óptica 600MB',
          amount: 139.9,
          type: 'despesa',
          category: 'moradia',
          date: formatDate(3),
        },
        {
          description: 'Feira Orgânica do Parque',
          amount: 85.0,
          type: 'despesa',
          category: 'alimentacao',
          date: formatDate(1),
        },
      ]

      for (const tx of sampleTx) {
        const rec = new Record(txCol)
        rec.set('description', tx.description)
        rec.set('amount', tx.amount)
        rec.set('type', tx.type)
        rec.set('category', tx.category)
        rec.set('date', tx.date)
        app.save(rec)
      }
    }

    // 4. Seed Notes (3 realistic notes)
    const notesCol = app.findCollectionByNameOrId('notes')
    const existingNotes = app.countRecords('notes')
    if (existingNotes === 0) {
      const sampleNotes = [
        {
          title: 'Senhas e acessos',
          content:
            'Chave Pix pessoal: ver celular principal.\nCódigo do cofre residencial: anotado na pasta azul.\nBackup Bitwarden atualizado no drive criptografado.',
          pinned: true,
        },
        {
          title: 'Ideias de viagem',
          content:
            'Roteiro Chapada Diamantina:\n- Trilha da Cachoeira da Fumaça\n- Pernoite em Lençóis\n- Levar calçado com tração e capa impermeável.\nÉpoca ideal: entre maio e setembro.',
          pinned: true,
        },
        {
          title: 'Contatos importantes',
          content:
            'Eletricista Marcos: (11) 98765-4321\nMecânica AutoCenter Roberto: (11) 97654-3210\nSeguro residencial apólice: #8829-BR',
          pinned: false,
        },
      ]

      for (const n of sampleNotes) {
        const rec = new Record(notesCol)
        rec.set('title', n.title)
        rec.set('content', n.content)
        rec.set('pinned', n.pinned)
        app.save(rec)
      }
    }

    // 5. Seed Habits and Habit Logs (3 habits with logs for last 7 days)
    const habitsCol = app.findCollectionByNameOrId('habits')
    const logsCol = app.findCollectionByNameOrId('habit_logs')
    const existingHabits = app.countRecords('habits')

    if (existingHabits === 0) {
      const habitWater = new Record(habitsCol)
      habitWater.set('name', 'Beber 2L de água')
      habitWater.set('icon', 'droplet')
      habitWater.set('color', 'verde')
      habitWater.set('active', true)
      app.save(habitWater)

      const habitRead = new Record(habitsCol)
      habitRead.set('name', 'Ler 20 minutos')
      habitRead.set('icon', 'book-open')
      habitRead.set('color', 'ambar')
      habitRead.set('active', true)
      app.save(habitRead)

      const habitWalk = new Record(habitsCol)
      habitWalk.set('name', 'Caminhar 30 min')
      habitWalk.set('icon', 'footprints')
      habitWalk.set('color', 'azul')
      habitWalk.set('active', true)
      app.save(habitWalk)

      // Habit logs pattern:
      // water: 6/7 days (days 0, 1, 2, 3, 5, 6 ago)
      const waterDays = [0, 1, 2, 3, 5, 6]
      for (const d of waterDays) {
        const log = new Record(logsCol)
        log.set('habit', habitWater.id)
        log.set('date', formatDate(d))
        app.save(log)
      }

      // reading: 4/7 days (days 0, 1, 3, 4 ago)
      const readDays = [0, 1, 3, 4]
      for (const d of readDays) {
        const log = new Record(logsCol)
        log.set('habit', habitRead.id)
        log.set('date', formatDate(d))
        app.save(log)
      }

      // walking: 5/7 days (days 0, 2, 3, 4, 6 ago)
      const walkDays = [0, 2, 3, 4, 6]
      for (const d of walkDays) {
        const log = new Record(logsCol)
        log.set('habit', habitWalk.id)
        log.set('date', formatDate(d))
        app.save(log)
      }
    }
  },
  (app) => {
    // down migration
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'seej.rogerio.romero@gmail.com')
      app.delete(user)
    } catch (_) {}
  },
)
