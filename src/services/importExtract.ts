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
  files?: File[]
  imageCount?: number
}

export class ImportExtractError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Tipos de arquivo que a extração entende: PDF/DOCX/XLSX (texto) e imagens (visão). */
export const DOC_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const

export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

export const ACCEPTED_MIME: string[] = [...DOC_MIME, ...IMAGE_MIME]

export const ACCEPTED_EXT = '.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp'

export const isImageFile = (file: File) => IMAGE_MIME.includes(file.type as never)
export const isDocFile = (file: File) => DOC_MIME.includes(file.type as never)

/** Converte uma imagem em data URL (só em memória, nunca salva). */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('read-error'))
    reader.readAsDataURL(file)
  })

/**
 * Chama POST /backend/v1/import-extract (multipart sempre):
 * - PDF/DOCX/XLSX/PPTX no campo `files` — extração server-side via $documents;
 * - imagens convertidas em data URL (só em memória) no campo `images` — visão;
 * - texto colado no campo `text`.
 * `imageCount` só informa a meta "N imagens enviadas" quando vem do cliente.
 */
export async function extractFromDocument({
  text,
  files = [],
  imageCount = 0,
}: ImportInput): Promise<ExtractResult> {
  if (text.trim().length === 0 && files.length === 0) {
    throw new ImportExtractError('Anexe um arquivo ou cole o texto do extrato.', 400)
  }

  const docs = files.filter((f) => !isImageFile(f))
  const images = files.filter(isImageFile)

  // Imagens viram data URL aqui (nunca são salvas), para o hook montar a visão.
  const dataUrls: string[] = []
  for (const img of images) {
    if (img.size > 5 * 1024 * 1024) {
      throw new ImportExtractError(`Imagem ${img.name} muito grande (máx. 5 MB).`, 413)
    }
    dataUrls.push(await fileToDataUrl(img))
  }

  let res: Response
  try {
    const form = new FormData()
    if (text.trim()) form.append('text', text)
    for (const d of docs) form.append('files', d, d.name)
    if (dataUrls.length > 0) form.append('images', JSON.stringify(dataUrls))
    form.append('image_count', String(imageCount > 0 ? imageCount : dataUrls.length))
    res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/import-extract`, {
      method: 'POST',
      headers: { Authorization: pb.authStore.token },
      body: form,
    })
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
