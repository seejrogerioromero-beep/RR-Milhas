// Adiciona as relações cruzadas entre as coleções novas do RRMILHAS:
// program_entries.program -> programs (obrigatória, cascade)
// flights.program -> programs (opcional), flights.entry -> program_entries (cascade)
// hotels.program -> programs (opcional), hotels.entry -> program_entries (cascade)
migrate(
  (app) => {
    const programsId = app.findCollectionByNameOrId('programs').id
    const entriesId = app.findCollectionByNameOrId('program_entries').id

    const entriesCol = app.findCollectionByNameOrId('program_entries')
    if (!entriesCol.fields.getByName('program')) {
      entriesCol.fields.add(
        new RelationField({
          name: 'program',
          required: true,
          collectionId: programsId,
          cascadeDelete: true,
          maxSelect: 1,
        }),
      )
    }
    entriesCol.addIndex('idx_program_entries_program', false, 'program', '')
    app.save(entriesCol)

    const flightsCol = app.findCollectionByNameOrId('flights')
    if (!flightsCol.fields.getByName('program')) {
      flightsCol.fields.add(
        new RelationField({ name: 'program', collectionId: programsId, maxSelect: 1 }),
      )
    }
    if (!flightsCol.fields.getByName('entry')) {
      flightsCol.fields.add(
        new RelationField({
          name: 'entry',
          collectionId: entriesId,
          cascadeDelete: true,
          maxSelect: 1,
        }),
      )
    }
    app.save(flightsCol)

    const hotelsCol = app.findCollectionByNameOrId('hotels')
    if (!hotelsCol.fields.getByName('program')) {
      hotelsCol.fields.add(
        new RelationField({ name: 'program', collectionId: programsId, maxSelect: 1 }),
      )
    }
    if (!hotelsCol.fields.getByName('entry')) {
      hotelsCol.fields.add(
        new RelationField({
          name: 'entry',
          collectionId: entriesId,
          cascadeDelete: true,
          maxSelect: 1,
        }),
      )
    }
    app.save(hotelsCol)
  },
  (app) => {
    const strip = (name, fieldNames) => {
      try {
        const col = app.findCollectionByNameOrId(name)
        for (const fieldName of fieldNames) {
          const field = col.fields.getByName(fieldName)
          if (field) {
            col.fields.removeByName(fieldName)
          }
        }
        app.save(col)
      } catch (_) {}
    }
    strip('hotels', ['entry', 'program'])
    strip('flights', ['entry', 'program'])
    strip('program_entries', ['program'])
  },
)
