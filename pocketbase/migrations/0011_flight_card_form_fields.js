// Migration 0011 — campos novos para os formulários fiéis aos prints.
// Idempotente: só adiciona o campo se ele ainda não existir.
//
// flights: booking_code, status, origin, destination, cabin, roundtrip,
//          outbound_date, outbound_departure, outbound_arrival,
//          return_date, return_departure, return_arrival,
//          layovers, passengers, milheiro_custom, issued_at, notes
// credit_cards: pontos_por_real, anuidade, fechamento, ativo

migrate(
  (app) => {
    const flightFields = [
      { name: 'booking_code', type: 'text', max: 20 },
      {
        name: 'status',
        type: 'select',
        values: ['confirmada', 'em_espera', 'cancelada', 'utilizada'],
        maxSelect: 1,
      },
      { name: 'origin', type: 'text', max: 10 },
      { name: 'destination', type: 'text', max: 10 },
      {
        name: 'cabin',
        type: 'select',
        values: ['economica', 'premium', 'executiva', 'primeira'],
        maxSelect: 1,
      },
      { name: 'roundtrip', type: 'bool' },
      { name: 'outbound_date', type: 'date' },
      { name: 'outbound_departure', type: 'text', max: 5 },
      { name: 'outbound_arrival', type: 'text', max: 5 },
      { name: 'return_date', type: 'date' },
      { name: 'return_departure', type: 'text', max: 5 },
      { name: 'return_arrival', type: 'text', max: 5 },
      { name: 'layovers', type: 'text', max: 300 },
      { name: 'passengers', type: 'text', max: 500 },
      { name: 'milheiro_custom', type: 'number' },
      { name: 'issued_at', type: 'date' },
      { name: 'notes', type: 'text', max: 2000 },
    ]

    const col = app.findCollectionByNameOrId('flights')
    for (const f of flightFields) {
      if (!col.fields.getByName(f.name)) {
        col.fields.add(newField(f))
      }
    }
    app.save(col)

    const cardFields = [
      { name: 'pontos_por_real', type: 'number' },
      { name: 'anuidade', type: 'number' },
      { name: 'fechamento', type: 'text', max: 20 },
      { name: 'ativo', type: 'bool' },
    ]
    const cards = app.findCollectionByNameOrId('credit_cards')
    for (const f of cardFields) {
      if (!cards.fields.getByName(f.name)) {
        cards.fields.add(newField(f))
      }
    }
    app.save(cards)
  },
  (app) => {
    const flights = app.findCollectionByNameOrId('flights')
    const flightNames = [
      'booking_code',
      'status',
      'origin',
      'destination',
      'cabin',
      'roundtrip',
      'outbound_date',
      'outbound_departure',
      'outbound_arrival',
      'return_date',
      'return_departure',
      'return_arrival',
      'layovers',
      'passengers',
      'milheiro_custom',
      'issued_at',
      'notes',
    ]
    for (const n of flightNames) {
      const field = flights.fields.getByName(n)
      if (field) flights.fields.removeByName(n)
    }
    app.save(flights)

    const cards = app.findCollectionByNameOrId('credit_cards')
    for (const n of ['pontos_por_real', 'anuidade', 'fechamento', 'ativo']) {
      const field = cards.fields.getByName(n)
      if (field) cards.fields.removeByName(n)
    }
    app.save(cards)
  },
)

function newField(f) {
  if (f.type === 'number') return new NumberField({ name: f.name, onlyInt: false })
  if (f.type === 'bool') return new BoolField({ name: f.name })
  if (f.type === 'date') return new DateField({ name: f.name })
  if (f.type === 'select') {
    return new SelectField({ name: f.name, values: f.values, maxSelect: 1 })
  }
  return new TextField({ name: f.name, max: f.max })
}
