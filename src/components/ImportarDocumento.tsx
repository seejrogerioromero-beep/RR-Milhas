import { useEffect, useState } from 'react'
import {
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  Plane,
  Star,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
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
  type ExtractedMovement,
  type ExtractedProgram,
  type ExtractedTrip,
} from '@/services/importExtract'
import { formatDateBR, formatDateTimeBR, formatMiles, parseNumberInput } from '@/lib/miles'
import { isForbiddenProgramName } from '@/lib/programCatalog'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp'

interface ReviewFlightState {
  extracted: ExtractedFlight
  selected: boolean
  passengerChecks: boolean[]
  trip: string
  milheiro: string
  programId: string
}

interface ReviewProgramState {
  extracted: ExtractedProgram
  selected: boolean
  holderChoice: string // 'eu' | nome de passageiro | 'outro'
  customHolder: string
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

/** Tela "Importar de um documento": arquivo/colar texto → extração → revisão → gravar. */
export function ImportarDocumento({ onDone }: { onDone: () => void }) {
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [reading, setReading] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [flights, setFlights] = useState<ReviewFlightState[]>([])
  const [programs, setPrograms] = useState<ReviewProgramState[]>([])
  const [movements, setMovements] = useState<ReviewMovementState[]>([])
  const [movesOpen, setMovesOpen] = useState(false)
  const [trips, setTrips] = useState<ReviewTripState[]>([])
  const [saving, setSaving] = useState(false)

  // Dados de apoio: programas, passageiros e viagens cadastrados
  const [existingPrograms, setExistingPrograms] = useState<ProgramRecord[]>([])
  const [existingPassengers, setExistingPassengers] = useState<PassengerRecord[]>([])
  const [existingTrips, setExistingTrips] = useState<TripRecord[]>([])

  useEffect(() => {
    Promise.all([
      pb.collection('programs').getFullList({ sort: 'name' }),
      pb.collection('passengers').getFullList({ sort: 'name' }),
      pb.collection('trips').getFullList({ sort: 'name' }),
    ])
      .then(([p, ps, t]) => {
        setExistingPrograms(p as unknown as ProgramRecord[])
        setExistingPassengers(ps as unknown as PassengerRecord[])
        setExistingTrips(t as unknown as TripRecord[])
      })
      .catch(() => {})
  }, [])

  const canRead = (text.trim().length >= 10 || file != null) && !reading

  const acceptFile = (chosen: File) => {
    const ok = /\.(pdf|jpe?g|png|webp)$/i.test(chosen.name)
    if (ok) {
      setFile(chosen)
      setExtractError(null)
      setResult(null)
      setFlights([])
      setPrograms([])
      setMovements([])
      setTrips([])
    } else {
      setExtractError('Formato não suportado. Use PDF, JPG, PNG ou WebP.')
    }
  }

  const handleRead = async () => {
    if (!canRead) return
    setReading(true)
    setExtractError(null)
    setResult(null)
    setFlights([])
    setPrograms([])
    setMovements([])
    setTrips([])
    try {
      const res = await extractFromDocument({
        text: text.trim(),
        file: file ?? undefined,
        imageCount: file && isImageFile(file) ? 1 : 0,
      })
      setResult(res)
      setFlights(
        res.flights.map((f) => ({
          extracted: f,
          selected: true,
          passengerChecks: f.passengers.map(() => true),
          trip: '',
          milheiro: '',
          programId: '',
        })),
      )
      setPrograms(
        res.programs.map((p) => ({
          extracted: p,
          selected: true,
          holderChoice: 'eu',
          customHolder: '',
          programId: '',
        })),
      )
      setMovements(res.movements.map((m) => ({ extracted: m, selected: true })))
      setTrips(res.trips.map((t) => ({ extracted: t, selected: true })))
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
    setFile(null)
    setResult(null)
    setFlights([])
    setPrograms([])
    setMovements([])
    setTrips([])
    setExtractError(null)
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

  /** Grava apenas os itens marcados, replicando o mecanismo do EntryForm/FlightFormDialog. */
  const handleAddSelected = async () => {
    setSaving(true)
    try {
      // 1. Programas: o saldo extraído é o SALDO ATUAL do extrato — substitui
      // (não soma). Com saldo 0/não informado, mantém o saldo atual.
      let resolvedProgram: ProgramRecord | null = null
      for (const st of programs) {
        if (!st.selected) continue
        const { extracted } = st
        if (!extracted.name.trim()) continue
        let program = await findOrCreateProgram(extracted.name)
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
        program = { ...program, ...patch } as ProgramRecord
        resolvedProgram = program
      }

      // 2. Movimentações do extrato: uma program_entry por linha marcada.
      // Se o saldo extraído veio informado, ele já é o resultado das
      // movimentações (só grava as linhas); se não veio, aplica ao saldo atual.
      const selectedMoves = movements.filter((m) => m.selected && m.extracted.description.trim())
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
          await pb.collection('trips').create({ name, destination: name })
          setExistingTrips((prev) => [...prev, { id: 'novo', name } as unknown as TripRecord])
        }
      }

      // 4. Passagens
      for (const st of flights) {
        if (!st.selected) continue
        const { extracted } = st
        if (!extracted.origin || !extracted.destination) continue
        const origin = extracted.origin.toUpperCase()
        const destination = extracted.destination.toUpperCase()
        const route = `${origin} → ${destination}`
        const dateStr = extracted.datetime || ''
        const isoDate = dateStr ? `${dateStr.slice(0, 10)} 12:00:00.000Z` : ''
        const miles = parseNumberInput(st.milheiro) || 0

        let programId = ''
        let programBalance = 0
        if (st.programId) {
          const chosen = existingPrograms.find((p) => p.id === st.programId)
          programId = chosen?.id || ''
          programBalance = chosen?.balance || 0
        } else {
          const byName = existingPrograms.find(
            (p) => p.name.trim().toLowerCase() === extracted.airline.trim().toLowerCase(),
          )
          programId = byName?.id || ''
          programBalance = byName?.balance || 0
        }

        // Débito no extrato do programa (mesmo mecanismo do FlightFormDialog)
        let entryId: string | undefined
        if (programId) {
          const entry = await pb.collection('program_entries').create({
            program: programId,
            type: 'saida',
            description: `Passagem ${route}`,
            quantity: miles,
            cost_per_thousand:
              existingPrograms.find((p) => p.id === programId)?.cost_per_thousand || 0,
            date: isoDate || new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          })
          entryId = entry.id
          await pb.collection('programs').update(programId, { balance: programBalance - miles })
        }

        await pb.collection('flights').create({
          route,
          airline: extracted.airline.trim() || undefined,
          departure: isoDate || new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          payment_method: 'milhas',
          miles_used: miles,
          fees: 0,
          cash_amount: 0,
          reference_value: 0,
          status: 'confirmada',
          origin,
          destination,
          cabin: 'economica',
          roundtrip: false,
          outbound_date: isoDate || new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          passengers: extracted.passengers.join(', ') || undefined,
          issued_at: new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          trip: st.trip.trim() || undefined,
          ...(programId ? { program: programId, entry: entryId } : {}),
        })

        // 5. Passageiros citados que ainda não existem viram cadastro
        for (const p of extracted.passengers) {
          const name = p.trim()
          if (!name) continue
          const exists = existingPassengers.some(
            (x) => x.name.trim().toLowerCase() === name.toLowerCase(),
          )
          if (!exists) {
            await pb.collection('passengers').create({ name })
            setExistingPassengers((prev) => [
              ...prev,
              { id: `novo-${name}`, name } as unknown as PassengerRecord,
            ])
          }
        }
      }

      toast({
        title: 'Itens adicionados',
        description: 'Só o que você marcou foi gravado. O documento não é armazenado.',
      })
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
    programs.filter((p) => p.selected).length +
    movements.filter((m) => m.selected).length +
    trips.filter((t) => t.selected).length

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
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) acceptFile(dropped)
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
                const chosen = e.target.files?.[0]
                if (chosen) acceptFile(chosen)
              }}
            />
            <UploadCloud className="w-8 h-8 mx-auto text-[#16418F] mb-3" />
            <p className="text-sm font-bold text-[#23201A]">
              {file ? file.name : 'Arraste o arquivo aqui'}
            </p>
            <p className="text-xs text-[#6E6A5E] mt-1">
              ou clique para escolher · PDF, JPG, PNG ou WebP
            </p>
          </label>
          {file && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F3EFE6] border border-[#E8E2D6] px-3 py-2">
              <p className="font-mono text-xs text-[#23201A] break-all">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs font-semibold text-[#16418F] hover:underline shrink-0"
              >
                Tirar
              </button>
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
            {result.meta.characters} caracteres de texto
            {result.meta.images > 0
              ? ` · ${result.meta.images} imagem${result.meta.images > 1 ? 's' : ''} enviada${result.meta.images > 1 ? 's' : ''}`
              : ''}
            {result.meta.truncated ? ' · documento truncado' : ''}
          </p>

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
                      <div className="grid gap-2 mt-2 md:grid-cols-2">
                        <select
                          value={st.holderChoice}
                          onChange={(e) =>
                            setPrograms((prev) =>
                              prev.map((x, xi) =>
                                xi === i ? { ...x, holderChoice: e.target.value } : x,
                              ),
                            )
                          }
                          className="rrmilhas-input w-full h-10 px-3 text-sm text-[#23201A] bg-white"
                        >
                          <option value="eu">Eu</option>
                          {existingPassengers.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
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
                              {movements.map((mv, mi) => (
                                <tr key={`m-${mi}`} className="border-t border-[#E8E2D6]/60">
                                  <td className="py-1.5 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={mv.selected}
                                      onChange={(e) =>
                                        setMovements((prev) =>
                                          prev.map((x, xi) =>
                                            xi === mi ? { ...x, selected: e.target.checked } : x,
                                          ),
                                        )
                                      }
                                      className="w-3.5 h-3.5 accent-[#16418F]"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-3 text-[#23201A] whitespace-nowrap">
                                    {mv.extracted.date ? formatDateBR(mv.extracted.date) : '—'}
                                  </td>
                                  <td className="py-1.5 pr-3 text-[#23201A]">
                                    {mv.extracted.description}
                                  </td>
                                  <td
                                    className={cn(
                                      'py-1.5 text-right tabular-nums whitespace-nowrap',
                                      mv.extracted.amount >= 0
                                        ? 'text-[#0E6E54]'
                                        : 'text-[#C4452F]',
                                    )}
                                  >
                                    {mv.extracted.amount >= 0 ? '+' : '−'}{' '}
                                    {formatMiles(Math.abs(mv.extracted.amount || 0))}
                                  </td>
                                </tr>
                              ))}
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

          {/* Sem programa mas com movimentações: avisa que precisa de programa */}
          {programs.length === 0 && movements.length > 0 && (
            <p className="text-xs text-[#6E6A5E]">
              {movements.length} movimentações extraídas, mas o documento não identificou o programa
              — adicione um programa para gravá-las.
            </p>
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
                        Voo · {st.extracted.origin} → {st.extracted.destination}
                        {st.extracted.datetime
                          ? ` · ${formatDateTimeBR(st.extracted.datetime)}`
                          : ''}
                      </p>
                      <p className="text-xs text-[#6E6A5E] mt-0.5">
                        {st.extracted.passengers.join(', ')}
                      </p>
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
                          <Input
                            value={st.milheiro}
                            onChange={(e) =>
                              setFlights((prev) =>
                                prev.map((x, xi) =>
                                  xi === i
                                    ? { ...x, milheiro: e.target.value.replace(/\D/g, '') }
                                    : x,
                                ),
                              )
                            }
                            placeholder="Milhas usadas (opcional)"
                            className="rrmilhas-input h-10 tabular-nums"
                          />
                        </div>
                      )}
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
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          )}

          <datalist id="import-trip-suggestions">
            {existingTrips.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>

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
