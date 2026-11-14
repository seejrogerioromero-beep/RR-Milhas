// 0029 — Coleções da base de salas VIP Santander (doc salas-vip-cartoes-santander).
// card_profiles, airports, lounges, lounge_access + campo opcional "perfil" em credit_cards.
migrate(
  (app) => {
    const ownerOnly = {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
    }

    const cardProfiles = new Collection({
      name: 'card_profiles',
      ...ownerOnly,
      fields: [
        { name: 'codigo', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'bandeira', type: 'text' },
        {
          name: 'rede',
          type: 'select',
          values: ['loungekey', 'dragonpass', 'nenhuma'],
          maxSelect: 1,
          required: true,
        },
        { name: 'acessos_ano', type: 'number', onlyInt: true },
        { name: 'convidados_ano', type: 'text' },
        { name: 'gasto_trimestral_minimo', type: 'text' },
        { name: 'anuidade', type: 'text' },
        { name: 'regras', type: 'text' },
        { name: 'outros_beneficios', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_card_profiles_codigo ON card_profiles (codigo)',
        'CREATE INDEX idx_card_profiles_rede ON card_profiles (rede)',
      ],
    })
    app.save(cardProfiles)

    const airports = new Collection({
      name: 'airports',
      ...ownerOnly,
      fields: [
        { name: 'codigo', type: 'text', required: true },
        { name: 'cidade', type: 'text' },
        { name: 'pais', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_airports_codigo ON airports (codigo)',
        'CREATE INDEX idx_airports_pais ON airports (pais)',
      ],
    })
    app.save(airports)

    const airportsId = app.findCollectionByNameOrId('airports').id

    const lounges = new Collection({
      name: 'lounges',
      ...ownerOnly,
      fields: [
        {
          name: 'aeroporto',
          type: 'relation',
          collectionId: airportsId,
          maxSelect: 1,
          required: true,
        },
        { name: 'terminal', type: 'text' },
        {
          name: 'area',
          type: 'select',
          values: ['dom', 'int', 'publica', 'dom e int', 'dom e publica'],
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: ['sala', 'sala_exclusiva', 'restaurante', 'descanso', 'spa', 'coworking'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'redes',
          type: 'select',
          values: [
            'loungekey',
            'dragonpass',
            'mastercard_black',
            'visa_infinite',
            'nenhuma',
            'a_confirmar',
          ],
          maxSelect: 3,
        },
        {
          name: 'status',
          type: 'select',
          values: [
            'confirmado',
            'a_confirmar',
            'fechado_temporariamente',
            'previsto',
            'nao_incluso',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'revisado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lounges_aeroporto ON lounges (aeroporto)',
        'CREATE INDEX idx_lounges_status ON lounges (status)',
        'CREATE INDEX idx_lounges_nome ON lounges (nome)',
      ],
    })
    app.save(lounges)

    const loungesId = app.findCollectionByNameOrId('lounges').id
    const cardProfilesId = app.findCollectionByNameOrId('card_profiles').id

    const loungeAccess = new Collection({
      name: 'lounge_access',
      ...ownerOnly,
      fields: [
        {
          name: 'sala',
          type: 'relation',
          collectionId: loungesId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'cartao',
          type: 'relation',
          collectionId: cardProfilesId,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'condicao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lounge_access_sala ON lounge_access (sala)',
        'CREATE INDEX idx_lounge_access_cartao ON lounge_access (cartao)',
      ],
    })
    app.save(loungeAccess)

    // Vincula card_profiles aos cartões já cadastrados em credit_cards (campo opcional "perfil").
    const creditCards = app.findCollectionByNameOrId('credit_cards')
    if (!creditCards.fields.getByName('perfil')) {
      creditCards.fields.add(
        new RelationField({ name: 'perfil', collectionId: cardProfilesId, maxSelect: 1 }),
      )
      app.save(creditCards)
    }
  },
  (app) => {
    try {
      const cc = app.findCollectionByNameOrId('credit_cards')
      if (cc.fields.getByName('perfil')) {
        cc.fields.removeByName('perfil')
        app.save(cc)
      }
    } catch (_) {}
    for (const name of ['lounge_access', 'lounges', 'airports', 'card_profiles']) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
