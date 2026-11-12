// POST /backend/v1/import-extract — extrai dados estruturados de extratos/e-mails
// de programas de milhas via o agente nativo "import-extrator".
// Recebe { text } (texto já lido no navegador ou extraído pelo servidor de um PDF
// enviado em multipart). NADA é armazenado: sem conversation_id (conversa descartável
// criada sob o usuário da requisição), sem logs de conteúdo.
routerAdd(
  'POST',
  '/backend/v1/import-extract',
  (e) => {
    const authId = e.auth && e.auth.id
    if (!authId) return e.unauthorizedError('Acesso restrito ao proprietário do aplicativo.')

    // Dupla barreira (além do auth_gate no login): só o dono pode extrair dados.
    let ownerId = ''
    try {
      ownerId = $app.findAuthRecordByEmail('users', 'seej.rogerio.romero@gmail.com').id
    } catch (err) {
      ownerId = ''
    }
    if (ownerId === '' || String(authId) !== String(ownerId)) {
      return e.forbiddenError('Acesso restrito ao proprietário do aplicativo.')
    }

    const body = e.requestInfo().body || {}
    let text = typeof body.text === 'string' ? body.text.trim() : ''
    let docTruncated = false

    // PDF/DOCX/XLSX/PPTX enviados em multipart: extração server-side ($documents),
    // nunca no navegador. O arquivo é lido em memória e descartado — sem collection.
    const files = e.findUploadedFiles('file')
    if (files && files.length > 0) {
      try {
        const { markdown, truncated } = $documents.toMarkdown({ file: files[0] })
        text = (text ? text + '\n\n' : '') + (markdown || '')
        docTruncated = !!truncated
      } catch (err) {
        if (err && (err.status === 422 || err.status === 413)) {
          return e.json(err.status, { error: err.message })
        }
        return e.json(500, { error: 'Não foi possível ler o documento enviado.' })
      }
    }

    if (!text || text.length < 10) {
      return e.badRequestError('Envie um arquivo com texto ou cole o conteúdo do extrato.')
    }
    if (text.length > 200000) {
      text = text.slice(0, 200000)
      docTruncated = true
    }

    try {
      const result = $ai.agent('import-extrator').chat({
        user_id: authId,
        message: text,
      })

      const raw = (result && result.content) || ''
      // O agente pode devolver cercas de código ou texto ao redor; isola o JSON.
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end <= start) {
        return e.json(422, {
          error: 'Não encontrei dados de milhas ou voos neste documento.',
        })
      }
      let parsed
      try {
        parsed = JSON.parse(raw.slice(start, end + 1))
      } catch (parseErr) {
        console.warn('import-extract: agente devolveu JSON inválido')
        return e.json(422, { error: 'Não foi possível interpretar a resposta da extração.' })
      }

      const only = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : v)
      const programs = Array.isArray(parsed.programs) ? parsed.programs : []
      const flights = Array.isArray(parsed.flights) ? parsed.flights : []
      const trips = Array.isArray(parsed.trips) ? parsed.trips : []
      const nImages = typeof body.image_count === 'number' ? body.image_count : 0
      const nPages = typeof body.page_count === 'number' ? body.page_count : 0

      return e.json(200, {
        programs: programs.map((p) => ({
          name: only(p && p.name),
          balance: typeof (p && p.balance) === 'number' ? p.balance : 0,
          miles_expiry: only(p && p.miles_expiry),
          elite_status: only(p && p.elite_status),
          holder: only(p && p.holder),
        })),
        flights: flights.map((f) => ({
          origin: only(f && f.origin),
          destination: only(f && f.destination),
          datetime: only(f && f.datetime),
          airline: only(f && f.airline),
          passengers: Array.isArray(f && f.passengers)
            ? f.passengers.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim())
            : [],
        })),
        trips: trips
          .filter((t) => t && typeof t.name === 'string' && t.name.trim())
          .map((t) => ({ name: t.name.trim() })),
        meta: {
          pages: nPages,
          characters: text.length,
          images: nImages,
          truncated: docTruncated,
        },
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, {
          error: 'O serviço de leitura por IA está temporariamente indisponível.',
        })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na leitura do documento. Tente novamente.' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'Falha na leitura do documento. Tente novamente.' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
