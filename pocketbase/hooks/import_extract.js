// POST /backend/v1/import-extract — extrai dados estruturados de extratos/e-mails
// de programas de milhas via o agente nativo "import-extrator".
// Entradas: { text } (JSON) ou multipart com PDF (extraído server-side via
// $documents) e/ou { image } (data URL de JPG/PNG/WebP lido no navegador, para
// visão). NADA é armazenado: sem conversation_id (conversa descartável criada
// sob o usuário da requisição), sem logs de conteúdo, sem collection de arquivos.
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

    const contentType = String(e.request.header.get('Content-Type') || '')
    const isMultipart = contentType.toLowerCase().indexOf('multipart/form-data') === 0
    let text = ''
    let image = ''
    let nImages = 0
    let nPages = 0
    let docTruncated = false

    if (isMultipart) {
      // PDF/DOCX/XLSX/PPTX em multipart: extração server-side ($documents),
      // nunca no navegador. O arquivo é lido em memória e descartado.
      const files = e.findUploadedFiles('file')
      if (files && files.length > 0) {
        try {
          const { markdown, truncated } = $documents.toMarkdown({ file: files[0] })
          text = markdown || ''
          docTruncated = !!truncated
        } catch (err) {
          if (err && (err.status === 422 || err.status === 413)) {
            return e.json(err.status, { error: err.message })
          }
          return e.json(500, { error: 'Não foi possível ler o documento enviado.' })
        }
      }
      const form = e.requestInfo().body || {}
      const formText = typeof form.text === 'string' ? form.text.trim() : ''
      if (formText) text = text ? text + '\n\n' + formText : formText
      const fc = Number(form.page_count)
      if (!isNaN(fc)) nPages = fc
      const ic = Number(form.image_count)
      if (!isNaN(ic)) nImages = ic
    } else {
      const body = e.requestInfo().body || {}
      text = typeof body.text === 'string' ? body.text.trim() : ''
      if (typeof body.image === 'string' && body.image.indexOf('data:image/') === 0) {
        const MAX_DATAURL = 8 * 1024 * 1024
        if (body.image.length > MAX_DATAURL) {
          return e.json(413, { error: 'Imagem muito grande. Envie um arquivo de até 6 MB.' })
        }
        image = body.image
        nImages = 1
      }
      const bc = Number(body.image_count)
      if (!isNaN(bc) && bc > 0) nImages = bc
    }

    if (!text && !image) {
      return e.badRequestError('Envie um arquivo com texto ou cole o conteúdo do extrato.')
    }
    if (text.length > 200000) {
      text = text.slice(0, 200000)
      docTruncated = true
    }

    // Mensagem: quando há imagem, manda um array de partes (texto + image_url
    // data URL) no formato OpenAI; quando não, manda o texto puro.
    let message = text
    if (image) {
      const parts = []
      parts.push({
        type: 'text',
        text: (text ? text + '\n\n' : '') + 'Extraia os dados desta imagem conforme as instruções.',
      })
      parts.push({ type: 'image_url', image_url: { url: image } })
      message = parts
    }

    try {
      const result = $ai.agent('import-extrator').chat({
        user_id: authId,
        message: message,
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
      const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0)
      const programs = Array.isArray(parsed.programs) ? parsed.programs : []
      const movements = Array.isArray(parsed.movements) ? parsed.movements : []
      const flights = Array.isArray(parsed.flights) ? parsed.flights : []
      const trips = Array.isArray(parsed.trips) ? parsed.trips : []

      return e.json(200, {
        programs: programs.map((p) => ({
          name: only(p && p.name),
          balance: num(p && p.balance),
          miles_expiry: only(p && p.miles_expiry),
          elite_status: only(p && p.elite_status),
          holder: only(p && p.holder),
        })),
        movements: movements
          .filter((m) => m && typeof m.description === 'string' && m.description.trim())
          .map((m) => ({
            date: only(m.date),
            description: m.description.trim(),
            amount: num(m.amount),
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
