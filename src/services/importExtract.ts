import pb from '@/lib/pocketbase/client'

/** Resultado da extração do agente "import-extrator". */
export interface ExtractedProgram {
  name: string
  balance: number
  miles_expiry: string
  elite_status: string
  holder: string
}

export interface ExtractedFlight {
  origin: string
  destination: string
  datetime: string
  airline: string
  passengers: string[]
}

export interface ExtractedTrip {
  name: string
}

export interface ExtractMeta {
  pages: number
  characters: number
  images: number
  truncated: boolean
}

export interface ExtractResult {
  programs: ExtractedProgram[]
  flights: ExtractedFlight[]
  trips: ExtractedTrip[]
  meta: ExtractMeta
}

export interface ImportInput {
  text: string
  file?: File
  pageCount?: number
  imageCount?: number
}

export class ImportExtractError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Chama POST /backend/v1/import-extract (texto e/ou arquivo multipart). */
export async function extractFromDocument({
  text,
  file,
  pageCount = 0,
  imageCount = 0,
}: ImportInput): Promise<ExtractResult> {
  let res: Response
  try {
    if (file) {
      const form = new FormData()
      form.append('file', file)
      if (text.trim()) form.append('text', text)
      form.append('page_count', String(pageCount))
      form.append('image_count', String(imageCount))
      res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/import-extract`, {
        method: 'POST',
        headers: { Authorization: pb.authStore.token },
        body: form,
      })
    } else {
      res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/import-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ text, page_count: pageCount, image_count: imageCount }),
      })
    }
  } catch {
    throw new ImportExtractError(
      'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.',
      0,
    )
  }

  let data: { error?: string } & Partial<ExtractResult>
  try {
    data = await res.json()
  } catch {
    throw new ImportExtractError('Resposta inválida do servidor.', res.status)
  }
  if (!res.ok) {
    throw new ImportExtractError(data?.error || 'Falha na leitura do documento.', res.status)
  }
  return data as ExtractResult
}
