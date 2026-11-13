import pb from '@/lib/pocketbase/client'

/** Resultado da extração do agente "import-extrator". */
export interface ExtractedProgram {
  name: string
  balance: number
  miles_expiry: string
  elite_status: string
  holder: string
  duplicate_of: string
}

export interface ExtractedMovement {
  date: string
  description: string
  amount: number
  duplicate_of: string
}

/** Um trecho de voo (perna) com partida, chegada e assento. */
export interface ExtractedSegment {
  origin: string
  destination: string
  datetime: string
  arrival_datetime: string
  seat: string
}

export interface ExtractedFlight {
  booking_code: string
  airline: string
  passengers: string[]
  segments: ExtractedSegment[]
  miles: number
  fees: number
  duplicate_of: string
}

export interface ExtractedHotel {
  name: string
  destination: string
  check_in: string
  check_out: string
  miles: number
  fees: number
  cash_amount: number
  booking_code: string
  guests: string
  duplicate_of: string
}

export interface ExtractedPassenger {
  name: string
  cpf: string
  birth_date: string
  duplicate_of: string
}

export interface ExtractedTrip {
  name: string
  duplicate_of: string
}

export interface ExtractMeta {
  pages: number
  characters: number
  images: number
  truncated: boolean
  /** PDF digitalizado (só imagem) lido pelo agente como visão. */
  scanned_pdf?: boolean
}

export interface ExtractResult {
  programs: ExtractedProgram[]
  movements: ExtractedMovement[]
  flights: ExtractedFlight[]
  hotels: ExtractedHotel[]
  passengers: ExtractedPassenger[]
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
  const empty = {
    programs: [] as ExtractedProgram[],
    movements: [] as ExtractedMovement[],
    flights: [] as ExtractedFlight[],
    hotels: [] as ExtractedHotel[],
    passengers: [] as ExtractedPassenger[],
    trips: [] as ExtractedTrip[],
  }
  const merged = { ...empty, ...data } as ExtractResult
  merged.programs = (merged.programs || []).filter((p) => p && p.name)
  merged.movements = (merged.movements || []).filter((m) => m && m.description)
  merged.flights = (merged.flights || []).filter((f) => f && (f.segments?.length || f.airline))
  merged.hotels = (merged.hotels || []).filter((h) => h && h.name)
  merged.passengers = (merged.passengers || [])
    .map((p) => ({
      name: '',
      cpf: '',
      birth_date: '',
      duplicate_of: '',
      ...p,
    }))
    .filter((p) => p && p.name)
  merged.trips = (merged.trips || []).filter((t) => t && t.name)
  return merged
}
