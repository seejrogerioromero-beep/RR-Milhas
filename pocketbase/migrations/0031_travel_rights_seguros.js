// 0031 — Aba "Se algo der errado": collections travel_rights (ANAC 400 / US DOT)
// e insurance_coverage (Visa Infinite / Mastercard Black). Schema apenas —
// o seed de dados está na 0032 (padrão do projeto: cria numa, semeia na seguinte).
// Também libera a fase 'documentos_seguros' no select phase de trip_checklist_items (0028).

const ownerOnly = {
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.id != ''",
  deleteRule: "@request.auth.id != ''",
}

migrate(
  (app) => {
    const travelRights = new Collection({
      name: 'travel_rights',
      ...ownerOnly,
      fields: [
        { name: 'pais', type: 'select', required: true, values: ['BR', 'US'], maxSelect: 1 },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['atraso', 'cancelamento', 'pretericao', 'bagagem', 'medico'],
          maxSelect: 1,
        },
        { name: 'gatilho', type: 'text', required: true, max: 300 },
        { name: 'direito', type: 'text', required: true, max: 2000 },
        { name: 'prazo', type: 'text', max: 300 },
        { name: 'observacao', type: 'text', max: 4000 },
        { name: 'fonte', type: 'text', max: 300 },
        { name: 'revisado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_travel_rights_pais ON travel_rights (pais)',
        'CREATE INDEX idx_travel_rights_categoria ON travel_rights (categoria)',
      ],
    })
    app.save(travelRights)

    const insuranceCoverage = new Collection({
      name: 'insurance_coverage',
      ...ownerOnly,
      fields: [
        {
          name: 'bandeira',
          type: 'select',
          required: true,
          values: ['visa_infinite', 'mastercard_black'],
          maxSelect: 1,
        },
        { name: 'cobertura', type: 'text', required: true, max: 300 },
        { name: 'limite_usd', type: 'text', max: 300 },
        { name: 'emissao', type: 'text', max: 500 },
        { name: 'telefone_br', type: 'text', max: 200 },
        { name: 'telefone_exterior', type: 'text', max: 500 },
        { name: 'condicao', type: 'text', max: 2000 },
        { name: 'revisado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_insurance_bandeira ON insurance_coverage (bandeira)'],
    })
    app.save(insuranceCoverage)

    // Libera a fase 'documentos_seguros' na checklist de viagem.
    try {
      const col = app.findCollectionByNameOrId('trip_checklist_items')
      const field = col.fields.getByName('phase')
      if (field && field.values && field.values.indexOf('documentos_seguros') === -1) {
        field.values.push('documentos_seguros')
        app.save(col)
      }
    } catch (err) {
      console.error('0031 ensureDocumentsPhase:', err)
    }
  },
  (app) => {
    for (const name of ['insurance_coverage', 'travel_rights']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
