// Migration 0012 — campos do formulário "Nova hospedagem" fiel ao print.
// Idempotente: só adiciona o campo se ele ainda não existir.
//
// hotels: booking_code, status, country, room, guests, trip, fees,
//         reference_value, milheiro_custom, issued_at, notes
// (destination = cidade; total_value = valor pago em dinheiro; já existiam)

migrate(
  (app) => {
    const hotelFields = [
      { name: 'booking_code', type: 'text', max: 20 },
      {
        name: 'status',
        type: 'select',
        values: ['confirmada', 'em_espera', 'cancelada', 'utilizada'],
        maxSelect: 1,
      },
      { name: 'country', type: 'text', max: 80 },
      { name: 'room', type: 'text', max: 120 },
      { name: 'guests', type: 'text', max: 500 },
      { name: 'trip', type: 'text', max: 120 },
      { name: 'fees', type: 'number' },
      { name: 'reference_value', type: 'number' },
      { name: 'milheiro_custom', type: 'number' },
      { name: 'issued_at', type: 'date' },
      { name: 'notes', type: 'text', max: 2000 },
    ]

    const col = app.findCollectionByNameOrId('hotels')
    for (const f of hotelFields) {
      if (!col.fields.getByName(f.name)) {
        col.fields.add(newField(f))
      }
    }
    app.save(col)
  },
  (app) => {
    const hotels = app.findCollectionByNameOrId('hotels')
    const names = [
      'booking_code',
      'status',
      'country',
      'room',
      'guests',
      'trip',
      'fees',
      'reference_value',
      'milheiro_custom',
      'issued_at',
      'notes',
    ]
    for (const n of names) {
      const field = hotels.fields.getByName(n)
      if (field) hotels.fields.removeByName(n)
    }
    app.save(hotels)
  },
)

function newField(f) {
  if (f.type === 'number') return new NumberField({ name: f.name, onlyInt: false })
  if (f.type === 'date') return new DateField({ name: f.name })
  if (f.type === 'select') {
    return new SelectField({ name: f.name, values: f.values, maxSelect: 1 })
  }
  return new TextField({ name: f.name, max: f.max })
}
