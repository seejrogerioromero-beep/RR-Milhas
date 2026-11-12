import pb from '@/lib/pocketbase/client'

/** Resultado da extração do agente "import-extrator". */
export interface ExtractedProgram {
  name: string
  balance: number
  miles_expiry: string
  elite_status: string
  holder: string
}

export interface ExtractedMovement {
  date: string
  description: string
  amount: number
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
  movements: ExtractedMovement[]
  flights: ExtractedFlight[]
  trips: ExtractedTrip[]
  meta: ExtractMeta
}

export interface ImportInput {
  text: string
  file?: File
  imageCount?: number
}

export class ImportExtractError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Tipos de arquivo que a extração entende: PDF (texto) e imagens (visão). */
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

export const isImageFile = (file: File) => ACCEPTED_MIME.includes(file.type as never)

/** Converte a imagem escolhida em data URL (só em memória, nunca salva). */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })

/** Chama POST /backend/v1/import-extract (texto, PDF multipart e/ou imagens em data URL). */
export async function extractFromDocument({
  text,
  file,
  imageCount = 0,
}: ImportInput): Promise<ExtractResult> {
  const isImage = file ? isImageFile(file) : false
  const dataUrl = isImage ? await fileToDataUrl(file) : ''
  if (file && isImage && !dataUrl) {
    throw new ImportExtractError('Não foi possível ler a imagem enviada.', 422)
  }

  let res: Response
  try {
    if (file && !isImage) {
      const form = new FormData()
      form.append('file', file)
      if (text.trim()) form.append('text', text)
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
        body: JSON.stringify({
          text,
          image: dataUrl || undefined,
          image_count: imageCount,
        }),
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
