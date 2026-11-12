import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  NotebookText,
  Filter,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeftRight,
  Users,
  CreditCard,
  FileUp,
} from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { ProgramRecord, ProgramEntryRecord, ProgramEntryType } from '@/types/database'
import { formatMiles, formatDateBR } from '@/lib/miles'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Sheet } from '@/components/Sheet'
import { EntryForm } from '@/components/ProgramStatement'
import { TransferTab } from '@/components/TransferTab'
import { ClubesTab, CartoesTab } from '@/components/ClubesCartoesTabs'
import { ImportarDocumento } from '@/components/ImportarDocumento'
import { cn } from '@/lib/utils'

type Tab = 'lancar' | 'transferir' | 'clubes' | 'cartoes' | 'importar'

const TABS: { id: Tab; label: string; icon: typeof NotebookText }[] = [
  { id: 'lancar', label: 'Lançar', icon: NotebookText },
  { id: 'transferir', label: 'Transferir', icon: ArrowLeftRight },
  { id: 'clubes', label: 'Clubes', icon: Users },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'importar', label: 'Importar', icon: FileUp },
]

/** Lançamentos: entradas, saídas, transferências entre programas, clubes e cartões. */
export default function Lancamentos() {
  const [tab, setTab] = useState<Tab>('lancar')
  const [entries, setEntries] = useState<ProgramEntryRecord[]>([])
  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [programFilter, setProgramFilter] = useState('todos')
  const [typeFilter, setTypeFilter] = useState<'todos' | ProgramEntryType>('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formProgramId, setFormProgramId] = useState('')

  const reload = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([
        pb.collection('program_entries').getFullList({
          sort: '-date,-created',
          expand: 'program',
        }),
        pb.collection('programs').getFullList({ sort: 'name' }),
      ])
      setEntries(e as unknown as ProgramEntryRecord[])
      setPrograms(p as unknown as ProgramRecord[])
      setLoadError(null)
    } catch (err) {
      console.error('Lançamentos: falha ao carregar dados', err)
      setLoadError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<ProgramEntryRecord>('program_entries', () => reload())
  useRealtime<ProgramRecord>('programs', () => reload())

  const programName = useMemo(() => {
    const map = new Map<string, string>()
    programs.forEach((p) => map.set(p.id, p.name))
    return map
  }, [programs])

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (programFilter === 'todos' || e.program === programFilter) &&
          (typeFilter === 'todos' || e.type === typeFilter),
      ),
    [entries, programFilter, typeFilter],
  )

  const totals = useMemo(() => {
    let entrada = 0
    let saida = 0
    filtered.forEach((e) => {
      if (e.type === 'entrada') entrada += e.quantity || 0
      else saida += e.quantity || 0
    })
    return { entrada, saida }
  }, [filtered])

  const openSheet = () => {
    setFormProgramId(programFilter !== 'todos' ? programFilter : (programs[0]?.id ?? ''))
    setSheetOpen(true)
  }

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Milhas</p>
          <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Lançamentos</h1>
          <p className="text-sm text-[#6E6A5E] mt-2">
            Entradas, saídas, transferências entre programas, clubes e cartões.
          </p>
        </div>

        {/* Abas */}
        <div className="inline-flex flex-wrap p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all',
                tab === id ? 'bg-[#16418F] text-white shadow-sm' : 'text-[#6E6A5E] hover:bg-white',
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {loadError && !loading && (
          <div className="flex items-start gap-3 rounded-xl border border-[#C4452F]/40 bg-[#C4452F]/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-[#C4452F] mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-[#C4452F]">
              <p className="font-semibold">Não foi possível carregar os lançamentos.</p>
              <p className="mt-0.5 break-words">{loadError}</p>
            </div>
            <Button
              onClick={reload}
              size="sm"
              variant="outline"
              className="rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10 shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {tab === 'lancar' && (
          <>
            {programs.length === 0 && !loading ? (
              <Card className="paper-card py-14 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                  Comece aqui
                </p>
                <h2 className="font-serif text-2xl font-bold text-[#23201A] mt-2">
                  Cadastre um programa primeiro
                </h2>
                <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
                  Os lançamentos pertencem a um programa de milhas. Cadastre um programa para
                  começar a registrar entradas e saídas.
                </p>
                <Link to="/programas">
                  <Button className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white">
                    Ir para Programas <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </Card>
            ) : (
              <>
                {/* Filtros */}
                <Card className="paper-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
                      <Filter className="w-3.5 h-3.5" /> Filtros
                    </span>
                    <select
                      value={programFilter}
                      onChange={(e) => setProgramFilter(e.target.value)}
                      className="rrmilhas-input h-10 px-3 text-sm text-[#23201A] bg-white"
                      aria-label="Filtrar por programa"
                    >
                      <option value="todos">Todos os programas</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as 'todos' | ProgramEntryType)}
                      className="rrmilhas-input h-10 px-3 text-sm text-[#23201A] bg-white"
                      aria-label="Filtrar por tipo"
                    >
                      <option value="todos">Entradas e saídas</option>
                      <option value="entrada">Somente entradas</option>
                      <option value="saida">Somente saídas</option>
                    </select>
                    <span className="text-xs text-[#6E6A5E] ml-auto">
                      {filtered.length} lançamento{filtered.length === 1 ? '' : 's'} ·{' '}
                      <span className="text-[#0E8FB8] font-semibold">
                        +{formatMiles(totals.entrada)}
                      </span>{' '}
                      /{' '}
                      <span className="text-[#C4452F] font-semibold">
                        −{formatMiles(totals.saida)}
                      </span>
                    </span>
                    <Button
                      onClick={openSheet}
                      size="sm"
                      disabled={programs.length === 0}
                      className="rounded-lg bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Novo lançamento
                    </Button>
                  </div>
                </Card>

                {/* Lista */}
                {loading ? (
                  <p className="text-sm text-[#6E6A5E]">Carregando...</p>
                ) : filtered.length === 0 ? (
                  <Card className="paper-card py-14 text-center">
                    <div className="grid place-items-center w-12 h-12 rounded-2xl bg-[#0E8FB8]/10 mx-auto mb-4">
                      <NotebookText className="w-6 h-6 text-[#0E8FB8]" />
                    </div>
                    <h2 className="font-serif text-xl font-bold text-[#23201A]">
                      Nenhum lançamento encontrado
                    </h2>
                    <p className="text-sm text-[#6E6A5E] mt-2">
                      Ajuste os filtros ou registre um novo lançamento.
                    </p>
                    <Button
                      onClick={openSheet}
                      className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Novo lançamento
                    </Button>
                  </Card>
                ) : (
                  <Card className="paper-card px-5 py-1">
                    {filtered.map((entry) => {
                      const isEntry = entry.type === 'entrada'
                      const name =
                        entry.expand?.program?.name || programName.get(entry.program) || 'Programa'
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 py-3.5 border-b border-[#E8E2D6]/70 last:border-0"
                        >
                          <span
                            className={cn(
                              'grid place-items-center w-9 h-9 rounded-xl shrink-0 text-sm font-bold',
                              isEntry
                                ? 'bg-[#0E8FB8]/10 text-[#0E8FB8]'
                                : 'bg-[#C4452F]/10 text-[#C4452F]',
                            )}
                          >
                            {isEntry ? '+' : '−'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#23201A] truncate">
                              {entry.description}
                            </p>
                            <p className="text-xs text-[#6E6A5E] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-semibold text-[#16418F]">{name}</span>
                              <span>·</span>
                              <span
                                className={cn(
                                  'font-semibold',
                                  isEntry ? 'text-[#0E8FB8]' : 'text-[#C4452F]',
                                )}
                              >
                                {isEntry ? 'Entrada' : 'Saída'}
                              </span>
                              <span>·</span>
                              <span>{formatDateBR(entry.date)}</span>
                              {isEntry && entry.cost_per_thousand ? (
                                <>
                                  <span>·</span>
                                  <span>
                                    Custo: {entry.cost_per_thousand.toFixed(2).replace('.', ',')}
                                    /milheiro
                                  </span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-bold tabular-nums shrink-0',
                              isEntry ? 'text-[#0E8FB8]' : 'text-[#C4452F]',
                            )}
                          >
                            {isEntry ? '+' : '−'} {formatMiles(entry.quantity)}
                            <span className="text-xs font-normal text-[#6E6A5E]"> milhas</span>
                          </span>
                        </div>
                      )
                    })}
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {tab === 'transferir' &&
          (programs.length === 0 ? (
            <Card className="paper-card py-14 text-center">
              <h2 className="font-serif text-xl font-bold text-[#23201A]">
                Cadastre programas primeiro
              </h2>
              <p className="text-sm text-[#6E6A5E] mt-2 max-w-md mx-auto">
                A transferência precisa de um programa de origem (clube ou banco) e um de destino
                (companhia aérea).
              </p>
              <Link to="/programas">
                <Button className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white">
                  Ir para Programas <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </Card>
          ) : (
            <TransferTab programs={programs} onDone={reload} />
          ))}

        {tab === 'clubes' && <ClubesTab programs={programs} onChanged={reload} />}

        {tab === 'cartoes' && <CartoesTab programs={programs} onChanged={reload} />}

        {tab === 'importar' && <ImportarDocumento onDone={reload} />}

        {/* Novo lançamento: escolhe o programa e reaproveita o formulário do extrato */}
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Novo lançamento">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="lanc-program" className="text-xs font-semibold text-[#23201A] block">
                Programa *
              </label>
              <select
                id="lanc-program"
                value={formProgramId}
                onChange={(e) => setFormProgramId(e.target.value)}
                className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white"
              >
                <option value="">Selecione o programa</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatMiles(p.balance || 0)} milhas
                  </option>
                ))}
              </select>
            </div>
            {formProgramId ? (
              <EntryForm
                key={formProgramId}
                programId={formProgramId}
                onDone={() => setSheetOpen(false)}
              />
            ) : (
              <p className="text-sm text-[#6E6A5E]">Escolha um programa para continuar.</p>
            )}
          </div>
        </Sheet>
      </div>
    </Layout>
  )
}
