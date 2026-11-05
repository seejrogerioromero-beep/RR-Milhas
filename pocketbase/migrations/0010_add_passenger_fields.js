// Migration 0010: campos do cadastro completo de passageiros (formulário "Novo passageiro").
// Idempotente: só adiciona o campo se ele ainda não existir na collection.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('passengers')

    if (!col.fields.getByName('cpf')) {
      col.fields.add(new TextField({ name: 'cpf', max: 14 }))
    }
    if (!col.fields.getByName('tem_passaporte')) {
      col.fields.add(new BoolField({ name: 'tem_passaporte' }))
    }
    if (!col.fields.getByName('numero_passaporte')) {
      col.fields.add(new TextField({ name: 'numero_passaporte', max: 40 }))
    }
    if (!col.fields.getByName('pais_emissor')) {
      col.fields.add(new TextField({ name: 'pais_emissor', max: 80 }))
    }
    if (!col.fields.getByName('emissao')) {
      col.fields.add(new DateField({ name: 'emissao' }))
    }
    if (!col.fields.getByName('validade')) {
      col.fields.add(new DateField({ name: 'validade' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('passengers')
    ;['validade', 'emissao', 'pais_emissor', 'numero_passaporte', 'tem_passaporte', 'cpf'].forEach(
      (f) => {
        try {
          col.fields.removeByName(f)
        } catch (_) {}
      },
    )
    app.save(col)
  },
)
