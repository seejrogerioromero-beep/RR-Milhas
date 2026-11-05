// Flag de clube/banco nos programas (origem de transferência) e coleção de cartões de crédito.
// Idempotente: só altera/cria se ainda não existir.
migrate(
  (app) => {
    const rules = "@request.auth.id != ''"

    // 1) programs.is_club — bool opcional (ausente = false)
    const programs = app.findCollectionByNameOrId('programs')
    if (!programs.fields.getByName('is_club')) {
      programs.fields.add(new BoolField({ name: 'is_club' }))
      app.save(programs)
    }

    // 2) credit_cards — cartões de crédito com programa de pontos associado
    if (!app.hasTable('credit_cards')) {
      const programColId = app.findCollectionByNameOrId('programs').id
      const cards = new Collection({
        name: 'credit_cards',
        type: 'base',
        listRule: rules,
        viewRule: rules,
        createRule: rules,
        updateRule: rules,
        deleteRule: rules,
        fields: [
          { name: 'name', type: 'text', required: true, max: 80 },
          { name: 'brand', type: 'text', max: 40 },
          { name: 'program', type: 'relation', collectionId: programColId, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_credit_cards_name ON credit_cards (name)'],
      })
      app.save(cards)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('credit_cards'))
    } catch (_) {}
    try {
      const programs = app.findCollectionByNameOrId('programs')
      if (programs.fields.getByName('is_club')) {
        programs.fields.removeByName('is_club')
        app.save(programs)
      }
    } catch (_) {}
  },
)
