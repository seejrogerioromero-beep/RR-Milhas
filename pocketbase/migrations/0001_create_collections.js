migrate(
  (app) => {
    // Update users collection createRule to null so nobody can self-register
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.createRule = null
    app.save(users)

    // 1. tasks collection
    const tasks = new Collection({
      name: 'tasks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'notes', type: 'text', required: false, max: 2000 },
        { name: 'done', type: 'bool' },
        {
          name: 'priority',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta'],
          maxSelect: 1,
        },
        { name: 'due', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tasks_done ON tasks (done)',
        'CREATE INDEX idx_tasks_due ON tasks (due)',
        'CREATE INDEX idx_tasks_priority ON tasks (priority)',
      ],
    })
    app.save(tasks)

    // 2. transactions collection
    const transactions = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'description', type: 'text', required: true, max: 140 },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['receita', 'despesa'],
          maxSelect: 1,
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'salario',
            'moradia',
            'alimentacao',
            'transporte',
            'saude',
            'lazer',
            'educacao',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transactions_date ON transactions (date)',
        'CREATE INDEX idx_transactions_type ON transactions (type)',
        'CREATE INDEX idx_transactions_category ON transactions (category)',
      ],
    })
    app.save(transactions)

    // 3. notes collection
    const notes = new Collection({
      name: 'notes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'content', type: 'text', required: true, max: 10000 },
        { name: 'pinned', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notes_pinned ON notes (pinned)',
        'CREATE INDEX idx_notes_updated ON notes (updated)',
      ],
    })
    app.save(notes)

    // 4. habits collection
    const habits = new Collection({
      name: 'habits',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true, max: 60 },
        { name: 'icon', type: 'text', required: true, max: 16 },
        {
          name: 'color',
          type: 'select',
          required: true,
          values: ['verde', 'ambar', 'azul', 'coral'],
          maxSelect: 1,
        },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(habits)

    const habitsId = app.findCollectionByNameOrId('habits').id

    // 5. habit_logs collection
    const habitLogs = new Collection({
      name: 'habit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'habit',
          type: 'relation',
          required: true,
          collectionId: habitsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_habit_logs_unique ON habit_logs (habit, date)',
        'CREATE INDEX idx_habit_logs_date ON habit_logs (date)',
      ],
    })
    app.save(habitLogs)
  },
  (app) => {
    try {
      const habitLogs = app.findCollectionByNameOrId('habit_logs')
      app.delete(habitLogs)
    } catch (_) {}
    try {
      const habits = app.findCollectionByNameOrId('habits')
      app.delete(habits)
    } catch (_) {}
    try {
      const notes = app.findCollectionByNameOrId('notes')
      app.delete(notes)
    } catch (_) {}
    try {
      const transactions = app.findCollectionByNameOrId('transactions')
      app.delete(transactions)
    } catch (_) {}
    try {
      const tasks = app.findCollectionByNameOrId('tasks')
      app.delete(tasks)
    } catch (_) {}
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.createRule = ''
      app.save(users)
    } catch (_) {}
  },
)
