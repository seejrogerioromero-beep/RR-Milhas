// Seed idempotente do RRMILHAS: 2 programas (Smiles, LATAM Pass) com extrato,
// 1 passagem futura paga com milhas (débito no extrato), 1 passagem passada em dinheiro
// e 1 hospedagem futura. Idempotente: nada é criado se já houver programas.
migrate(
  (app) => {
    if (app.countRecords('programs') > 0) return

    let ownerId = ''
    try {
      const owner = app.findFirstRecordByFilter('users', "email = 'seej.rogerio.romero@gmail.com'")
      ownerId = owner.id
    } catch (_) {
      return // sem dono semeado, nada a vincular
    }

    const pad = (n) => String(n).padStart(2, '0')
    const dateStr = (offsetDays, hour) => {
      const d = new Date()
      d.setDate(d.getDate() + offsetDays)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hour}:00.000Z`
    }

    const createProgram = (name, market) => {
      const rec = new Record(app.findCollectionByNameOrId('programs'))
      rec.set('name', name)
      rec.set('balance', 0)
      rec.set('cost_per_thousand', 0)
      rec.set('market_per_thousand', market)
      app.save(rec)
      return rec
    }

    const addEntry = (program, type, description, quantity, costPerThousand, date) => {
      const rec = new Record(app.findCollectionByNameOrId('program_entries'))
      rec.set('program', program.id)
      rec.set('type', type)
      rec.set('description', description)
      rec.set('quantity', quantity)
      if (costPerThousand !== null && costPerThousand !== undefined) {
        rec.set('cost_per_thousand', costPerThousand)
      }
      rec.set('date', date)
      app.save(rec)

      let balance = program.getFloat('balance')
      let avgCost = program.getFloat('cost_per_thousand')
      if (type === 'entrada') {
        const totalCost = (balance * avgCost + (quantity / 1000) * costPerThousand) / 1000
        const totalMiles = (balance + quantity) / 1000
        avgCost = totalMiles > 0 ? totalCost / totalMiles : 0
        balance += quantity
      } else {
        balance -= quantity
      }
      program.set('balance', balance)
      program.set('cost_per_thousand', Math.round(avgCost * 100) / 100)
      app.save(program)
      return rec
    }

    // --- Smiles ---
    const smiles = createProgram('Smiles', 72.0)
    addEntry(
      smiles,
      'entrada',
      'Bônus de contratação do clube Smiles',
      20000,
      60.0,
      dateStr(-90, '10:00'),
    )
    addEntry(
      smiles,
      'entrada',
      'Transferência de pontos do cartão',
      12000,
      72.5,
      dateStr(-40, '09:30'),
    )

    // --- LATAM Pass ---
    const latam = createProgram('LATAM Pass', 45.0)
    addEntry(latam, 'entrada', 'Compra direta de milhas', 15000, 35.0, dateStr(-60, '11:00'))
    addEntry(
      latam,
      'entrada',
      'Bônus de transferência do cartão',
      10000,
      45.0,
      dateStr(-20, '16:00'),
    )

    // --- Passagem futura paga com milhas (debite o extrato do Smiles) ---
    const flightsCol = app.findCollectionByNameOrId('flights')
    const smileAvg = smiles.getFloat('cost_per_thousand')
    const entry = new Record(app.findCollectionByNameOrId('program_entries'))
    entry.set('program', smiles.id)
    entry.set('type', 'saida')
    entry.set('description', 'Passagem GRU → MAD (emissão Smiles)')
    entry.set('quantity', 25000)
    entry.set('cost_per_thousand', smileAvg)
    entry.set('date', dateStr(-5, '14:00'))
    app.save(entry)
    smiles.set('balance', smiles.getFloat('balance') - 25000)
    app.save(smiles)

    const flight = new Record(flightsCol)
    flight.set('route', 'GRU → MAD')
    flight.set('airline', 'Iberia (via Smiles)')
    flight.set('departure', dateStr(30, '18:40'))
    flight.set('payment_method', 'milhas')
    flight.set('miles_used', 25000)
    flight.set('fees', 89.9)
    flight.set('reference_value', 4200.0)
    flight.set('program', smiles.id)
    flight.set('entry', entry.id)
    app.save(flight)

    // --- Passagem passada paga em dinheiro (histórico de economia) ---
    const pastFlight = new Record(flightsCol)
    pastFlight.set('route', 'GRU → SSA')
    pastFlight.set('airline', 'Azul')
    pastFlight.set('departure', dateStr(-40, '08:15'))
    pastFlight.set('payment_method', 'dinheiro')
    pastFlight.set('cash_amount', 780.0)
    pastFlight.set('reference_value', 950.0)
    app.save(pastFlight)

    // --- Hospedagem futura ---
    const hotel = new Record(app.findCollectionByNameOrId('hotels'))
    hotel.set('hotel', 'Fasano Rio de Janeiro')
    hotel.set('destination', 'Rio de Janeiro, RJ')
    hotel.set('check_in', dateStr(42, '14:00'))
    hotel.set('check_out', dateStr(47, '12:00'))
    hotel.set('total_value', 4850.0)
    hotel.set('payment_method', 'dinheiro')
    app.save(hotel)

    console.log('Seed RRMILHAS aplicado: programas, extrato, passagens e hotel de exemplo')
  },
  (app) => {
    const clean = (name) => {
      try {
        const records = app.findRecordsByFilter(name, '', '', 0, 0)
        for (const rec of records) app.delete(rec)
      } catch (_) {}
    }
    clean('hotels')
    clean('flights')
    clean('program_entries')
    clean('programs')
  },
)
