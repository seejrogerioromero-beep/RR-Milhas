// 0016 — Módulo Viagens + Pontos esperados (rodada 2, AwardWallet-like).
// Cria `trips` (viagens) e `expected_points` (milhas a chegar). Idempotente:
// se a collection já existir (create parcial anterior), adiciona os campos que faltam.
// Nada é semeado — o app usa estado vazio "COMECE AQUI" no banco limpo.

const TRIPS_FIELDS = [
  { name: 'name', type: 'text', required: true, min: 1, max: 160 },
  { name: 'destination', type: 'text', required: false, max: 160 },
  { name: 'start_date', type: 'date', required: false },
  { name: 'end_date', type: 'date', required: false },
  { name: 'notes', type: 'text', required: false, max: 2000 },
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

const EXPECTED_FIELDS = [
  { name: 'program', type: 'relation', required: true, collectionId: '', maxSelect: 1 },
  { name: 'miles', type: 'number', required: false, min: 0 },
  { name: 'description', type: 'text', required: false, max: 2000 },
  { name: 'expected_date', type: 'date', required: false },
  {
    name: 'status',
    type: 'select',
    required: true,
    values: ['pendente', 'confirmado'],
    maxSelect: 1,
  },
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

const AUTH_RULES = {
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.id != ''",
  deleteRule: "@request.auth.id != ''",
}

migrate(
  (app) => {
    // Resolve o id da collection programs para a relation de expected_points.
    let programsId = ''
    try {
      programsId = app.findCollectionByNameOrId('programs').id
    } catch (_) {
      programsId = ''
    }

    // ---- trips ----
    let trips = null
    try {
      trips = app.findCollectionByNameOrId('trips')
    } catch (_) {
      trips = null
    }
    if (!trips) {
      const fields = TRIPS_FIELDS.map((f) => ({ ...f }))
      trips = new Collection({
        name: 'trips',
        type: 'base',
        ...AUTH_RULES,
        fields,
        indexes: [],
      })
      app.save(trips)
      trips = app.findCollectionByNameOrId('trips')
    } else {
      for (const f of TRIPS_FIELDS) {
        if (!trips.fields.getByName(f.name)) {
          if (f.type === 'text')
            trips.fields.add(new TextField({ name: f.name, required: f.required, max: f.max }))
          else if (f.type === 'date')
            trips.fields.add(new DateField({ name: f.name, required: f.required }))
          else if (f.type === 'autodate')
            trips.fields.add(
              new AutodateField({ name: f.name, onCreate: f.onCreate, onUpdate: f.onUpdate }),
            )
        }
      }
      app.save(trips)
    }

    // ---- flights.trip (texto livre, casa pelo nome com trips.name) ----
    const flightsCol = app.findCollectionByNameOrId('flights')
    if (!flightsCol.fields.getByName('trip')) {
      flightsCol.fields.add(new TextField({ name: 'trip', required: false, max: 160 }))
      app.save(flightsCol)
    }

    // ---- expected_points ----
    let ep = null
    try {
      ep = app.findCollectionByNameOrId('expected_points')
    } catch (_) {
      ep = null
    }
    if (!ep) {
      const fields = EXPECTED_FIELDS.map((f) =>
        f.name === 'program' ? { ...f, collectionId: programsId } : { ...f },
      )
      ep = new Collection({
        name: 'expected_points',
        type: 'base',
        ...AUTH_RULES,
        fields,
        indexes: [],
      })
      app.save(ep)
    } else {
      for (const f of EXPECTED_FIELDS) {
        if (!ep.fields.getByName(f.name)) {
          if (f.type === 'relation')
            ep.fields.add(
              new RelationField({
                name: 'program',
                required: true,
                collectionId: programsId,
                maxSelect: 1,
              }),
            )
          else if (f.type === 'number')
            ep.fields.add(new NumberField({ name: f.name, required: f.required, min: f.min }))
          else if (f.type === 'text')
            ep.fields.add(new TextField({ name: f.name, required: f.required, max: f.max }))
          else if (f.type === 'date')
            ep.fields.add(new DateField({ name: f.name, required: f.required }))
          else if (f.type === 'select')
            ep.fields.add(
              new SelectField({ name: f.name, required: true, values: f.values, maxSelect: 1 }),
            )
          else if (f.type === 'autodate')
            ep.fields.add(
              new AutodateField({ name: f.name, onCreate: f.onCreate, onUpdate: f.onUpdate }),
            )
        }
      }
      app.save(ep)
    }
  },
  (app) => {
    try {
      const ep = app.findCollectionByNameOrId('expected_points')
      app.delete(ep)
    } catch (_) {}
    try {
      const trips = app.findCollectionByNameOrId('trips')
      app.delete(trips)
    } catch (_) {}
  },
)
