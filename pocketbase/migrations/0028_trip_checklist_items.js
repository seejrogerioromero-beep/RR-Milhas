// 0028 — Checklist de viagem. Cria `trip_checklist_items` (itens por viagem, agrupados por fase).
// Nada é semeado: os itens só são gerados pelo app quando a viagem é criada
// (ou por botão "Gerar checklist" em viagens existentes).

const CHECKLIST_FIELDS = [
  { name: 'trip', type: 'relation', required: true },
  {
    name: 'phase',
    type: 'select',
    required: true,
    values: ['antes_de_emitir', 'apos_emitir', 'semana_antes', 'dois_dias', 'dia_voo', 'volta'],
  },
  { name: 'title', type: 'text', required: true, max: 300 },
  { name: 'done', type: 'bool', required: false },
  { name: 'done_at', type: 'date', required: false },
  { name: 'sort_order', type: 'number', required: false, min: 0 },
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
    let existing = null
    try {
      existing = app.findCollectionByNameOrId('trip_checklist_items')
    } catch (_) {
      existing = null
    }
    if (existing) return

    const trips = app.findCollectionByNameOrId('trips')
    const fields = CHECKLIST_FIELDS.map((f) => {
      if (f.type === 'relation')
        return new RelationField({
          name: 'trip',
          required: true,
          collectionId: trips.id,
          maxSelect: 1,
          cascadeDelete: true,
        })
      if (f.type === 'select')
        return new SelectField({ name: f.name, required: true, values: f.values, maxSelect: 1 })
      if (f.type === 'text')
        return new TextField({ name: f.name, required: f.required, max: f.max })
      if (f.type === 'bool') return new BoolField({ name: f.name, required: false })
      if (f.type === 'date') return new DateField({ name: f.name, required: false })
      if (f.type === 'number')
        return new NumberField({ name: f.name, required: false, min: f.min, onlyInt: true })
      return new AutodateField({ name: f.name, onCreate: f.onCreate, onUpdate: f.onUpdate })
    })

    const col = new Collection({
      name: 'trip_checklist_items',
      type: 'base',
      ...AUTH_RULES,
      fields,
      indexes: [],
    })
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('trip_checklist_items')
      app.delete(col)
    } catch (_) {}
  },
)
