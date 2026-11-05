// Cria as coleções do RRMILHAS (milhas e viagens):
// programs, program_entries (extrato), flights (passagens) e hotels (hospedagens).
// As relações cruzadas são adicionadas em 0005 (convenção: coleções novas primeiro,
// relações entre novas em migration seguinte).
migrate(
  (app) => {
    const rules = "@request.auth.id != ''"

    const programs = new Collection({
      name: 'programs',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule: rules,
      updateRule: rules,
      deleteRule: rules,
      fields: [
        { name: 'name', type: 'text', required: true, max: 80 },
        { name: 'balance', type: 'number' },
        { name: 'cost_per_thousand', type: 'number' },
        { name: 'market_per_thousand', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_programs_name ON programs (name)'],
    })
    app.save(programs)

    const programEntries = new Collection({
      name: 'program_entries',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule: rules,
      updateRule: rules,
      deleteRule: rules,
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true, max: 160 },
        { name: 'quantity', type: 'number', required: true },
        { name: 'cost_per_thousand', type: 'number' },
        { name: 'date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_program_entries_date ON program_entries (date)'],
    })
    app.save(programEntries)

    const flights = new Collection({
      name: 'flights',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule: rules,
      updateRule: rules,
      deleteRule: rules,
      fields: [
        { name: 'route', type: 'text', required: true, max: 120 },
        { name: 'airline', type: 'text', max: 80 },
        { name: 'departure', type: 'date', required: true },
        {
          name: 'payment_method',
          type: 'select',
          required: true,
          values: ['milhas', 'dinheiro'],
          maxSelect: 1,
        },
        { name: 'miles_used', type: 'number' },
        { name: 'fees', type: 'number' },
        { name: 'cash_amount', type: 'number' },
        { name: 'reference_value', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_flights_departure ON flights (departure)'],
    })
    app.save(flights)

    const hotels = new Collection({
      name: 'hotels',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule: rules,
      updateRule: rules,
      deleteRule: rules,
      fields: [
        { name: 'hotel', type: 'text', required: true, max: 120 },
        { name: 'destination', type: 'text', max: 120 },
        { name: 'check_in', type: 'date', required: true },
        { name: 'check_out', type: 'date', required: true },
        { name: 'total_value', type: 'number' },
        {
          name: 'payment_method',
          type: 'select',
          required: true,
          values: ['dinheiro', 'milhas'],
          maxSelect: 1,
        },
        { name: 'miles_used', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_hotels_check_out ON hotels (check_out)'],
    })
    app.save(hotels)
  },
  (app) => {
    const names = ['hotels', 'flights', 'program_entries', 'programs']
    for (const name of names) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
