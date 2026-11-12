// 0015: campos de validade de milhas e status elite no programa (rodada AwardWallet).
// Idempotente: só adiciona o campo se ele ainda não existir.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('programs')

    if (!col.fields.getByName('miles_expiry')) {
      col.fields.add(new DateField({ name: 'miles_expiry' }))
    }
    if (!col.fields.getByName('elite_status')) {
      col.fields.add(new TextField({ name: 'elite_status', max: 40 }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('programs')

    if (col.fields.getByName('miles_expiry')) {
      col.fields.removeByName('miles_expiry')
    }
    if (col.fields.getByName('elite_status')) {
      col.fields.removeByName('elite_status')
    }

    app.save(col)
  },
)
