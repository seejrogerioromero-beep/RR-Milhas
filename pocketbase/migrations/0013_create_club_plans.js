// Migration 0013 — planos de clube (mensalidade/anuidade de programas como Livelo, Smiles etc.).
// Idempotente: só cria a coleção se ela ainda não existir.
migrate(
  (app) => {
    if (app.hasTable('club_plans')) return

    const rules = "@request.auth.id != ''"
    const programs = app.findCollectionByNameOrId('programs')

    const plans = new Collection({
      name: 'club_plans',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule: rules,
      updateRule: rules,
      deleteRule: rules,
      fields: [
        {
          name: 'program',
          type: 'relation',
          required: true,
          collectionId: programs.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'plan_name', type: 'text', required: true, max: 120 },
        { name: 'points_per_month', type: 'number', min: 0 },
        { name: 'billing_day', type: 'number', min: 1, max: 31 },
        {
          name: 'billing',
          type: 'select',
          required: true,
          values: ['mensal', 'anual'],
          maxSelect: 1,
        },
        { name: 'monthly_value', type: 'number', min: 0 },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(plans)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('club_plans'))
    } catch (_) {}
  },
)
