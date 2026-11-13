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
    // Orientação para PDF digitalizado (só imagem, sem texto selecionável) que
    // nem o agente multimodal conseguiu ler. Sem jargão (nada de OCR/anydoc).
    const SCANNED_PDF_HINT =
      'Este PDF é digitalizado (só imagem). Duas opções: tire prints das páginas e envie como JPG/PNG (a leitura entende imagens), ou abra o PDF, copie o texto e cole no campo ao lado.'

    const contentType = String(e.request.header.get('Content-Type') || '')
    const isMultipart = contentType.toLowerCase().indexOf('multipart/form-data') === 0
    let text = ''
    let images = []
    let nPages = 0
    let docTruncated = false
    // PDF digitalizado (só imagem): vira uma parte `file` (data URL
    // application/pdf) enviada ao agente multimodal junto das imagens.
    let pdfPart = null
    let scannedPdf = false

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
          const PDF_IMGBASED = 'PDF has no extractable text (ImageBased'
          const isScannedPdf = docErrorStatus === 422 && docError.indexOf(PDF_IMGBASED) >= 0
          if (docErrorStatus === 422 && docError && !isScannedPdf) {
            // 422 que não é "só imagem": motivo real (ex. DOCX ilegível).
            return e.json(422, { error: docError })
          }
          if (isScannedPdf) {
            // PDF digitalizado (só imagem, sem texto selecionável): manda o PDF
            // cru ao agente multimodal como parte `file` (data URL
            // application/pdf) — sem OCR e sem rasterizar. O fluxo segue o
            // MESMO do texto/imagens (normalização + duplicate_of). Se o agente
            // não conseguir ler o PDF, o catch no final responde com a
            // orientação (SCANNED_PDF_HINT: prints JPG/PNG ou colar texto).
            for (let i = 0; i < uploaded.length && !pdfPart; i++) {
              const f = uploaded[i]
              const fname = String(f.name || 'documento.pdf')
              if (fname.toLowerCase().indexOf('.pdf') !== fname.length - 4) continue
              let bytes = []
              try {
                const reader = f.reader.open()
                bytes = toBytes(reader, 11 * 1024 * 1024)
                try {
                  reader.close()
                } catch (_) {}
              } catch (_) {}
              if (bytes.length === 0 || bytes.length > MAX_DATAURL) continue
              const B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
              let out = ''
              const n = bytes.length
              let k = 0
              while (k + 3 <= n) {
                const b0 = bytes[k]
                const b1 = bytes[k + 1]
                const b2 = bytes[k + 2]
                out +=
                  B64C.charAt(b0 >> 2) +
                  B64C.charAt(((b0 & 3) << 4) | (b1 >> 4)) +
                  B64C.charAt(((b1 & 15) << 2) | (b2 >> 6)) +
                  B64C.charAt(b2 & 63)
                k += 3
              }
              const rem = n - k
              if (rem === 1) {
                out += B64C.charAt(b0 >> 2) + B64C.charAt(b0 & 3) + '=='
              } else if (rem === 2) {
                const b0 = bytes[k]
                const b1 = bytes[k + 1]
                out +=
                  B64C.charAt(b0 >> 2) +
                  B64C.charAt(((b0 & 3) << 4) | (b1 >> 4)) +
                  B64C.charAt((b1 & 15) << 2) +
                  '='
              }
              pdfPart = {
                type: 'file',
                file: {
                  filename: fname,
                  file_data: 'data:application/pdf;base64,' + out,
                },
              }
              const pm = docError.match(/(\d+)\s*pages?/)
              pdfPages = pm ? Number(pm[1]) : 0
              scannedPdf = true
            }
            // Sem data URL possível (ex. PDF > 6 MB): orienta logo.
            if (!pdfPart) {
              return e.json(422, { error: SCANNED_PDF_HINT })
            }
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

    if (!text && images.length === 0 && !pdfPart) {
      return e.badRequestError('Envie um arquivo com texto ou cole o conteúdo do extrato.')
    }
    if (text.length > 200000) {
      text = text.slice(0, 200000)
      docTruncated = true
    }

    // Resumo do que JÁ está cadastrado no app: o agente usa isso para sinalizar
    // duplicidade (duplicate_of) sem precisar de ferramentas. Nomes e códigos
    // apenas — nada do documento é guardado.
    let known = ''
    try {
      const recs = (col, sort) => {
        try {
          return $app.findRecordsByFilter(col, '', sort || '-created', 200, 0)
        } catch (_) {
          return []
        }
      }
      const lines = []
      const progs = recs('programs', 'name')
      for (let i = 0; i < progs.length; i++)
        lines.push('- programa: ' + String(progs[i].getString('name') || ''))
      const pax = recs('passengers', 'name')
      for (let i = 0; i < pax.length; i++)
        lines.push('- passageiro: ' + String(pax[i].getString('name') || ''))
      const fls = recs('flights', '-departure')
      for (let i = 0; i < fls.length; i++) {
        const f = fls[i]
        let extra = ''
        try {
          extra = ' localizador ' + String(f.getString('booking_code') || '')
        } catch (_) {}
        lines.push(
          '- passagem: ' +
            String(f.getString('route') || '') +
            ' ' +
            String(f.getString('departure') || '').slice(0, 10) +
            extra,
        )
      }
      const hts = recs('hotels', '-check_out')
      for (let i = 0; i < hts.length; i++) {
        const h = hts[i]
        let extra = ''
        try {
          extra = ' localizador ' + String(h.getString('booking_code') || '')
        } catch (_) {}
        lines.push(
          '- hospedagem: ' +
            String(h.getString('hotel') || '') +
            ' check_in ' +
            String(h.getString('check_in') || '').slice(0, 10) +
            extra,
        )
      }
      if (lines.length > 0) known = 'Dados já cadastrados no app:\n' + lines.join('\n') + '\n'
    } catch (_) {
      known = ''
    }

    // Mensagem: com imagens e/ou PDF digitalizado, array de partes (texto +
    // file/image_url data URLs); sem elas, o texto puro. O resumo do que já
    // está cadastrado entra no prompt para o agente sinalizar duplicidade
    // (duplicate_of).
    let message = text ? known + text : known
    if (pdfPart || images.length > 0) {
      let instruction = ''
      if (pdfPart) {
        instruction =
          'Este PDF é digitalizado (só imagem). Leia o texto visível nas páginas dele e extraia os dados conforme as instruções.'
      } else {
        instruction =
          'Extraia os dados destas ' + images.length + ' imagem(ns) conforme as instruções.'
      }
      const parts = [
        {
          type: 'text',
          text: (message ? message + '\n\n' : '') + instruction,
        },
      ]
      if (pdfPart) parts.push(pdfPart)
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
      const num = (v) => {
        if (typeof v === 'number' && isFinite(v)) return v
        if (typeof v === 'string' && v.trim() !== '') {
          const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
          if (!isNaN(n)) return n
        }
        return 0
      }
      const programs = Array.isArray(parsed.programs) ? parsed.programs : []
      const movements = Array.isArray(parsed.movements) ? parsed.movements : []
      const flightsRaw = Array.isArray(parsed.flights) ? parsed.flights : []
      const hotels = Array.isArray(parsed.hotels) ? parsed.hotels : []
      const passengers = Array.isArray(parsed.passengers) ? parsed.passengers : []
      const trips = Array.isArray(parsed.trips) ? parsed.trips : []

      // status da reserva: confirma/cancelada/em_espera → os valores do schema;
      // qualquer outra resposta (ex. "confirmed", "OK") vira "confirmada".
      const flightStatus = (v) => {
        const s = only(v).toLowerCase()
        if (s.indexOf('cancel') === 0 || s.indexOf('canc') === 0) return 'cancelada'
        if (s.indexOf('espera') >= 0 || s.indexOf('wait') >= 0 || s.indexOf('pend') === 0)
          return 'em_espera'
        return 'confirmada'
      }
      const dateOf = (v) => {
        const s = only(v)
        const m = s.match(/\d{4}-\d{2}-\d{2}/)
        return m ? m[0] : ''
      }

      // Trechos do voo: o agente devolve segments; mantém compatibilidade com o
      // formato antigo (origin/destination/datetime no próprio voo).
      const segsOf = (f) => {
        const segs = Array.isArray(f && f.segments) ? f.segments : []
        if (segs.length > 0) return segs
        if (f && (f.origin || f.destination || f.datetime)) return [f]
        return []
      }

      return e.json(200, {
        programs: programs.map((p) => ({
          name: only(p && p.name),
          balance: num(p && p.balance),
          cost_per_thousand: num(p && p.cost_per_thousand),
          miles_expiry: only(p && p.miles_expiry),
          elite_status: only(p && p.elite_status),
          holder: only(p && p.holder),
          duplicate_of: only(p && p.duplicate_of),
        })),
        movements: movements
          .filter((m) => m && typeof m.description === 'string' && m.description.trim())
          .map((m) => ({
            date: only(m.date),
            description: m.description.trim(),
            amount: num(m.amount),
            duplicate_of: only(m.duplicate_of),
          })),
        flights: flightsRaw.map((f) => ({
          booking_code: only(f && f.booking_code),
          airline: only(f && f.airline),
          status: flightStatus(f && f.status),
          passengers: Array.isArray(f && f.passengers)
            ? f.passengers.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim())
            : [],
          segments: segsOf(f)
            .map((s) => ({
              origin: only(s && s.origin).toUpperCase(),
              destination: only(s && s.destination).toUpperCase(),
              datetime: only(s && s.datetime),
              arrival_datetime: only(s && s.arrival_datetime),
              seat: only(s && s.seat),
            }))
            .filter((s) => s.origin || s.destination || s.datetime),
          miles: num(f && f.miles),
          fees: num(f && f.fees),
          duplicate_of: only(f && f.duplicate_of),
        })),
        hotels: hotels
          .filter((h) => h && typeof h.name === 'string' && h.name.trim())
          .map((h) => ({
            name: h.name.trim(),
            destination: only(h.destination),
            check_in: only(h.check_in),
            check_out: only(h.check_out),
            miles: num(h.miles),
            fees: num(h.fees),
            cash_amount: num(h.cash_amount),
            booking_code: only(h.booking_code),
            guests: only(h.guests),
            duplicate_of: only(h.duplicate_of),
          })),
        passengers: passengers
          .filter((p) => p && typeof p.name === 'string' && p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            // CPF e nascimento só quando o documento os trouxer EXPLÍCITOS —
            // nunca inventar (o prompt do agente proíbe).
            cpf: typeof p.cpf === 'string' ? p.cpf.trim() : '',
            birth_date: dateOf(p && p.birth_date),
            duplicate_of: only(p.duplicate_of),
          })),
        trips: trips
          .filter((t) => t && typeof t.name === 'string' && t.name.trim())
          .map((t) => ({
            name: t.name.trim(),
            destination: only(t && t.destination),
            start_date: dateOf(t && t.start_date),
            end_date: dateOf(t && t.end_date),
            duplicate_of: only(t.duplicate_of),
          })),
        meta: {
          pages: nPages,
          characters: text.length,
          images: images.length,
          truncated: docTruncated,
          scanned_pdf: scannedPdf,
        },
      })
    } catch (err) {
      if (scannedPdf) {
        // O agente não conseguiu ler o PDF digitalizado: orienta o caminho que
        // funciona (prints JPG/PNG ou colar o texto) — sem jargão.
        return e.json(422, { error: SCANNED_PDF_HINT })
      }
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
