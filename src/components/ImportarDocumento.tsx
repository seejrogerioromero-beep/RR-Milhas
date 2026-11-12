import { useEffect, useMemo, useState } from 'react'
import {
  UploadCloud,
  FileText,
  ClipboardPaste,
  RefreshCw,
  AlertTriangle,
  Plane,
  Star,
  Map as MapIcon,
  Check,
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
  ImportExtractError,
  type ExtractResult,
  type ExtractedFlight,
  type ExtractedProgram,
  type ExtractedTrip,
} from '@/services/importExtract'
import { formatDateTimeBR, formatMiles, parseNumberInput } from '@/lib/miles'
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

  const handleRead = async () => {
    if (!canRead) return
    setReading(true)
    setExtractError(null)
    setResult(null)
    setFlights([])
    setPrograms([])
    setTrips([])
    try {
      const res = await extractFromDocument({
        text: text.trim(),
        file: file ?? undefined,
        imageCount: 0,
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
      setTrips(res.trips.map((t) => ({ extracted: t, selected: true })))
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
      // 1. Programas (com saldo, replicando o EntryForm: entrada + ajuste de saldo)
      for (const st of programs) {
        if (!st.selected) continue
        const { extracted } = st
        if (!extracted.name.trim()) continue
        let program = await findOrCreateProgram(extracted.name)
        if (!program) continue
        const entry: Record<string, unknown> = {
          program: program.id,
          type: 'entrada',
          description: 'Importado de um documento',
          quantity: extracted.balance || 0,
          date: new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
        }
        if (extracted.balance > 0) {
          // Entrada de saldo com custo médio: mantém o custo existente (sem dado novo)
          entry.cost_per_thousand = program.cost_per_thousand || 0
        }
        await pb.collection('program_entries').create(entry)
        await pb.collection('programs').update(program.id, {
          balance: (program.balance || 0) + (extracted.balance || 0),
          ...(extracted.miles_expiry ? { miles_expiry: extracted.miles_expiry } : {}),
          ...(extracted.elite_status ? { elite_status: extracted.elite_status } : {}),
        })
        program = { ...program, balance: (program.balance || 0) + (extracted.balance || 0) }
      }

      // 2. Viagens
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

      // 3. Passagens
      for (const st of flights) {
        if (!st.selected) continue
        const { extracted } = st
        if (!extracted.origin || !extracted.destination) continue
        const origin = extracted.origin.toUpperCase()
        const destination = extracted.destination.toUpperCase()
        const route = `${origin} → ${destination}`
        const dateStr = extracted.datetime || ''
        const isoDate = dateStr ? `${dateStr.slice(0, 10)} 12:00:00.000Z` : ''
        const depTime = dateStr.slice(11, 16) || undefined
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
          departure: isoDate || new Date().toISOString().slice(0, 10) + ' 12:00:00.000Date',
          payment_method: 'milhas',
          miles_used: miles,
          fees: 0,
          cash_amount: 0,
          reference_value: 0,
          booking_code: undefined,
          status: 'confirmada',
          origin,
          destination,
          cabin: 'economica',
          roundtrip: false,
          outbound_date: isoDate || new Date().toISOString().slice(0, 10) + ' 12:00:00.000Date',
          passengers: extracted.passengers.join(', ') || undefined,
          issued_at: new Date().toISOString().slice(0, 10) + ' 12:00:00.000Z',
          trip: st.trip.trim() || undefined,
          ...(programId ? { program: programId, entry: entryId } : {}),
        })

        // 4. Passageiros citados que ainda não existem viram cadastro
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
              if (dropped) {
                const ok = /\.(pdf|jpe?g|png|webp)$/i.test(dropped.name)
                if (ok) {
                  setFile(dropped)
                  setExtractError(null)
                } else {
                  setExtractError('Formato não suportado. Use PDF, JPG, PNG ou WebP.')
                }
              }
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
                if (chosen) {
                  setFile(chosen)
                  setExtractError(null)
                }
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
          O arquivo é lido no seu navegador e o conteúdo vai para o Claude só para extrair os dados.
          Nada do documento é armazenado. Números de cartão, CPF e senhas são ignorados.
        </p>
      </div>

      {extractError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#C4452F]/40 bg-[#C4452F]/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#C4452F] mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-[#C4452F]">
            <p className="font-semibold">{extractError}</p>
          </div>
          <Button
            onClick={handleRead}
            size="sm"
            variant="outline"
            className="rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10 shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Ler informações
          </Button>
        </div>
      )}

      {/* REVISE ANTES DE ADICIONAR */}
      {result && (
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#23201A]">Revise antes de adicionar</h3>
          <p className="text-xs text-[#6E6A5E] font-mono bg-[#FAF7F0] border border-[#E8E2D6] rounded-xl p-3 whitespace-pre-wrap break-words">
            {text}
          </p>
          <p className="text-xs text-[#6E6A5E]">
            Lido: {result.meta.pages} páginas · {result.meta.characters} caracteres ·{' '}
            {result.meta.images} imagens enviadas
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
                        {st.extracted.name} · saldo {st.extracted.balance.toLocaleString('pt-BR')}
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
                </Card>
              ))}
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
