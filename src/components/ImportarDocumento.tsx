import { useEffect, useState } from 'react'
import {
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  Plane,
  Star,
  Map as MapIcon,
  BedDouble,
  ChevronDown,
  ChevronRight,
  X,
  User,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import type { ProgramRecord, PassengerRecord, TripRecord } from '@/types/database'
import {
  extractFromDocument,
  isImageFile,
  ImportExtractError,
  type ExtractResult,
  type ExtractedFlight,
  type ExtractedHotel,
  type ExtractedMovement,
  type ExtractedProgram,
  type ExtractedTrip,
} from '@/services/importExtract'
import { formatDateBR, formatDateTimeBR, formatMiles, maskBRL, parseNumberInput } from '@/lib/miles'
import { isForbiddenProgramName } from '@/lib/programCatalog'
import {
  DeleteExistingPanel,
  DuplicateDupRow,
  MovementRow,
  PassengersSection,
  type ReviewPassengerState,
} from '@/components/import/ImportReviewParts'
import {
  countDuplicates,
  dupLabelFlight,
  dupLabelHotel,
  dupLabelPassenger,
  dupLabelProgram,
  findDupFlight,
  findDupHotel,
  findDupMovement,
  findDupPassenger,
  findDupProgram,
  findDupTrip,
  normalize,
  replaceWouldChangeFlight,
  replaceWouldChangeHotel,
  replaceWouldChangeProgram,
  type DupAction,
  type DupInfo,
} from '@/lib/importDuplicates'
import { recalcProgram } from '@/lib/recalcProgram'
import type { FlightRecord, HotelRecord } from '@/types/database'

const ACCEPTED = '.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp'
const MAX_FILES = 8

interface ReviewFlightState {
  extracted: ExtractedFlight
  selected: boolean
  passengerChecks: boolean[]
  trip: string
  programId: string
  /** '' = adicionar novo; id do registro existente = substituir */
  replaceId: string
}

interface ReviewHotelState {
  extracted: ExtractedHotel
  selected: boolean
  trip: string
  replaceId: string
}

interface ReviewProgramState {
  extracted: ExtractedProgram
  selected: boolean
  programId: string // '' = criar novo programa
}

interface ReviewMovementState {
  extracted: ExtractedMovement
  selected: boolean
}

interface ReviewTripState {
  extracted: ExtractedTrip
  selected: boolean
}

const FORMAT_HINT =
  'Extrato, e-mail do programa ou cartão de embarque. Os dados aparecem para você revisar antes de adicionar.'

function DuplicateAlert({ label }: { label: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#B7791F]/40 bg-[#B7791F]/10 px-3 py-2">
      <AlertTriangle className="w-3.5 h-3.5 text-[#B7791F] mt-0.5 shrink-0" />
      <p className="text-xs font-semibold text-[#B7791F]">
        Possível duplicado — {label} já parece existir no app. Confira antes de adicionar.
      </p>
    </div>
  )
}

/** Rótulo curto do item já cadastrado apontado pelo agente (duplicate_of). */
function dupShort(dup: string) {
  const t = (dup || '').trim()
  if (!t) return 'item existente'
  return t.replace(/^- /, '').trim()
}

/** Tela "Importar de um documento": arquivo/colar texto → extração → revisão → gravar. */
export function ImportarDocumento({ onDone }: { onDone: () => void }) {
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [movesProgramId, setMovesProgramId] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [reading, setReading] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [flights, setFlights] = useState<ReviewFlightState[]>([])
  const [hotels, setHotels] = useState<ReviewHotelState[]>([])
  const [programs, setPrograms] = useState<ReviewProgramState[]>([])
  const [movements, setMovements] = useState<ReviewMovementState[]>([])
  const [movesOpen, setMovesOpen] = useState(false)
  const [trips, setTrips] = useState<ReviewTripState[]>([])
  const [passengers, setPassengers] = useState<ReviewPassengerState[]>([])
  // Ações para itens duplicados: 'add' | 'replace' | 'skip' (índice → ação)
  const [dupActions, setDupActions] = useState<Record<string, DupAction>>({})
  const [saving, setSaving] = useState(false)
  const [existingFlights, setExistingFlights] = useState<FlightRecord[]>([])
  const [existingHotels, setExistingHotels] = useState<HotelRecord[]>([])
  const [existingMovements, setExistingMovements] = useState<
    {
      id: string
      program: string
      date: string
      quantity: number
      type: string
      description: string
    }[]
  >([])
  const [dataVersion, setDataVersion] = useState(0)

  // Dados de apoio: programas, passageiros e viagens cadastrados
  const [existingPrograms, setExistingPrograms] = useState<ProgramRecord[]>([])
  const [existingPassengers, setExistingPassengers] = useState<PassengerRecord[]>([])
  const [existingTrips, setExistingTrips] = useState<TripRecord[]>([])

  useEffect(() => {
    Promise.all([
      pb.collection('programs').getFullList({ sort: 'name' }),
      pb.collection('passengers').getFullList({ sort: 'name' }),
      pb.collection('trips').getFullList({ sort: 'name' }),
      pb.collection('flights').getFullList({ sort: '-departure' }),
      pb.collection('hotels').getFullList({ sort: '-check_in' }),
      pb.collection('program_entries').getFullList({ sort: '-date' }),
    ])
      .then(([p, ps, t, fls, hts, entries]) => {
        setExistingPrograms(p as unknown as ProgramRecord[])
        setExistingPassengers(ps as unknown as PassengerRecord[])
        setExistingTrips(t as unknown as TripRecord[])
        setExistingFlights(fls as unknown as FlightRecord[])
        setExistingHotels(hts as unknown as HotelRecord[])
        setExistingMovements(
          (entries as unknown as Array<Record<string, unknown>>).map((e) => ({
            id: e.id as string,
            program: (e.program as string) || '',
            date: (e.date as string) || '',
            quantity: (e.quantity as number) || 0,
            type: (e.type as string) || '',
            description: (e.description as string) || '',
          })),
        )
      })
      .catch(() => {})
  }, [dataVersion])

  const canRead = (text.trim().length >= 10 || files.length > 0) && !reading

  const clearResult = () => {
    setResult(null)
    setFlights([])
    setHotels([])
    setPrograms([])
    setMovements([])
    setTrips([])
    setPassengers([])
    setDupActions({})
    setExtractError(null)
  }

  const acceptFiles = (chosen: File[]) => {
    const ok = chosen.filter((f) => /\.(pdf|docx|xlsx|pptx|jpe?g|png|webp)$/i.test(f.name))
    const bad = chosen.length - ok.length
    if (ok.length > 0) {
      setFiles((prev) => [...prev, ...ok].slice(0, MAX_FILES))
      clearResult()
    }
    if (bad > 0) {
      setExtractError(
        `${bad} arquivo${bad > 1 ? 's' : ''} com formato não suportado. Use PDF, DOCX, XLSX, JPG, PNG ou WebP.`,
      )
    }
  }

  const handleRead = async () => {
    if (!canRead) return
    setReading(true)
    clearResult()
    try {
      const res = await extractFromDocument({
        text: text.trim(),
        files,
        imageCount: files.filter(isImageFile).length,
      })
      setResult(res)
      setFlights(
        res.flights.map((f) => ({
          extracted: f,
          selected: true,
          passengerChecks: f.passengers.map(() => true),
          trip: '',
          programId: '',
          replaceId: '',
        })),
      )
      setHotels(res.hotels.map((h) => ({ extracted: h, selected: true, trip: '', replaceId: '' })))
      setPrograms(res.programs.map((p) => ({ extracted: p, selected: true, programId: '' })))
      setMovements(res.movements.map((m) => ({ extracted: m, selected: true })))
      setTrips(res.trips.map((t) => ({ extracted: t, selected: true })))
      setPassengers(res.passengers.map((p) => ({ extracted: p, selected: true })))
      if (res.movements.length > 0) setMovesOpen(true)
    } catch (err) {
      if (err instanceof ImportExtractError) {
        setExtractError(err.message)
      } else {
        setExtractError('Falha na leitura do documento. Tente novamente.')
      }
    } finally {
      setReading(false)
    }
  }

  const resetAll = () => {
    setText('')
    setFiles([])
    setMovesProgramId('')
    clearResult()
  }

  /** Cria (ou reutiliza) o programa de milhas pelo nome. */
  const findOrCreateProgram = async (name: string): Promise<ProgramRecord | null> => {
    const clean = name.trim()
    if (!clean || isForbiddenProgramName(clean)) return null
    const existing = existingPrograms.find(
      (p) => p.name.trim().toLowerCase() === clean.toLowerCase(),
    )
    if (existing) return existing
    const created = (await pb.collection('programs').create({
      name: clean,
      balance: 0,
      cost_per_thousand: 0,
      market_per_thousand: 0,
    })) as unknown as ProgramRecord
    setExistingPrograms((prev) => [...prev, created])
    return created
  }

  /** Ação escolhida para um item duplicado (chave: tipo+índice). */
  const dupKey = (kind: string, i: number) => `${kind}-${i}`
  const getDupAction = (kind: string, i: number): DupAction => dupActions[dupKey(kind, i)] || 'add'

  /** Grava apenas os itens marcados, replicando o mecanismo do EntryForm/FlightFormDialog. */
  const handleAddSelected = async () => {
    setSaving(true)
    try {
      // 0. Programas duplicados: ação por item (adiciona novo / substitui / pula)
      for (let i = 0; i < programs.length; i++) {
        const st = programs[i]
        if (!st.selected) continue
        if (!st.extracted.name.trim()) continue
        const dup = findDupProgram(st.extracted, existingPrograms)
        if (!dup) continue
        const action = getDupAction('program', i)
        if (action === 'skip') {
          setPrograms((prev) => prev.map((x, xi) => (xi === i ? { ...x, selected: false } : x)))
        } else if (action === 'replace') {
          const patch: Record<string, unknown> = {}
          if (st.extracted.balance > 0) patch.balance = st.extracted.balance
          if (st.extracted.miles_expiry) patch.miles_expiry = st.extracted.miles_expiry
          if (st.extracted.elite_status) patch.elite_status = st.extracted.elite_status
          if (Object.keys(patch).length > 0) {
            await pb.collection('programs').update(dup.id, patch)
            setExistingPrograms((prev) =>
              prev.map((p) => (p.id === dup.id ? ({ ...p, ...patch } as ProgramRecord) : p)),
            )
          }
          // Marca para pular a criação de novo programa mais abaixo
          setPrograms((prev) =>
            prev.map((x, xi) => (xi === i ? { ...x, programId: dup.id, selected: false } : x)),
          )
        }
        // action === 'add': segue para criar um novo programa com o mesmo nome
      }

      // 0b. Passageiros duplicados: substitui o cadastro existente com CPF/nasc.
      for (let i = 0; i < passengers.length; i++) {
        const st = passengers[i]
        if (!st.selected) continue
        const dup = findDupPassenger(st.extracted, existingPassengers)
        if (!dup) continue
        const action = getDupAction('passenger', i)
        if (action === 'replace') {
          const patch: Record<string, unknown> = {}
          if (st.extracted.cpf.trim()) patch.cpf = st.extracted.cpf.trim()
          if (st.extracted.birth_date) patch.birth_date = st.extracted.birth_date
          if (Object.keys(patch).length > 0) {
            await pb.collection('passengers').update(dup.id, patch)
            setExistingPassengers((prev) =>
              prev.map((p) => (p.id === dup.id ? ({ ...p, ...patch } as PassengerRecord) : p)),
            )
          }
          setPassengers((prev) => prev.map((x, xi) => (xi === i ? { ...x, selected: false } : x)))
        }
        // 'add': cria novo mesmo com nome igual; 'skip': não grava
      }

      // 1. Programas: o saldo extraído é o SALDO ATUAL do extrato — substitui
      // (não soma). Com saldo 0/não informado, mantém o saldo atual.
      let resolvedProgram: ProgramRecord | null = null
      for (const st of programs) {
        if (!st.selected) continue
        const { extracted } = st
        if (!extracted.name.trim()) continue
        const program = await findOrCreateProgram(extracted.name)
        if (!program) continue
        if (extracted.balance > 0) {
          await pb.collection('program_entries').create({
            program: program.id,
            type: 'entrada',
            description: 'Saldo importado de um documento',
            quantity: extracted.balance,
            cost_per_thousand: program.cost_per_thousand || 0,
            date: new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          })
        }
        const patch: Record<string, unknown> = {}
        if (extracted.balance > 0) patch.balance = extracted.balance
        if (extracted.miles_expiry) patch.miles_expiry = extracted.miles_expiry
        if (extracted.elite_status) patch.elite_status = extracted.elite_status
        if (Object.keys(patch).length > 0) {
          await pb.collection('programs').update(program.id, patch)
        }
        const updated = { ...program, ...patch } as ProgramRecord
        resolvedProgram = updated
        setExistingPrograms((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      }

      // 2. Movimentações do extrato: uma program_entry por linha marcada.
      // Se o saldo extraído veio informado, ele já é o resultado das
      // movimentações (só grava as linhas); se não veio, aplica ao saldo atual.
      const selectedMoves = movements.filter((m) => m.selected && m.extracted.description.trim())
      if (!resolvedProgram && selectedMoves.length > 0 && movesProgramId) {
        resolvedProgram = existingPrograms.find((p) => p.id === movesProgramId) || null
      }
      if (resolvedProgram && selectedMoves.length > 0) {
        const applyToBalance = (resolvedProgram.balance || 0) <= 0
        let delta = 0
        for (const mv of selectedMoves) {
          const amount = mv.extracted.amount || 0
          await pb.collection('program_entries').create({
            program: resolvedProgram.id,
            type: amount >= 0 ? 'entrada' : 'saida',
            description: mv.extracted.description.trim(),
            quantity: Math.abs(amount),
            cost_per_thousand: resolvedProgram.cost_per_thousand || 0,
            date: mv.extracted.date
              ? `${mv.extracted.date} 12:00:00.000Z`
              : new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          })
          delta += amount
        }
        if (applyToBalance && delta !== 0) {
          await pb
            .collection('programs')
            .update(resolvedProgram.id, { balance: (resolvedProgram.balance || 0) + delta })
          setExistingPrograms((prev) =>
            prev.map((p) =>
              p.id === resolvedProgram!.id
                ? ({ ...p, balance: (p.balance || 0) + delta } as ProgramRecord)
                : p,
            ),
          )
        }
      }

      // 3. Viagens
      for (const st of trips) {
        if (!st.selected) continue
        const name = st.extracted.name.trim()
        if (!name) continue
        const exists = existingTrips.some((t) => t.name.trim().toLowerCase() === name.toLowerCase())
        if (!exists) {
          const created = (await pb.collection('trips').create({
            name,
            destination: name,
          })) as unknown as TripRecord
          setExistingTrips((prev) => [...prev, created])
        }
      }

      // 4. Passagens — ficha completa: localizador, cia, trechos, assentos,
      // passageiros, milhas e taxas. Duplicado: adicionar novo OU substituir
      // (atualiza o registro existente com os dados do documento).
      for (let i = 0; i < flights.length; i++) {
        const st = flights[i]
        if (!st.selected) continue
        const { extracted } = st
        const segs = extracted.segments.filter((s) => s.origin && s.destination)
        if (segs.length === 0) continue

        const dup = findDupFlight(extracted, existingFlights)
        const action = dup ? getDupAction('flight', i) : 'add'
        if (dup && action === 'skip') continue
        if (dup && action === 'replace') {
          // Atualiza o registro existente com os dados do documento
          const patch: Record<string, unknown> = {}
          if (extracted.booking_code.trim()) patch.booking_code = extracted.booking_code.trim()
          if (extracted.airline.trim()) patch.airline = extracted.airline.trim()
          if (extracted.miles > 0) patch.miles_used = extracted.miles
          if (extracted.fees > 0) patch.fees = extracted.fees
          const pax = extracted.passengers.join(', ')
          if (pax) patch.passengers = pax
          if (st.trip.trim()) patch.trip = st.trip.trim()
          if (extracted.segments[0]?.seat) {
            patch.outbound_departure = extracted.segments[0].datetime.slice(11) || undefined
            patch.outbound_arrival = extracted.segments[0].arrival_datetime.slice(11) || undefined
          }
          if (Object.keys(patch).length > 0) {
            await pb.collection('flights').update(dup.id, patch)
          }
          continue
        }
        const chosenPassengers = extracted.passengers.filter(
          (_, pi) => st.passengerChecks[pi] ?? true,
        )
        const first = segs[0]
        const last = segs[segs.length - 1]
        const route = segs.map((s) => `${s.origin} → ${s.destination}`).join(' · ')
        const isoDate = first.datetime
          ? `${first.datetime.slice(0, 10)} 12:00:00.000Z`
          : new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z'
        const miles = extracted.miles || 0
        const fees = extracted.fees || 0

        let programId = ''
        let program = existingPrograms.find((p) => p.id === st.programId)
        if (!program && extracted.airline.trim()) {
          const byName = existingPrograms.find(
            (p) => p.name.trim().toLowerCase() === extracted.airline.trim().toLowerCase(),
          )
          program = byName
        }
        programId = program?.id || ''

        // Débito no extrato do programa (mesmo mecanismo do FlightFormDialog)
        let entryId: string | undefined
        if (programId && miles > 0) {
          const entry = await pb.collection('program_entries').create({
            program: programId,
            type: 'saida',
            description: `Passagem ${first.origin} → ${last.destination}`,
            quantity: miles,
            cost_per_thousand: program?.cost_per_thousand || 0,
            date: isoDate,
          })
          entryId = entry.id
          await pb
            .collection('programs')
            .update(programId, { balance: (program?.balance || 0) - miles })
        }

        // Ida e volta? (>1 trecho e última volta à origem do primeiro)
        const isRoundtrip = segs.length > 1 && last.destination === first.origin
        await pb.collection('flights').create({
          route,
          airline: extracted.airline.trim() || undefined,
          departure: isoDate,
          payment_method: miles > 0 ? 'milhas' : 'dinheiro',
          miles_used: miles,
          fees,
          cash_amount: miles > 0 ? 0 : fees,
          reference_value: 0,
          status: 'confirmada',
          origin: first.origin,
          destination: last.destination,
          cabin: 'economica',
          roundtrip: isRoundtrip,
          outbound_date: `${segs[0].datetime.slice(0, 10)} 12:00:00.000Z`,
          outbound_departure: segs[0].datetime.slice(11) || undefined,
          outbound_arrival: segs[0].arrival_datetime.slice(11) || undefined,
          return_date: isRoundtrip ? `${last.datetime.slice(0, 10)} 12:00:00.000Z` : undefined,
          return_departure: isRoundtrip ? last.datetime.slice(11) || undefined : undefined,
          return_arrival: isRoundtrip ? last.arrival_datetime.slice(11) || undefined : undefined,
          passengers: chosenPassengers.join(', ') || undefined,
          booking_code: extracted.booking_code || undefined,
          issued_at: new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          trip: st.trip.trim() || undefined,
          ...(programId && miles > 0 ? { program: programId, entry: entryId } : {}),
        })

        // 5. Passageiros marcados que ainda não existem viram cadastro
        // (os da seção própria já foram gravados; aqui só complementa.)
        for (const p of chosenPassengers) {
          const name = p.trim()
          if (!name) continue
          const exists = existingPassengers.some(
            (x) => x.name.trim().toLowerCase() === name.toLowerCase(),
          )
          if (!exists) {
            const created = (await pb
              .collection('passengers')
              .create({ name })) as unknown as PassengerRecord
            setExistingPassengers((prev) => [...prev, created])
          }
        }
      }

      // 6. Hospedagens — hotel, destino, check-in/out, milhas/taxas, localizador
      // Duplicado: adicionar novo OU substituir (atualiza com dados do documento).
      for (let i = 0; i < hotels.length; i++) {
        const st = hotels[i]
        if (!st.selected) continue
        const { extracted } = st
        if (!extracted.check_in || !extracted.check_out) continue

        const dup = findDupHotel(extracted, existingHotels)
        const action = dup ? getDupAction('hotel', i) : 'add'
        if (dup && action === 'skip') continue
        if (dup && action === 'replace') {
          const patch: Record<string, unknown> = {}
          if (extracted.name.trim()) patch.hotel = extracted.name.trim()
          if (extracted.destination.trim()) patch.destination = extracted.destination.trim()
          if (extracted.check_out) patch.check_out = `${extracted.check_out} 12:00:00.000Z`
          if (extracted.miles > 0) patch.miles_used = extracted.miles
          if (extracted.cash_amount + extracted.fees > 0)
            patch.total_value = extracted.cash_amount + extracted.fees
          if (extracted.booking_code.trim()) patch.booking_code = extracted.booking_code.trim()
          if (st.trip.trim()) patch.trip = st.trip.trim()
          if (Object.keys(patch).length > 0) {
            await pb.collection('hotels').update(dup.id, patch)
          }
          continue
        }
        const miles = extracted.miles || 0
        const cash = extracted.cash_amount || 0
        const fees = extracted.fees || 0
        const total = miles > 0 ? cash + fees : cash + fees

        let programId = ''
        let entryId: string | undefined
        // Programa: por nome extraído quando casar com um existente
        const byName = existingPrograms.find(
          (p) =>
            extracted.name.trim().length > 0 &&
            p.name.trim().toLowerCase() === extracted.name.trim().toLowerCase(),
        )
        if (byName && miles > 0) {
          programId = byName.id
          const entry = await pb.collection('program_entries').create({
            program: programId,
            type: 'saida',
            description: `Hospedagem ${extracted.name}`,
            quantity: miles,
            cost_per_thousand: byName.cost_per_thousand || 0,
            date: `${extracted.check_in} 12:00:00.000Z`,
          })
          entryId = entry.id
          await pb
            .collection('programs')
            .update(programId, { balance: (byName.balance || 0) - miles })
        }

        await pb.collection('hotels').create({
          hotel: extracted.name,
          destination: extracted.destination || undefined,
          check_in: `${extracted.check_in} 12:00:00.000Z`,
          check_out: `${extracted.check_out} 12:00:00.000Z`,
          total_value: total,
          payment_method: miles > 0 ? 'milhas' : 'dinheiro',
          miles_used: miles,
          fees,
          reference_value: 0,
          status: 'confirmada',
          guests: extracted.guests || undefined,
          booking_code: extracted.booking_code || undefined,
          issued_at: new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          trip: st.trip.trim() || undefined,
          ...(programId ? { program: programId, entry: entryId } : {}),
        })
      }

      // 7. Passageiros marcados na seção própria (nome, CPF, nascimento)
      for (const st of passengers) {
        if (!st.selected) continue
        const name = st.extracted.name.trim()
        if (!name) continue
        const exists = findDupPassenger(st.extracted, existingPassengers)
        if (!exists) {
          const created = (await pb.collection('passengers').create({
            name,
            ...(st.extracted.cpf.trim() ? { cpf: st.extracted.cpf.trim() } : {}),
            ...(st.extracted.birth_date ? { birth_date: st.extracted.birth_date } : {}),
          })) as unknown as PassengerRecord
          setExistingPassengers((prev) => [...prev, created])
        }
      }

      toast({
        title: 'Itens adicionados',
        description: 'Só o que você marcou foi gravado. O documento não é armazenado.',
      })
      setDataVersion((v) => v + 1)
      onDone()
      resetAll()
    } catch (err) {
      toast({
        title: 'Erro ao adicionar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedCount =
    flights.filter((f) => f.selected).length +
    hotels.filter((h) => h.selected).length +
    programs.filter((p) => p.selected).length +
    movements.filter((m) => m.selected).length +
    trips.filter((t) => t.selected).length +
    passengers.filter((p) => p.selected).length

  // Programa que as movimentações vão usar (escolhido no card ou casado pelo nome)
  const resolvedProgramId =
    programs.map((p) => p.programId).find(Boolean) ||
    (programs.length > 0
      ? existingPrograms.find(
          (p) => p.name.trim().toLowerCase() === programs[0].extracted.name.trim().toLowerCase(),
        )?.id || ''
      : '') ||
    movesProgramId

  const hasDuplicate = result != null && countDuplicates(result) > 0

  return (
    <Card className="paper-card p-6 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#23201A]">Importar de um documento</h2>
        <p className="text-sm text-[#6E6A5E] mt-2 max-w-2xl">{FORMAT_HINT}</p>
      </div>

      {/* ARQUIVO + OU COLE O TEXTO */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
            Arquivo
          </Label>
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = Array.from(e.dataTransfer.files || [])
              if (dropped.length > 0) acceptFiles(dropped)
            }}
            className={cn(
              'block cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all',
              dragOver
                ? 'border-[#16418F] bg-[#16418F]/5'
                : 'border-[#E8E2D6] bg-[#FAF7F0]/40 hover:border-[#16418F]/40',
            )}
          >
            <input
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const chosen = Array.from(e.target.files || [])
                if (chosen.length > 0) acceptFiles(chosen)
                e.target.value = ''
              }}
              multiple
            />
            <UploadCloud className="w-8 h-8 mx-auto text-[#16418F] mb-3" />
            <p className="text-sm font-bold text-[#23201A]">
              {files.length > 0
                ? `${files.length} arquivo${files.length > 1 ? 's' : ''} anexado${files.length > 1 ? 's' : ''}`
                : 'Arraste os arquivos aqui'}
            </p>
            <p className="text-xs text-[#6E6A5E] mt-1">
              ou clique para escolher · PDF, DOCX, XLSX, JPG, PNG ou WebP
            </p>
          </label>
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((f, fi) => (
                <div
                  key={`${f.name}-${fi}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[#F3EFE6] border border-[#E8E2D6] px-3 py-2"
                >
                  <p className="font-mono text-xs text-[#23201A] break-all">
                    {f.name} · {(f.size / 1024).toFixed(0)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== fi))}
                    className="flex items-center gap-1 text-xs font-semibold text-[#16418F] hover:underline shrink-0"
                  >
                    <X className="w-3.5 h-3.5" /> Tirar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
            Ou cole o texto
          </Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui o texto do extrato ou e-mail do programa."
            rows={7}
            className="rrmilhas-input resize-none"
          />
        </div>
      </div>

      {/* Aviso de privacidade */}
      <div className="flex items-start gap-3 rounded-xl border border-[#0E8FB8]/25 bg-[#0E8FB8]/5 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-[#0E8FB8] mt-0.5 shrink-0" />
        <p className="text-xs text-[#6E6A5E]">
          O arquivo é lido só para extrair os dados. Nada do documento é armazenado. Números de
          cartão, CPF e senhas são ignorados.
        </p>
      </div>

      {/* BOTÃO PRINCIPAL — sempre visível com arquivo ou texto */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleRead}
          disabled={!canRead}
          className="rounded-xl bg-[#0E6E54] hover:bg-[#0A5440] text-white font-semibold px-5"
        >
          {reading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Lendo...
            </>
          ) : (
            'Ler informações'
          )}
        </Button>
        {!canRead && !reading && (
          <p className="text-xs text-[#6E6A5E]">Anexe um arquivo ou cole o texto do extrato.</p>
        )}
      </div>

      {extractError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#C4452F]/40 bg-[#C4452F]/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#C4452F] mt-0.5 shrink-0" />
          <p className="text-sm font-semibold text-[#C4452F] flex-1">{extractError}</p>
          <Button
            onClick={handleRead}
            size="sm"
            variant="outline"
            className="rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10 shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar de novo
          </Button>
        </div>
      )}

      {/* REVISE ANTES DE ADICIONAR */}
      {result && (
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#23201A]">Revise antes de adicionar</h3>
          <p className="text-xs text-[#6E6A5E]">
            Lido: {result.meta.pages > 0 ? `${result.meta.pages} páginas · ` : ''}
            {result.meta.characters > 0 ? `${result.meta.characters} caracteres de texto` : ''}
            {result.meta.images > 0
              ? ` · ${result.meta.images} imagem${result.meta.images > 1 ? 's' : ''} enviada${result.meta.images > 1 ? 's' : ''}`
              : ''}
            {result.meta.scanned_pdf ? ' · PDF digitalizado (lido como imagem)' : ''}
            {result.meta.truncated ? ' · documento truncado' : ''}
          </p>

          {hasDuplicate && (
            <div className="flex items-start gap-3 rounded-xl border border-[#B7791F]/40 bg-[#B7791F]/10 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-[#B7791F] mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-[#B7791F]">
                {countDuplicates(result)} item(ns) parecem já existir no app. Em cada um, escolha
                entre adicionar mesmo assim ou substituir o cadastro existente.
              </p>
            </div>
          )}

          {/* Programas */}
          {programs.length > 0 && (
            <div className="space-y-3">
              {programs.map((st, i) => (
                <Card key={`p-${i}`} className="p-4 border border-[#E8E2D6]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.selected}
                      onChange={(e) =>
                        setPrograms((prev) =>
                          prev.map((x, xi) =>
                            xi === i ? { ...x, selected: e.target.checked } : x,
                          ),
                        )
                      }
                      className="mt-0.5 w-4 h-4 accent-[#16418F]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#23201A]">
                        <Star className="w-4 h-4 inline text-[#0E8FB8] mr-1" />
                        {st.extracted.name} ·{' '}
                        {st.extracted.balance > 0 ? (
                          <>saldo {formatMiles(st.extracted.balance)}</>
                        ) : (
                          <>saldo não informado (mantém o atual)</>
                        )}
                        {st.extracted.miles_expiry
                          ? ` · expira ${formatDateBR(st.extracted.miles_expiry)}`
                          : ''}
                        {st.extracted.elite_status ? ` · ${st.extracted.elite_status}` : ''}
                        {movements.length > 0 ? ` · ${movements.length} movimentações` : ''}
                        {st.extracted.holder ? ` · titular: ${st.extracted.holder}` : ''}
                      </p>
                      {(() => {
                        const dup = findDupProgram(st.extracted, existingPrograms)
                        if (!dup) return null
                        const action = getDupAction('program', i)
                        const info: DupInfo = {
                          existingId: dup.id,
                          label: dupLabelProgram(dup),
                          wouldChange: replaceWouldChangeProgram(st.extracted, dup),
                        }
                        return action === 'add' ? (
                          <DuplicateDupRow
                            info={info}
                            saving={saving}
                            onPick={(a) =>
                              setDupActions((prev) => ({ ...prev, [dupKey('program', i)]: a }))
                            }
                          />
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-[#B7791F]">
                            {action === 'replace'
                              ? `Vai substituir os dados de "${dup.name}" ao salvar.`
                              : 'Item ignorado — não será gravado.'}
                          </p>
                        )
                      })()}
                      <div className="grid gap-2 mt-2 md:grid-cols-2">
                        <select
                          value={st.programId}
                          onChange={(e) =>
                            setPrograms((prev) =>
                              prev.map((x, xi) =>
                                xi === i ? { ...x, programId: e.target.value } : x,
                              ),
                            )
                          }
                          className="rrmilhas-input w-full h-10 px-3 text-sm text-[#23201A] bg-white"
                        >
                          <option value="">Criar novo programa</option>
                          {existingPrograms.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatMiles(p.balance || 0)} milhas
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>

                  {/* Movimentações do extrato, ligadas a este programa */}
                  {movements.length > 0 && (
                    <div className="mt-3 border-t border-[#E8E2D6] pt-3">
                      <button
                        type="button"
                        onClick={() => setMovesOpen((v) => !v)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#16418F] hover:underline"
                      >
                        {movesOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        Ver movimentações ({movements.length})
                      </button>
                      {movesOpen && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-[#6E6A5E] uppercase tracking-wider">
                                <th className="py-1.5 pr-2 w-8"></th>
                                <th className="py-1.5 pr-3 font-semibold">Data</th>
                                <th className="py-1.5 pr-3 font-semibold">Descrição</th>
                                <th className="py-1.5 font-semibold text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {movements.map((mv, mi) => {
                                const movesPid = resolvedProgramId ?? movesProgramId
                                const dup = findDupMovement(
                                  mv.extracted,
                                  existingMovements,
                                  movesPid,
                                )
                                const action = dup ? getDupAction('movement', mi) : 'add'
                                return (
                                  <MovementRow
                                    key={`m-${mi}`}
                                    state={mv}
                                    saving={saving}
                                    dup={dup ? { id: dup.id, description: dup.description } : null}
                                    onToggle={(sel) =>
                                      setMovements((prev) =>
                                        prev.map((x, xi) =>
                                          xi === mi ? { ...x, selected: sel } : x,
                                        ),
                                      )
                                    }
                                    onDupAction={(a) => {
                                      setDupActions((prev) => ({
                                        ...prev,
                                        [dupKey('movement', mi)]: a,
                                      }))
                                      if (a !== 'add')
                                        setMovements((prev) =>
                                          prev.map((x, xi) =>
                                            xi === mi ? { ...x, selected: a !== 'skip' } : x,
                                          ),
                                        )
                                    }}
                                  />
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Sem programa extraído mas com movimentações: escolhe em qual extrato gravar */}
          {programs.length === 0 && movements.length > 0 && (
            <div className="rounded-xl border border-[#E8E2D6] bg-[#FAF7F0]/60 p-3 space-y-2">
              <p className="text-xs text-[#6E6A5E]">
                {movements.length} movimentações extraídas, mas o documento não identificou o
                programa — escolha em qual extrato gravá-las:
              </p>
              <select
                value={movesProgramId}
                onChange={(e) => setMovesProgramId(e.target.value)}
                className="rrmilhas-input w-full h-10 px-3 text-sm text-[#23201A] bg-white"
              >
                <option value="">Selecione o programa</option>
                {existingPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatMiles(p.balance || 0)} milhas
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Passagens */}
          {flights.length > 0 && (
            <div className="space-y-3">
              {flights.map((st, i) => (
                <Card key={`f-${i}`} className="p-4 border border-[#E8E2D6]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.selected}
                      onChange={(e) =>
                        setFlights((prev) =>
                          prev.map((x, xi) =>
                            xi === i ? { ...x, selected: e.target.checked } : x,
                          ),
                        )
                      }
                      className="mt-0.5 w-4 h-4 accent-[#16418F]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#23201A]">
                        <Plane className="w-4 h-4 inline text-[#0E8FB8] mr-1" />
                        Voo · {st.extracted.airline || 'Companhia não informada'}
                      </p>
                      <p className="text-xs text-[#6E6A5E] mt-0.5">
                        {st.extracted.booking_code ? (
                          <>
                            Localizador{' '}
                            <span className="font-bold">{st.extracted.booking_code}</span> ·{' '}
                          </>
                        ) : null}
                        {st.extracted.miles > 0 ? `${formatMiles(st.extracted.miles)} milhas` : ''}
                        {st.extracted.miles > 0 && st.extracted.fees > 0 ? ' + ' : ''}
                        {st.extracted.fees > 0 ? `R$ ${st.extracted.fees.toFixed(2)} de taxas` : ''}
                      </p>
                      {(() => {
                        const dup = findDupFlight(st.extracted, existingFlights)
                        if (!dup) return null
                        const action = getDupAction('flight', i)
                        const info: DupInfo = {
                          existingId: dup.id,
                          label: dupLabelFlight(dup),
                          wouldChange: replaceWouldChangeFlight(st.extracted, dup),
                        }
                        return action === 'add' ? (
                          <DuplicateDupRow
                            info={info}
                            saving={saving}
                            onPick={(a) =>
                              setDupActions((prev) => ({ ...prev, [dupKey('flight', i)]: a }))
                            }
                          />
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-[#B7791F]">
                            {action === 'replace'
                              ? 'Vai substituir a passagem existente ao salvar.'
                              : 'Item ignorado — não será gravado.'}
                          </p>
                        )
                      })()}

                      {/* Trechos com datas, horários e assentos */}
                      <div className="mt-2 space-y-1.5">
                        {st.extracted.segments.map((s, si) => (
                          <div
                            key={si}
                            className="rounded-lg bg-[#F3EFE6] border border-[#E8E2D6] px-3 py-2 text-xs text-[#23201A]"
                          >
                            <span className="font-bold">
                              {s.origin} → {s.destination}
                            </span>
                            {s.datetime ? ` · ${formatDateTimeBR(s.datetime)}` : ''}
                            {s.arrival_datetime
                              ? ` · chegada ${formatDateTimeBR(s.arrival_datetime)}`
                              : ''}
                            {s.seat ? ` · assento ${s.seat}` : ''}
                          </div>
                        ))}
                      </div>

                      {st.extracted.passengers.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {st.extracted.passengers.map((p, pi) => (
                            <label
                              key={pi}
                              className="flex items-center gap-1.5 text-xs text-[#23201A]"
                            >
                              <input
                                type="checkbox"
                                checked={st.passengerChecks[pi] ?? true}
                                onChange={(e) =>
                                  setFlights((prev) =>
                                    prev.map((x, xi) =>
                                      xi === i
                                        ? {
                                            ...x,
                                            passengerChecks: x.passengerChecks.map((c, ci) =>
                                              ci === pi ? e.target.checked : c,
                                            ),
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="w-3.5 h-3.5 accent-[#16418F]"
                              />
                              {p}
                            </label>
                          ))}
                        </div>
                      )}
                      {st.passengerChecks.some(Boolean) && (
                        <div className="grid gap-2 mt-2 md:grid-cols-2">
                          <Input
                            value={st.trip}
                            onChange={(e) =>
                              setFlights((prev) =>
                                prev.map((x, xi) =>
                                  xi === i ? { ...x, trip: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder="Viagem (opcional)"
                            className="rrmilhas-input h-10"
                            list="import-trip-suggestions"
                          />
                          <select
                            value={st.programId}
                            onChange={(e) =>
                              setFlights((prev) =>
                                prev.map((x, xi) =>
                                  xi === i ? { ...x, programId: e.target.value } : x,
                                ),
                              )
                            }
                            className="rrmilhas-input w-full h-10 px-3 text-sm text-[#23201A] bg-white"
                          >
                            <option value="">Programa de milhas (detecta por companhia)</option>
                            {existingPrograms.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — {formatMiles(p.balance || 0)} milhas
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          )}

          {/* Hospedagens */}
          {hotels.length > 0 && (
            <div className="space-y-3">
              {hotels.map((st, i) => (
                <Card key={`h-${i}`} className="p-4 border border-[#E8E2D6]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.selected}
                      onChange={(e) =>
                        setHotels((prev) =>
                          prev.map((x, xi) =>
                            xi === i ? { ...x, selected: e.target.checked } : x,
                          ),
                        )
                      }
                      className="mt-0.5 w-4 h-4 accent-[#16418F]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#23201A]">
                        <BedDouble className="w-4 h-4 inline text-[#0E8FB8] mr-1" />
                        Hospedagem · {st.extracted.name}
                      </p>
                      <p className="text-xs text-[#6E6A5E] mt-0.5">
                        {st.extracted.destination ? `${st.extracted.destination} · ` : ''}
                        {st.extracted.check_in ? `${formatDateBR(st.extracted.check_in)}` : ''}
                        {st.extracted.check_out ? ` → ${formatDateBR(st.extracted.check_out)}` : ''}
                        {st.extracted.miles > 0
                          ? ` · ${formatMiles(st.extracted.miles)} milhas`
                          : ''}
                        {st.extracted.cash_amount > 0
                          ? ` · R$ ${st.extracted.cash_amount.toFixed(2)}`
                          : ''}
                        {st.extracted.fees > 0 ? ` · R$ ${st.extracted.fees.toFixed(2)} taxas` : ''}
                        {st.extracted.booking_code
                          ? ` · localizador ${st.extracted.booking_code}`
                          : ''}
                      </p>
                      {(() => {
                        const dup = findDupHotel(st.extracted, existingHotels)
                        if (!dup) return null
                        const action = getDupAction('hotel', i)
                        const info: DupInfo = {
                          existingId: dup.id,
                          label: dupLabelHotel(dup),
                          wouldChange: replaceWouldChangeHotel(st.extracted, dup),
                        }
                        return action === 'add' ? (
                          <DuplicateDupRow
                            info={info}
                            saving={saving}
                            onPick={(a) =>
                              setDupActions((prev) => ({ ...prev, [dupKey('hotel', i)]: a }))
                            }
                          />
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-[#B7791F]">
                            {action === 'replace'
                              ? 'Vai substituir a hospedagem existente ao salvar.'
                              : 'Item ignorado — não será gravado.'}
                          </p>
                        )
                      })()}
                      <div className="grid gap-2 mt-2 md:grid-cols-2">
                        <Input
                          value={st.trip}
                          onChange={(e) =>
                            setHotels((prev) =>
                              prev.map((x, xi) => (xi === i ? { ...x, trip: e.target.value } : x)),
                            )
                          }
                          placeholder="Viagem (opcional)"
                          className="rrmilhas-input h-10"
                          list="import-trip-suggestions"
                        />
                      </div>
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          )}

          {/* Viagens */}
          {trips.length > 0 && (
            <div className="space-y-3">
              {trips.map((st, i) => (
                <Card key={`t-${i}`} className="p-4 border border-[#E8E2D6]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.selected}
                      onChange={(e) =>
                        setTrips((prev) =>
                          prev.map((x, xi) =>
                            xi === i ? { ...x, selected: e.target.checked } : x,
                          ),
                        )
                      }
                      className="mt-0.5 w-4 h-4 accent-[#16418F]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#23201A]">
                        <MapIcon className="w-4 h-4 inline text-[#0E8FB8] mr-1" />
                        Viagem · {st.extracted.name}
                      </p>
                      {st.extracted.duplicate_of && (
                        <DuplicateAlert label={dupShort(st.extracted.duplicate_of)} />
                      )}
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          )}

          {/* Passageiros extraídos: nome, CPF, nascimento — com duplicidade */}
          <PassengersSection
            state={passengers}
            existingPassengers={existingPassengers}
            saving={saving}
            onToggle={(i, sel) =>
              setPassengers((prev) => prev.map((x, xi) => (xi === i ? { ...x, selected: sel } : x)))
            }
            onDupAction={(i, a) => {
              setDupActions((prev) => ({ ...prev, [dupKey('passenger', i)]: a }))
              if (a !== 'add')
                setPassengers((prev) =>
                  prev.map((x, xi) => (xi === i ? { ...x, selected: a !== 'skip' } : x)),
                )
            }}
          />

          <datalist id="import-trip-suggestions">
            {existingTrips.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>

          {/* Excluir lançamentos/passagens/hospedagens existentes — com recálculo */}
          <DeleteExistingPanel onDeleted={() => setDataVersion((v) => v + 1)} />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAddSelected}
              disabled={saving || selectedCount === 0}
              className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
            >
              {saving
                ? 'Adicionando...'
                : `Adicionar selecionados${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </Button>
            <Button onClick={resetAll} variant="outline" disabled={saving} className="rounded-xl">
              Descartar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
