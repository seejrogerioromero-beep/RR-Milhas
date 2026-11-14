import { useEffect, useState } from 'react'
import type { LoungeRecord } from '@/types/database'
import { fetchLounges } from '@/lib/salasVip'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlaneTakeoff, PlaneLanding } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_META, TIPO_LABEL, REDE_LABEL, reviewIsStale } from '@/lib/salasVip'
import { formatDateBR } from '@/lib/miles'

interface TripLoungesProps {
  origem?: string
  destino?: string
}

/** Salas disponíveis nos aeroportos de origem/destino de uma passagem (base Santander). */
export default function TripLounges({ origem, destino }: TripLoungesProps) {
  const [lounges, setLounges] = useState<LoungeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchLounges()
      .then((rows) => {
        if (alive) setLounges(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const codes = [origem, destino].filter(Boolean).map((c) => (c as string).toUpperCase())

  const porAeroporto = codes.map((code) => ({
    code,
    salas: lounges
      .filter((l) => l.expand?.aeroporto?.codigo === code)
      .filter((l) => l.status !== 'nao_incluso')
      .sort((a, b) => (a.tipo === 'sala_exclusiva' ? -1 : b.tipo === 'sala_exclusiva' ? 1 : 0)),
  }))

  if (loading) return <p className="text-sm text-[#6E6A5E]">Carregando salas…</p>
  if (codes.length === 0) return null

  return (
    <div className="space-y-3">
      {porAeroporto.map(({ code, salas }) => (
        <Card key={code} className="border-[#16418F]/15">
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-[#23201A] flex items-center gap-2">
              {code === (origem ?? '').toUpperCase() ? (
                <PlaneTakeoff className="h-4 w-4 text-[#16418F]" />
              ) : (
                <PlaneLanding className="h-4 w-4 text-[#16418F]" />
              )}
              Salas em {code}
            </p>
            {salas.length === 0 ? (
              <p className="text-sm text-[#6E6A5E]">Nenhuma sala da base nesse aeroporto.</p>
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
      ))}
    </div>
  )
}
