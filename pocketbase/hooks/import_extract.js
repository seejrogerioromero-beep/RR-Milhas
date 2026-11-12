// POST /backend/v1/import-extract — extrai dados estruturados de extratos/e-mails
// de programas de milhas via o agente nativo "import-extrator".
// Entradas: { text, images: [dataURL] } (JSON) ou multipart com PDF/DOCX/XLSX
// (extração server-side via $documents) e o campo `images` com a lista JSON de
// data URLs de JPG/PNG/WebP (visão, várias imagens por vez). NADA é armazenado:
// sem conversation_id (conversa descartável), sem logs de conteúdo e sem
// collection de arquivos.
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

    const MAX_DATAURL = 8 * 1024 * 1024
    const MAX_IMAGES = 8

    const contentType = String(e.request.header.get('Content-Type') || '')
    const isMultipart = contentType.toLowerCase().indexOf('multipart/form-data') === 0
    let text = ''
    let images = []
    let nPages = 0
    let docTruncated = false

    try {
      if (isMultipart) {
        // PDF/DOCX/XLSX/PPTX em multipart: extração server-side ($documents),
        // nunca no navegador. O arquivo é lido em memória e descartado.
        // findUploadedFiles LANÇA "http: no such file" quando o campo não veio;
        // por isso cada nome de campo é tentado em try/catch separado.
        const uploaded = []
        try {
          const a = e.findUploadedFiles('files')
          for (let i = 0; i < a.length; i++) uploaded.push(a[i])
        } catch (_) {}
        try {
          const b = e.findUploadedFiles('file')
          for (let i = 0; i < b.length; i++) uploaded.push(b[i])
        } catch (_) {}

        const docTexts = []
        let docError = ''
        let docErrorStatus = 0
        for (let i = 0; i < uploaded.length; i++) {
          try {
            const res = $documents.toMarkdown({ file: uploaded[i] })
            if (res && res.markdown) docTexts.push(res.markdown)
            if (res && res.truncated) docTruncated = true
          } catch (err) {
            // Arquivo não documentável (ex.: imagem): ignora — imagens chegam
            // como data URL no campo `images`. Documento com problema real
            // (422 = sem texto selecionável/ilegível, 413 = grande demais):
            // guarda o motivo para responder com a causa verdadeira.
            const st = (err && err.status) || 0
            if (!docError && (st === 422 || st === 413)) {
              docError = String((err && err.message) || '')
              docErrorStatus = st
            } else if (!docError) {
              docError = 'internal'
              docErrorStatus = 500
            }
          }
        }
        text = docTexts.join('\n\n')

        if (!text && uploaded.length > 0) {
          if (docErrorStatus === 413) {
            return e.json(413, {
              error: 'O arquivo é grande demais para leitura (limite de 10 MB por documento).',
            })
          }
          if (docErrorStatus === 422 && docError) {
            return e.json(422, {
              error:
                docError +
                ' Se o PDF for digitalizado (só imagem, sem texto selecionável), esta leitura não consegue extrair os dados — abra o PDF, copie o texto e cole no campo de texto.',
            })
          }
          return e.json(422, {
            error:
              'Não encontrei texto legível neste arquivo. Envie um PDF/DOCX/XLSX com texto selecionável ou cole o conteúdo do extrato no campo de texto.',
          })
        }

        const form = e.requestInfo().body || {}
        const formText = typeof form.text === 'string' ? form.text.trim() : ''
        if (formText) text = text ? text + '\n\n' + formText : formText
        const rawImages = typeof form.images === 'string' ? form.images : ''
        if (rawImages.trim()) {
          try {
            const parsed = JSON.parse(rawImages)
            const list = Array.isArray(parsed) ? parsed : []
            for (let i = 0; i < list.length; i++) {
              const img = list[i]
              if (typeof img !== 'string' || img.indexOf('data:image/') !== 0) continue
              if (img.length > MAX_DATAURL) {
                return e.json(413, {
                  error: 'Imagem muito grande. Envie imagens de até 6 MB.',
                })
              }
              images.push(img)
              if (images.length >= MAX_IMAGES) break
            }
          } catch (_) {
            // campo images malformado: segue sem imagens
          }
        }
        const pc = Number(form.page_count)
        if (!isNaN(pc)) nPages = pc
      } else {
        const body = e.requestInfo().body || {}
        text = typeof body.text === 'string' ? body.text.trim() : ''
        // Formato novo: lista de data URLs; `image` único fica por compatibilidade.
        const rawList = body.images !== undefined ? body.images : body.image
        const list = Array.isArray(rawList)
          ? rawList
          : typeof rawList === 'string' && rawList
            ? [rawList]
            : []
        for (let i = 0; i < list.length; i++) {
          const img = list[i]
          if (typeof img !== 'string' || img.indexOf('data:image/') !== 0) continue
          if (img.length > MAX_DATAURL) {
            return e.json(413, { error: 'Imagem muito grande. Envie imagens de até 6 MB.' })
          }
          images.push(img)
          if (images.length >= MAX_IMAGES) break
        }
      }
    } catch (err) {
      throw err
    }

    if (!text && images.length === 0) {
      return e.badRequestError('Envie um arquivo com texto ou cole o conteúdo do extrato.')
    }
    if (text.length > 200000) {
      text = text.slice(0, 200000)
      docTruncated = true
    }

    // Mensagem: com imagens, array de partes (texto + image_url data URLs);
    // sem imagens, o texto puro.
    let message = text
    if (images.length > 0) {
      const parts = [
        {
          type: 'text',
          text:
            (text ? text + '\n\n' : '') +
            'Extraia os dados destas ' +
            images.length +
            ' imagem(ns) conforme as instruções.',
        },
      ]
      for (let i = 0; i < images.length; i++) {
        parts.push({ type: 'image_url', image_url: { url: images[i] } })
      }
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
          images: images.length,
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
