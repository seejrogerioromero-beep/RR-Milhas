// Correção de escala: o custo do milheiro deve ser R$ por 1.000 milhas (ex.: 64,70),
// mas o seed gravou o custo por milha individual (0,0647). Multiplica por 1000 apenas
// onde o valor ficou na escala errada (< 1), o que torna a migração idempotente.
migrate(
  (app) => {
    app
      .db()
      .newQuery(
        'UPDATE programs SET cost_per_thousand = cost_per_thousand * 1000 WHERE cost_per_thousand > 0 AND cost_per_thousand < 1',
      )
      .execute()
    app
      .db()
      .newQuery(
        'UPDATE program_entries SET cost_per_thousand = cost_per_thousand * 1000 WHERE cost_per_thousand > 0 AND cost_per_thousand < 1',
      )
      .execute()
  },
  (app) => {
    app
      .db()
      .newQuery(
        'UPDATE programs SET cost_per_thousand = cost_per_thousand / 1000 WHERE cost_per_thousand >= 1',
      )
      .execute()
    app
      .db()
      .newQuery(
        'UPDATE program_entries SET cost_per_thousand = cost_per_thousand / 1000 WHERE cost_per_thousand >= 1',
      )
      .execute()
  },
)
