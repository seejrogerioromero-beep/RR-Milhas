// Cria as coleções das ferramentas: passageiros e salas VIP.
// Idempotente: só cria se a coleção ainda não existir.
migrate(
  (app) => {
    const rules = "@request.auth.id != ''"

    if (!app.hasTable('passengers')) {
      const passengers = new Collection({
        name: 'passengers',
        type: 'base',
        listRule: rules,
        viewRule: rules,
        createRule: rules,
        updateRule: rules,
        deleteRule: rules,
        fields: [
          { name: 'name', type: 'text', required: true, max: 120 },
          { name: 'document', type: 'text', max: 40 },
          { name: 'birth_date', type: 'date' },
          { name: 'notes', type: 'text', max: 300 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_passengers_name ON passengers (name)'],
      })
      app.save(passengers)
    }

    if (!app.hasTable('vip_lounges')) {
      const lounges = new Collection({
        name: 'vip_lounges',
        type: 'base',
        listRule: rules,
        viewRule: rules,
        createRule: rules,
        updateRule: rules,
        deleteRule: rules,
        fields: [
          { name: 'airport', type: 'text', required: true, max: 120 },
          { name: 'access', type: 'text', max: 160 },
          { name: 'notes', type: 'text', max: 300 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_vip_lounges_airport ON vip_lounges (airport)'],
      })
      app.save(lounges)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('vip_lounges'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('passengers'))
    } catch (_) {}
  },
)
