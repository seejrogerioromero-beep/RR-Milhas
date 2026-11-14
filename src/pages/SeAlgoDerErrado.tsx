import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Briefcase,
  Clock,
  FileText,
  Flag,
  HeartPulse,
  MapPin,
  Phone,
  RotateCcw,
  Scale,
  ShieldCheck,
  StickyNote,
  Stamp,
} from 'lucide-react'
import { PageContainer } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  InsuranceCoverageRecord,
  TravelRightCategoria,
  TravelRightPais,
  TravelRightRecord,
} from '@/types/database'
import {
  BANDEIRA_META,
  CATEGORIA_LABEL,
  PAIS_LABEL,
  PAIS_NORMA,
  fetchInsuranceCoverage,
  fetchTravelRights,
  relevantInsurance,
  reviewIsStale,
  rightsFor,
  telHref,
} from '@/lib/travelRights'
import { formatDateBR } from '@/lib/miles'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

interface SituacaoOption {
  key: TravelRightCategoria
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SITUACOES: SituacaoOption[] = [
  { key: 'atraso', label: 'Atraso', icon: Clock },
  { key: 'cancelamento', label: 'Cancelamento', icon: Ban },
  { key: 'pretericao', label: 'Preterição (overbooking)', icon: Ban },
  { key: 'bagagem', label: 'Bagagem', icon: Briefcase },
  { key: 'medico', label: 'Emergência médica', icon: HeartPulse },
]

/** Passos orientados por país + situação (conteúdo do guia, seção 2). */
const GUIA: Record<TravelRightPais, Partial<Record<TravelRightCategoria, string[]>>> = {
  BR: {
    atraso: [
      'Confirme o motivo do problema e peça por escrito — isso define a assistência e uma eventual ação por danos.',
      'Marque o relógio: 1h → comunicação (internet/telefone); 2h → alimentação; 4h ou pernoite → hospedagem + traslado.',
      'Exija a assistência material. Se a companhia não oferecer, compre o razoável e guarde os recibos para reembolso.',
      'Depois de 4h (ou em cancelamento/preterição), ESCOLHA o desfecho: reacomodação, reembolso integral em 7 dias ou remarcação — a escolha é sua, não da companhia.',
      'Houve despesa relevante? Avalie acionar o seguro do cartão (atraso de embarque a partir de 4h) além do direito contra a aérea.',
      'Registre protocolo, nomes, horários e tudo por escrito — no Brasil costuma prevalecer o CDC.',
    ],
    cancelamento: [
      'Confirme o motivo por escrito e marque o horário do aviso.',
      'Escolha o desfecho: reacomodação no próximo voo (próprio ou de terceiros), reembolso integral em até 7 dias ou remarcação sem custo — a escolha é do passageiro.',
      'Mudança grande de horário é tratada como cancelamento.',
      'Se houver despesa relevante (hotel, nova passagem, refeições), avalie acionar o seguro do cartão (atraso de embarque a partir de 4h).',
      'Registre protocolo, nomes, horários e recibos para ação posterior por danos (costuma prevalecer o CDC).',
    ],
    pretericao: [
      'Não aceite voucher na hora sem contabilizar: se a companhia procura voluntários, a compensação é negociada e livre.',
      'Preterido involuntariamente: além da reacomodação/reembolso, compensação financeira imediata de 250 DES (doméstico ≈ R$ 1.750) ou 500 DES (internacional ≈ R$ 3.500) — confirme a cotação do DES na data.',
      'Peça o registro da preterição por escrito.',
      'Registre protocolo, nomes e horários para uma ação posterior.',
    ],
    bagagem: [
      'ANTES de sair da área de bagagem, registre o RIR/PIR no balcão da companhia — sem esse registro, perde o direito.',
      'Prazo de entrega no Brasil: 7 dias (doméstico) ou 21 dias (internacional). Passou o prazo, é extravio: indenização.',
      'Acione o seguro do cartão para atraso de bagagem (itens essenciais) e extravio, somando ao direito contra a aérea.',
      'Guarde etiqueta de bagagem, comprovantes de compra emergencial e fotos.',
    ],
    medico: [
      'Risco de vida: procure o serviço de emergência local primeiro.',
      'Ligue para a central do seguro do cartão ANTES de pagar o que puder — eles orientam a rede e o reembolso.',
      'Pré-requisito: o Bilhete de Seguro precisa ter sido emitido ANTES da viagem — não há cobertura retroativa.',
      'Guarde todos os laudos, recibos e relatórios.',
    ],
  },
  US: {
    atraso: [
      'Não há assistência material obrigatória por lei federal (hotel/comida dependem do customer service plan da companhia) — peça mesmo assim.',
      'Avião parado em solo: desembarque após 3h (doméstico) ou 4h (internacional); comida e água após 2h.',
      'Mudança grande de horário (+3h doméstico / +6h internacional, troca de aeroporto, mais conexões ou downgrade): reembolso automático se você não aceitar a reacomodação.',
      'Houve despesa relevante? Avalie acionar o seguro do cartão (atraso de embarque a partir de 4h).',
      'Registre protocolo, nomes, horários e recibos.',
    ],
    cancelamento: [
      'Se você NÃO aceitar a reacomodação, o reembolso é AUTOMÁTICO — não precisa pedir. Vale também para mudança grande de horário, troca de aeroporto, mais conexões ou downgrade.',
      'Aceitar reacomodação ou voucher faz você abrir mão do reembolso.',
      'Prazo: 7 dias úteis (cartão de crédito) ou 20 dias corridos (outros meios), na forma original de pagamento.',
      'Serviço pago não entregue (assento, wi-fi, entretenimento) também dá reembolso automático.',
    ],
    pretericao: [
      'Se a companhia procura voluntários, a compensação é negociada — só aceite se valer a pena.',
      'Preterido involuntariamente: 200% da tarifa de ida (teto US$ 1.075) com atraso de 1–2h (doméstico) / 1–4h (internacional); 400% (teto US$ 2.150) acima disso.',
      'Chegou em até 1h do previsto: sem compensação.',
      'Peça o registro da preterição por escrito e guarde o cartão de embarque.',
    ],
    bagagem: [
      'ANTES de sair da área de bagagem, registre o RIR/PIR no balcão da companhia.',
      'A mala não chegou em 12h (doméstico) ou 15–30h (internacional): a companhia deve devolver a TAXA de bagagem (reembolso automático).',
      'Acione o seguro do cartão para atraso de bagagem (itens essenciais) e extravio, somando ao direito contra a aérea.',
      'Guarde etiqueta, comprovantes de compra emergencial e fotos.',
    ],
    medico: [
      'Risco de vida: procure o serviço de emergência local primeiro.',
      'Ligue para a central do seguro do cartão ANTES de pagar o que puder — eles orientam a rede e o reembolso.',
      'Pré-requisito: o Bilhete de Seguro precisa ter sido emitido ANTES da viagem — não há cobertura retroativa.',
      'Guarde todos os laudos, recibos e relatórios.',
    ],
  },
}

/** Rótulo e cor de cada categoria no resultado. */
const CAT_META: Record<
  TravelRightCategoria,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  atraso: { icon: Clock, className: 'bg-[#C9A24B]/10 text-[#8A6D1F] border-[#C9A24B]/40' },
  cancelamento: { icon: Ban, className: 'bg-[#C4452F]/10 text-[#C4452F] border-[#C4452F]/30' },
  pretericao: { icon: Ban, className: 'bg-[#C4452F]/10 text-[#C4452F] border-[#C4452F]/30' },
  bagagem: { icon: Briefcase, className: 'bg-[#0E8FB8]/10 text-[#0E8FB8] border-[#0E8FB8]/30' },
  medico: { icon: HeartPulse, className: 'bg-[#16418F]/10 text-[#16418F] border-[#16418F]/30' },
}

/** Telefone clicável: extrai os dígitos e vira link tel:. */
function TelefoneLink({ raw, label }: { raw?: string; label: string }) {
  const href = telHref(raw)
  if (!raw) return null
  if (!href) {
    return (
      <p className="text-xs text-[#4A4638]">
        <span className="font-semibold">{label}:</span> {raw}
      </p>
    )
  }
  return (
    <p className="text-xs text-[#4A4638]">
      <span className="font-semibold">{label}:</span>{' '}
      <a
        href={href}
        className="inline-flex items-center gap-1 font-semibold text-[#16418F] underline decoration-[#16418F]/40 hover:decoration-[#16418F]"
      >
        <Phone className="w-3 h-3" /> {raw}
      </a>
    </p>
  )
}

/** Card de cobertura de seguro (uma linha por cobertura). */
function SeguroCard({ items }: { items: InsuranceCoverageRecord[] }) {
  if (items.length === 0) return null
  const first = items[0]
  const bandeira = BANDEIRA_META[first.bandeira]
  return (
    <Card className="border-[#16418F]/15 bg-white">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-[#23201A] flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-[#16418F]" /> Seguro aplicável
          </p>
          <Badge variant="outline" className={cn('text-[10px]', bandeira.className)}>
            {bandeira.label}
          </Badge>
        </div>
        <ul className="divide-y divide-[#E8E2D6]">
          {items.map((i) => {
            // Valores curtos (ex.: "US$ 175.000") ficam lado a lado; textos longos
            // (ex.: condições do bilhete de seguro) viram bloco próprio para quebrar linha.
            const limite = i.limite_usd || '—'
            const longo = limite.length > 60
            return (
              <li key={i.id} className="py-2 min-w-0">
                {longo ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#4A4638] break-words">
                      {i.cobertura}
                    </p>
                    <p className="text-sm font-semibold text-[#16418F] break-words whitespace-normal">
                      {limite}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <span className="text-sm text-[#4A4638] min-w-0 break-words">
                      {i.cobertura}
                    </span>
                    <span className="text-sm font-semibold text-[#16418F] tabular-nums shrink-0 text-right">
                      {limite}
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {first.condicao && (
          <p className="text-xs text-[#6E6A5E]">
            <span className="font-semibold text-[#8A6D1F]">Condição:</span> {first.condicao}
          </p>
        )}
        {first.emissao && (
          <p className="text-xs text-[#6E6A5E]">
            <span className="font-semibold">Emissão do bilhete:</span> {first.emissao}
          </p>
        )}
        <div className="rounded-xl bg-[#16418F]/5 border border-[#16418F]/15 p-3 space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#16418F]">
            Central de assistência — ligue
          </p>
          <TelefoneLink raw={first.telefone_br} label="Brasil" />
          <TelefoneLink raw={first.telefone_exterior} label="Exterior" />
        </div>
        {reviewIsStale(first.revisado_em) && (
          <p className="flex items-start gap-1.5 text-[11px] text-[#8A6D1F]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Regra revisada há mais de 6
            meses — confira na fonte.
          </p>
        )}
      </div>
    </Card>
  )
}

/** Página "Se algo der errado" — wizard guiado país → situação → resultado. */
export default function SeAlgoDerErrado() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paisParam = searchParams.get('pais')
  const initialPais: TravelRightPais | null =
    paisParam === 'US' ? 'US' : paisParam === 'BR' ? 'BR' : null

  const [step, setStep] = useState<Step>(initialPais ? 2 : 1)
  const [pais, setPais] = useState<TravelRightPais | null>(initialPais)
  const [categoria, setCategoria] = useState<TravelRightCategoria | null>(null)
  const [rights, setRights] = useState<TravelRightRecord[]>([])
  const [insurance, setInsurance] = useState<InsuranceCoverageRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([fetchTravelRights(), fetchInsuranceCoverage()])
      .then(([r, i]) => {
        if (!alive) return
        setRights(r)
        setInsurance(i)
      })
      .catch((err) => console.error('SeAlgoDerErrado: falha ao carregar', err))
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const pickPais = (p: TravelRightPais) => {
    setPais(p)
    setStep(2)
    setSearchParams({ pais: p }, { replace: true })
  }

  const back = () => {
    if (step === 3) {
      setCategoria(null)
      setStep(2)
    } else if (step === 2) {
      setPais(null)
      setStep(1)
      setSearchParams({}, { replace: true })
    }
  }

  const restart = () => {
    setCategoria(null)
    setPais(null)
    setStep(1)
    setSearchParams({}, { replace: true })
  }

  const direitos = useMemo(
    () => (pais && categoria ? rightsFor(rights, pais, categoria) : []),
    [rights, pais, categoria],
  )
  const seguros = useMemo(() => {
    if (!categoria) return []
    const rel = relevantInsurance(insurance, categoria)
    const ordem = ['visa_infinite', 'mastercard_black'] as const
    return ordem.map((b) => rel.filter((i) => i.bandeira === b)).filter((list) => list.length > 0)
  }, [insurance, categoria])

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Ferramentas</p>
          <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Se algo der errado</h1>
          <p className="text-sm text-[#6E6A5E] mt-2">
            Fluxo guiado de direitos do passageiro (ANAC 400 / US DOT) e dos seguros Visa Infinite e
            Mastercard Black.
          </p>
        </div>

        {/* Trilha do wizard */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {([1, 2, 3] as Step[]).map((s, idx) => (
            <span key={s} className="flex items-center gap-2">
              {idx > 0 && <span className="text-[#C9C2B4]">→</span>}
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full',
                  step === s
                    ? 'bg-[#16418F] text-white'
                    : step > s
                      ? 'bg-[#16418F]/10 text-[#16418F]'
                      : 'bg-[#E8E2D6] text-[#6E6A5E]',
                )}
              >
                {s === 1 ? 'País' : s === 2 ? 'Situação' : 'O que fazer'}
              </span>
            </span>
          ))}
        </div>

        {loading && <p className="text-sm text-[#6E6A5E]">Carregando…</p>}

        {/* Passo 1 — país */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-semibold text-[#23201A]">
              Em que país está o voo?
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(['BR', 'US'] as TravelRightPais[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => pickPais(p)}
                  className="text-left rounded-2xl border border-[#E8E2D6] bg-white p-6 hover:border-[#16418F]/40 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16418F]/50"
                >
                  <Flag className="w-6 h-6 text-[#16418F] mb-3" />
                  <p className="font-serif text-lg font-bold text-[#23201A]">{PAIS_LABEL[p]}</p>
                  <p className="text-sm text-[#6E6A5E] mt-1">
                    Regra de referência: {PAIS_NORMA[p]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Passo 2 — situação */}
        {step === 2 && pais && (
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-semibold text-[#23201A]">
              Qual a situação? ({PAIS_LABEL[pais]})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {SITUACOES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setCategoria(s.key)
                    setStep(3)
                  }}
                  className="flex items-center gap-3 text-left rounded-xl border border-[#E8E2D6] bg-white px-4 py-4 hover:border-[#16418F]/40 hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16418F]/50"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-lg bg-[#16418F]/10 shrink-0">
                    <s.icon className="w-4.5 h-4.5 text-[#16418F]" />
                  </span>
                  <span className="text-sm font-semibold text-[#23201A]">{s.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={back}
              className="rounded-xl border-[#16418F]/30 text-[#16418F] hover:bg-[#16418F]/5"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
            </Button>
          </div>
        )}

        {/* Passo 3 — resultado */}
        {step === 3 && pais && categoria && (
          <div className="space-y-5">
            {/* Banner fixo de documentar tudo */}
            <div className="rounded-xl border border-[#16418F]/25 bg-[#16418F]/5 px-4 py-3 flex items-start gap-2.5">
              <StickyNote className="w-4.5 h-4.5 text-[#16418F] shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-[#16418F]">
                Registre tudo: motivo por escrito, cartão de embarque, fotos do painel, protocolo e
                recibos.
              </p>
            </div>

            {/* Passos orientados */}
            <Card className="border-[#E8E2D6] bg-white">
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-[#23201A] flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[#16418F]" />
                    {CATEGORIA_LABEL[categoria]} — {PAIS_LABEL[pais]} ({PAIS_NORMA[pais]})
                  </p>
                  {(() => {
                    const meta = CAT_META[categoria]
                    return (
                      <Badge variant="outline" className={cn('text-[10px]', meta.className)}>
                        <meta.icon className="w-3 h-3 mr-1" /> {CATEGORIA_LABEL[categoria]}
                      </Badge>
                    )
                  })()}
                </div>
                <ol className="space-y-2.5">
                  {(GUIA[pais][categoria] || []).map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#4A4638]">
                      <span className="grid place-items-center w-5 h-5 rounded-full bg-[#16418F]/10 text-[10px] font-bold text-[#16418F] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
            </Card>

            {/* Direitos da collection, filtrados por país + categoria */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
                Direitos registrados ({PAIS_NORMA[pais]})
              </h3>
              {direitos.length === 0 ? (
                <p className="text-sm text-[#6E6A5E]">
                  Nenhum direito registrado para esta combinação ainda.
                </p>
              ) : (
                direitos.map((r) => {
                  const stale = reviewIsStale(r.revisado_em)
                  return (
                    <Card key={r.id} className="border-[#E8E2D6] bg-white">
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-semibold text-[#23201A]">{r.gatilho}</p>
                        <p className="text-sm text-[#4A4638]">{r.direito}</p>
                        {r.prazo && r.prazo !== '—' && (
                          <p className="text-xs text-[#6E6A5E]">
                            <span className="font-semibold">Prazo:</span> {r.prazo}
                          </p>
                        )}
                        {r.observacao && (
                          <p className="text-xs text-[#6E6A5E]">
                            <span className="font-semibold">Obs.:</span> {r.observacao}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#6E6A5E]">
                            <FileText className="w-3 h-3" /> {r.fonte || '—'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#6E6A5E]">
                            <Stamp className="w-3 h-3" />
                            {r.revisado_em
                              ? `Revisado em ${formatDateBR(r.revisado_em.slice(0, 10))}`
                              : 'Sem data de revisão'}
                          </span>
                        </div>
                        {stale && (
                          <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#8A6D1F] bg-[#C9A24B]/10 border border-[#C9A24B]/30 rounded-lg px-2.5 py-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Regra revisada
                            há mais de 6 meses — confira na fonte.
                          </p>
                        )}
                      </div>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Seguro aplicável */}
            {seguros.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
                  Seguro do cartão
                </h3>
                {seguros.map((list) => (
                  <SeguroCard key={list[0].bandeira} items={list} />
                ))}
              </div>
            )}

            {/* Nota de rodapé */}
            <p className="text-[11px] text-[#6E6A5E] flex items-start gap-1.5">
              <Scale className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Material de referência (ANAC
              Resolução 400 e US DOT, pesquisa de 14/11/2026) — não é aconselhamento jurídico.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={back}
                className="rounded-xl border-[#16418F]/30 text-[#16418F] hover:bg-[#16418F]/5"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
              </Button>
              <Button
                variant="outline"
                onClick={restart}
                className="rounded-xl border-[#C9A24B]/40 text-[#8A6D1F] hover:bg-[#C9A24B]/10"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Começar de novo
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
