import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plane,
  Hotel,
  ArrowUpRight,
  Sparkles,
  Coins,
  AlertTriangle,
  RefreshCw,
  Timer,
  Wallet,
  Crown,
  Map,
  Hourglass,
} from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  ProgramRecord,
  FlightRecord,
  HotelRecord,
  ProgramEntryRecord,
  TripRecord,
  ExpectedPointRecord,
} from '@/types/database'
import { formatMiles, formatBRL, formatDateBR, formatDateTimeBR } from '@/lib/miles'
import { ProgramFormSheet, FlightFormSheet, HotelFormSheet } from '@/components/forms'
import { cn } from '@/lib/utils'

export default function Inicio() {
  const { user } = useAuth()
  const firstName = (user?.name || '').split(' ')[0] || 'Rogério'

  const [programs, setPrograms] = useState<ProgramRecord[]>([])
  const [flights, setFlights] = useState<FlightRecord[]>([])
  const [hotels, setHotels] = useState<HotelRecord[]>([])
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [expected, setExpected] = useState<ExpectedPointRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [programSheet, setProgramSheet] = useState(false)
  const [flightSheet, setFlightSheet] = useState(false)
  const [hotelSheet, setHotelSheet] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [p, f, h, tr, ep] = await Promise.all([
        pb.collection('programs').getFullList({ sort: 'name' }),
        pb.collection('flights').getFullList({ sort: '-departure' }),
        pb.collection('hotels').getFullList({ sort: '-check_out' }),
        pb.collection('trips').getFullList({ sort: 'start_date' }),
        pb.collection('expected_points').getFullList({ filter: "status='pendente'" }),
      ])
      setPrograms(p as unknown as ProgramRecord[])
      setFlights(f as unknown as FlightRecord[])
      setHotels(h as unknown as HotelRecord[])
      setTrips(tr as unknown as TripRecord[])
      setExpected(ep as unknown as ExpectedPointRecord[])
      setLoadError(null)
    } catch (err) {
      console.error('Inicio: falha ao carregar dados', err)
      setLoadError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime<ProgramRecord>('programs', () => reload())
  useRealtime<FlightRecord>('flights', () => reload())
  useRealtime<HotelRecord>('hotels', () => reload())
  useRealtime<ProgramEntryRecord>('program_entries', () => reload())
  useRealtime<TripRecord>('trips', () => reload())
  useRealtime<ExpectedPointRecord>('expected_points', () => reload())

  const now = Date.now()
  const upcomingFlights = flights
    .filter((f) => new Date(f.departure).getTime() >= now - 12 * 3600 * 1000)
    .sort((a, b) => a.departure.localeCompare(b.departure))
    .slice(0, 3)
  const upcomingHotels = hotels
    .filter((h) => new Date(h.check_out).getTime() >= now)
    .sort((a, b) => a.check_out.localeCompare(b.check_out))
    .slice(0, 3)

  // Patrimônio em milhas: para cada programa com saldo e custo do milheiro, saldo × (milheiro/1000)
  const patrimonio = programs.reduce(
    (acc, p) =>
      (p.balance || 0) > 0 && (p.cost_per_thousand || 0) > 0
        ? acc + ((p.balance || 0) / 1000) * (p.cost_per_thousand || 0)
        : acc,
    0,
  )

  // Próxima viagem futura: mais próximo por start_date (fallback: sem data, depois de criação)
  const DAY_MS = 86400000
  const today = new Date(new Date().toISOString().slice(0, 10)) // meia-noite UTC, para comparar com start_date (UTC)
  const nextTrip = trips
    .filter((t) => !t.start_date || new Date(t.start_date).getTime() >= today.getTime())
    .sort((a, b) => {
      const da = a.start_date || '9999-12-31'
      const db = b.start_date || '9999-12-31'
      if (da === db) return (a.end_date || '9999-12-31').localeCompare(b.end_date || '9999-12-31')
      return da.localeCompare(db)
    })[0]
  const nextTripCountdown = (() => {
    if (!nextTrip?.start_date) return null
    const ms = new Date(nextTrip.start_date).getTime() - today.getTime()
    const days = Math.round(ms / DAY_MS)
    if (isNaN(days) || days < 0) return null
    if (days === 0) return 'é hoje!'
    if (days === 1) return 'é amanhã'
    return `em ${days} dias`
  })()

  // Total de milhas pendentes a chegar (versão manual do Balance Watch)
  const expectedMiles = expected.reduce((sum, e) => sum + (e.miles || 0), 0)

  // Alertas de vencimento: saldo > 0 e validade nos próximos 90 dias
  const expiryAlerts = programs
    .map((p) => {
      if (!(p.balance > 0) || !p.miles_expiry) return null
      const days = Math.ceil((new Date(p.miles_expiry).getTime() - now) / DAY_MS)
      if (isNaN(days) || days > 90) return null
      return { program: p, days }
    })
    .filter((a): a is { program: ProgramRecord; days: number } => a !== null)
    .sort((a, b) => a.days - b.days)

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Início</p>
          <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Olá, {firstName}</h1>
          <p className="text-sm text-[#6E6A5E] mt-2">
            Seus saldos de milhas e as próximas passagens e hospedagens.
          </p>
        </div>

        {loadError && !loading && (
          <div className="flex items-start gap-3 rounded-xl border border-[#C4452F]/40 bg-[#C4452F]/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-[#C4452F] mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-[#C4452F]">
              <p className="font-semibold">Não foi possível carregar seus dados.</p>
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

        {/* ALERTAS DE VENCIMENTO DE MILHAS */}
        {!loading && expiryAlerts.length > 0 && (
          <div className="space-y-2">
            {expiryAlerts.map(({ program: p, days }) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3',
                  days <= 15
                    ? 'border-[#C4452F]/40 bg-[#C4452F]/10'
                    : 'border-[#D9A404]/40 bg-[#D9A404]/10',
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    days <= 15 ? 'text-[#C4452F]' : 'text-[#B8860B]',
                  )}
                />
                <p
                  className={cn(
                    'text-sm font-semibold',
                    days <= 15 ? 'text-[#C4452F]' : 'text-[#B8860B]',
                  )}
                >
                  {formatMiles(p.balance)} milhas {p.name}{' '}
                  {days < 0 ? 'expiraram' : days === 0 ? 'expiram hoje' : `expiram em ${days} dias`}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* PATRIMÔNIO EM MILHAS + PRÓXIMA VIAGEM + MILHAS A CHEGAR */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="paper-card p-6">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-[#16418F]/10 shrink-0">
                <Wallet className="w-5 h-5 text-[#16418F]" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                  Patrimônio em milhas
                </p>
                <p className="font-serif text-2xl font-bold text-[#23201A] tabular-nums">
                  {formatBRL(patrimonio)}
                </p>
                {patrimonio === 0 && (
                  <p className="text-xs text-[#6E6A5E] mt-0.5">
                    Informe o saldo e o custo do milheiro dos seus programas para calcular.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="paper-card p-6">
            <Link to="/viagens" className="block group">
              <div className="flex items-center gap-4">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-[#16418F]/10 shrink-0">
                  <Map className="w-5 h-5 text-[#16418F]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                    Próxima viagem
                  </p>
                  {nextTrip ? (
                    <>
                      <p className="font-serif text-xl font-bold text-[#23201A] truncate group-hover:text-[#16418F] transition-colors">
                        {nextTrip.name}
                      </p>
                      <p className="text-xs text-[#6E6A5E] mt-0.5">
                        {nextTripCountdown ?? formatDateBR(nextTrip.start_date)}
                        {nextTrip.destination ? ` · ${nextTrip.destination}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[#6E6A5E] mt-0.5">
                      Nenhuma viagem cadastrada — comece aqui.
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </Card>

          <Card className="paper-card p-6">
            <Link to="/pontos-esperados" className="block group">
              <div className="flex items-center gap-4">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-[#16418F]/10 shrink-0">
                  <Hourglass className="w-5 h-5 text-[#16418F]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                    Milhas a chegar
                  </p>
                  {expected.length > 0 ? (
                    <>
                      <p className="font-serif text-2xl font-bold text-[#23201A] tabular-nums">
                        {formatMiles(expectedMiles)}
                        <span className="text-sm font-normal text-[#6E6A5E]"> milhas</span>
                      </p>
                      <p className="text-xs text-[#6E6A5E] mt-0.5">
                        {expected.length === 1
                          ? '1 item pendente'
                          : `${expected.length} itens pendentes`}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[#6E6A5E] mt-0.5">Nada registrado — comece aqui.</p>
                  )}
                </div>
              </div>
            </Link>
          </Card>
        </div>

        {/* MILHAS */}
        <Card className="paper-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                Milhas
              </p>
              <h2 className="font-serif text-xl font-semibold text-[#23201A]">Seus programas</h2>
            </div>
            {programs.length > 0 && (
              <Link
                to="/milhas"
                className="text-sm font-semibold text-[#16418F] hover:text-[#0E8FB8] flex items-center gap-0.5"
              >
                Ver todos <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-[#6E6A5E] py-4">Carregando...</p>
          ) : programs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E8E2D6] bg-white py-8 text-center">
              <p className="text-sm text-[#6E6A5E]">
                Você ainda não cadastrou nenhum programa de milhas.
              </p>
              <Button
                onClick={() => setProgramSheet(true)}
                className="mt-3 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
              >
                Cadastrar programa
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {programs.map((p) => (
                <Link
                  key={p.id}
                  to="/milhas"
                  className="rounded-xl border border-[#E8E2D6] bg-[#FAF7F0]/60 p-4 hover:border-[#16418F]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#23201A]">
                      <Coins className="w-4 h-4 text-[#0E8FB8]" /> {p.name}
                    </span>
                    <span className="text-xs text-[#6E6A5E]">
                      {formatBRL(p.cost_per_thousand || 0)}/milheiro
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-bold text-[#16418F] tabular-nums mt-2">
                    {formatMiles(p.balance || 0)}
                    <span className="text-sm font-normal text-[#6E6A5E]"> milhas</span>
                  </p>
                  {(p.elite_status || p.miles_expiry) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {p.elite_status && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#16418F]/10 text-[#16418F]">
                          <Crown className="w-3 h-3" /> {p.elite_status}
                        </span>
                      )}
                      {p.miles_expiry && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#6E6A5E]/10 text-[#6E6A5E]">
                          <Timer className="w-3 h-3" /> expira {formatDateBR(p.miles_expiry)}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* VOOS + HOTÉIS */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="paper-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                  Voos
                </p>
                <h2 className="font-serif text-xl font-semibold text-[#23201A]">
                  Próximas passagens
                </h2>
              </div>
              {upcomingFlights.length > 0 && (
                <Link
                  to="/passagens"
                  className="text-sm font-semibold text-[#16418F] hover:text-[#0E8FB8] flex items-center gap-0.5"
                >
                  Ver todas <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            {upcomingFlights.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E8E2D6] bg-white py-8 text-center">
                <p className="text-sm text-[#6E6A5E]">
                  Nenhuma passagem com embarque daqui para frente.
                </p>
                <Button
                  onClick={() => setFlightSheet(true)}
                  className="mt-3 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
                >
                  Registrar passagem
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingFlights.map((f) => (
                  <Link
                    key={f.id}
                    to="/passagens"
                    className="block rounded-xl border border-[#E8E2D6] bg-[#FAF7F0]/60 p-4 hover:border-[#16418F]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#23201A]">
                        <Plane className="w-4 h-4 text-[#0E8FB8]" /> {f.route}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          f.payment_method === 'milhas'
                            ? 'bg-[#0E8FB8]/10 text-[#0E8FB8]'
                            : 'bg-[#16418F]/10 text-[#16418F]',
                        )}
                      >
                        {f.payment_method === 'milhas'
                          ? `${formatMiles(f.miles_used || 0)} milhas`
                          : formatBRL(f.cash_amount || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E6A5E] mt-1">
                      {formatDateTimeBR(f.departure)}
                      {f.airline ? ` · ${f.airline}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="paper-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E8FB8]">
                  Hotéis
                </p>
                <h2 className="font-serif text-xl font-semibold text-[#23201A]">
                  Próximas hospedagens
                </h2>
              </div>
              {upcomingHotels.length > 0 && (
                <Link
                  to="/hoteis"
                  className="text-sm font-semibold text-[#16418F] hover:text-[#0E8FB8] flex items-center gap-0.5"
                >
                  Ver todas <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            {upcomingHotels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E8E2D6] bg-white py-8 text-center">
                <p className="text-sm text-[#6E6A5E]">
                  Nenhuma hospedagem com check-out daqui para frente.
                </p>
                <Button
                  onClick={() => setHotelSheet(true)}
                  className="mt-3 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
                >
                  Registrar hospedagem
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingHotels.map((h) => (
                  <Link
                    key={h.id}
                    to="/hoteis"
                    className="block rounded-xl border border-[#E8E2D6] bg-[#FAF7F0]/60 p-4 hover:border-[#16418F]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#23201A]">
                        <Hotel className="w-4 h-4 text-[#0E8FB8]" /> {h.hotel}
                      </span>
                      {h.total_value ? (
                        <span className="text-xs font-semibold text-[#16418F]">
                          {formatBRL(h.total_value)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#6E6A5E] mt-1">
                      {formatDateBR(h.check_in)} → {formatDateBR(h.check_out)}
                      {h.destination ? ` · ${h.destination}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-[#6E6A5E] justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#0E8FB8]" />
          RRMILHAS — controle pessoal de milhas e viagens
        </p>

        <ProgramFormSheet open={programSheet} onClose={() => setProgramSheet(false)} />
        <FlightFormSheet
          open={flightSheet}
          onClose={() => setFlightSheet(false)}
          programs={programs}
        />
        <HotelFormSheet
          open={hotelSheet}
          onClose={() => setHotelSheet(false)}
          programs={programs}
        />
      </div>
    </Layout>
  )
}
