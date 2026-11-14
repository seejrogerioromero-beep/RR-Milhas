import { useEffect, useMemo, useState } from 'react'
import type {
  CardProfileRecord,
  CreditCardRecord,
  LoungeAccessRecord,
  LoungeRecord,
} from '@/types/database'
import {
  fetchCreditCards,
  fetchCardProfiles,
  fetchLoungeAccess,
  fetchLounges,
  loungeMatchesProfiles,
  STATUS_META,
  TIPO_LABEL,
  REDE_LABEL,
  reviewIsStale,
} from '@/lib/salasVip'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlaneTakeoff, PlaneLanding } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateBR } from '@/lib/miles'

interface TripLoungesProps {
  /** Códigos IATA (3 letras) dos aeroportos da viagem — origem/destino das passagens. */
  codes: string[]
}

/** Salas/restaurantes da base Santander nos aeroportos da viagem, que os cartões ativos permitem usar. */
export default function TripLounges({ codes }: TripLoungesProps) {
  const [lounges, setLounges] = useState<LoungeRecord[]>([])
  const [profiles, setProfiles] = useState<CardProfileRecord[]>([])
  const [cards, setCards] = useState<CreditCardRecord[]>([])
  const [access, setAccess] = useState<LoungeAccessRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([fetchLounges(), fetchCardProfiles(), fetchCreditCards(), fetchLoungeAccess()])
      .then(([l, p, c, ac]) => {
        if (!alive) return
        setLounges(l)
        setProfiles(p)
        setCards(c)
        setAccess(ac)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Perfis dos cartões ativos (fallback: todos os perfis quando nenhum cartão tem perfil).
  const meusPerfisIds = useMemo(() => {
    const ids = cards.filter((c) => c.ativo !== false && c.perfil).map((c) => c.perfil as string)
    if (ids.length === 0) return profiles.map((p) => p.id)
    return ids
  }, [cards, profiles])

  const unicos = useMemo(() => {
    const seen: string[] = []
    for (const c of codes) {
      const code = (c || '').trim().toUpperCase()
      if (code.length === 3 && !seen.includes(code)) seen.push(code)
    }
    return seen
  }, [codes])

  const porAeroporto = useMemo(
    () =>
      unicos.map((code) => ({
        code,
        salas: lounges
          .filter((l) => l.expand?.aeroporto?.codigo === code)
          .filter((l) => l.status !== 'nao_incluso' && l.status !== 'previsto')
          .filter((l) => loungeMatchesProfiles(l, profiles, meusPerfisIds, access))
          .sort((a, b) => (a.tipo === 'sala_exclusiva' ? -1 : b.tipo === 'sala_exclusiva' ? 1 : 0)),
      })),
    [unicos, lounges, profiles, meusPerfisIds, access],
  )

  if (loading) return <p className="text-sm text-[#6E6A5E]">Carregando salas…</p>
  if (unicos.length === 0) return null

  return (
    <div className="space-y-3">
      {porAeroporto.map(({ code, salas }) => {
        const isOrigem = code === (codes[0] || '').trim().toUpperCase()
        return (
          <Card key={code} className="border-[#16418F]/15 bg-[#FAF7F0]/60">
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-[#23201A] flex items-center gap-2 text-sm">
                {isOrigem ? (
                  <PlaneTakeoff className="h-4 w-4 text-[#16418F]" />
                ) : (
                  <PlaneLanding className="h-4 w-4 text-[#16418F]" />
                )}
                Salas em {code}
              </p>
              {salas.length === 0 ? (
                <p className="text-xs text-[#6E6A5E]">
                  Nenhuma sala/restaurante da base disponível com seus cartões ativos.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {salas.map((l) => {
                    const meta = STATUS_META[l.status ?? 'confirmado'] ?? STATUS_META.confirmado
                    const stale = reviewIsStale(l.revisado_em)
                    return (
                      <li key={l.id} className="text-sm flex items-start justify-between gap-2">
                        <span className="text-[#4A4638]">
                          {l.nome}
                          {l.terminal ? (
                            <span className="text-[#6E6A5E]"> · {l.terminal}</span>
                          ) : null}
                          <span className="text-xs text-[#6E6A5E]">
                            {' '}
                            · {TIPO_LABEL[l.tipo] ?? l.tipo}
                            {l.redes?.length
                              ? ` · ${l.redes.map((r) => REDE_LABEL[r] ?? r).join(', ')}`
                              : ''}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5 shrink-0">
                          <Badge variant="outline" className={cn('text-[10px]', meta.className)}>
                            {meta.label}
                          </Badge>
                          {stale && (
                            <span className="text-[10px] text-[#C4452F]">
                              Revisado{' '}
                              {l.revisado_em ? formatDateBR(l.revisado_em.slice(0, 10)) : '—'} (6+
                              meses)
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
