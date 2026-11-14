import { useMemo, useState } from 'react'
import type {
  AirportRecord,
  CardProfileRecord,
  CreditCardRecord,
  LoungeAccessRecord,
  LoungeRecord,
} from '@/types/database'
import {
  AREA_LABEL,
  REDE_LABEL,
  STATUS_META,
  TIPO_LABEL,
  loungeMatchesProfiles,
  markReviewedToday,
  monthsSinceReview,
  reviewIsStale,
} from '@/lib/salasVip'
import { formatDateBR } from '@/lib/miles'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCheck, Pencil, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import LoungeEditDialog from './LoungeEditDialog'

interface BaseTabProps {
  airports: AirportRecord[]
  lounges: LoungeRecord[]
  profiles: CardProfileRecord[]
  cards: CreditCardRecord[]
  access: LoungeAccessRecord[]
}

const TIPO_ORDER: Record<string, number> = {
  sala_exclusiva: 0,
  sala: 1,
  restaurante: 2,
  descanso: 3,
  spa: 4,
  coworking: 5,
}

type TipoFiltro = 'todos' | 'sala' | 'restaurante'
type RedeFiltro = 'todas' | 'loungekey' | 'dragonpass'

/** Aba BASE — base importada de salas VIP/restaurantes por aeroporto. */
export default function BaseTab({ airports, lounges, profiles, cards, access }: BaseTabProps) {
  const [busca, setBusca] = useState('')
  const [buscaAeroporto, setBuscaAeroporto] = useState('')
  const [aeroporto, setAeroporto] = useState<string>('')
  const [redeFiltro, setRedeFiltro] = useState<RedeFiltro>('todas')
  const [cartaoFiltro, setCartaoFiltro] = useState<'todos' | 'meus' | string>('todos')
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos')
  const [editing, setEditing] = useState<LoungeRecord | null>(null)

  // Perfis disponíveis: os vinculados aos cartões ativos do usuário (fallback: todos).
  const meusPerfis = useMemo(() => {
    const ids = cards.filter((c) => c.ativo !== false && c.perfil).map((c) => c.perfil as string)
    return profiles.filter((p) => ids.includes(p.id))
  }, [cards, profiles])

  const meusPerfisIds = useMemo(() => meusPerfis.map((p) => p.id), [meusPerfis])

  const aeroportosFiltrados = useMemo(() => {
    const q = buscaAeroporto.trim().toLowerCase()
    if (!q) return airports
    return airports.filter(
      (a) =>
        a.codigo.toLowerCase().includes(q) ||
        a.cidade.toLowerCase().includes(q) ||
        (a.pais ?? '').toLowerCase().includes(q),
    )
  }, [airports, buscaAeroporto])

  const aeroportoSel = airports.find((a) => a.id === aeroporto) ?? null

  const salas = useMemo(() => {
    if (!aeroportoSel) return []
    return lounges
      .filter((l) => l.expand?.aeroporto?.id === aeroportoSel.id)
      .filter((l) =>
        tipoFiltro === 'todos'
          ? true
          : tipoFiltro === 'restaurante'
            ? l.tipo === 'restaurante'
            : l.tipo !== 'restaurante',
      )
      .filter((l) => {
        if (redeFiltro === 'todas') return true
        return (l.redes ?? []).includes(redeFiltro)
      })
      .filter((l) => {
        if (cartaoFiltro === 'todos') return true
        const ids = cartaoFiltro === 'meus' ? meusPerfisIds : [cartaoFiltro]
        return loungeMatchesProfiles(l, profiles, ids, access)
      })
      .sort((a, b) => {
        const ta = TIPO_ORDER[a.tipo] ?? 9
        const tb = TIPO_ORDER[b.tipo] ?? 9
        if (ta !== tb) return ta - tb
        return a.nome.localeCompare(b.nome, 'pt-BR')
      })
  }, [aeroportoSel, lounges, tipoFiltro, redeFiltro, cartaoFiltro, meusPerfisIds, profiles, access])

  const salasBusca = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return salas
    return salas.filter(
      (l) =>
        l.nome.toLowerCase().includes(q) ||
        (l.terminal ?? '').toLowerCase().includes(q) ||
        (l.observacoes ?? '').toLowerCase().includes(q),
    )
  }, [salas, busca])

  async function handleConferido(lounge: LoungeRecord) {
    try {
      await markReviewedToday('lounges', lounge.id)
    } catch {
      // silencioso — realtime recarrega a lista
    }
  }

  return (
    <div className="space-y-4">
      {/* Seletor de aeroporto */}
      <Card className="border-[#16418F]/15">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6A5E]" />
            <Input
              value={buscaAeroporto}
              onChange={(e) => setBuscaAeroporto(e.target.value)}
              placeholder="Buscar aeroporto (código, cidade ou país)…"
              className="pl-9 rrmilhas-input"
            />
          </div>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {aeroportosFiltrados.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAeroporto(a.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  aeroporto === a.id
                    ? 'border-[#16418F] bg-[#16418F] text-white'
                    : 'border-[#16418F]/30 bg-white text-[#16418F] hover:bg-[#16418F]/5',
                )}
              >
                <span className="font-bold">{a.codigo}</span>
                <span className="ml-1.5 opacity-80">{a.cidade}</span>
              </button>
            ))}
            {aeroportosFiltrados.length === 0 && (
              <p className="text-sm text-[#6E6A5E]">Nenhum aeroporto encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {aeroportoSel && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={redeFiltro}
              onChange={(e) => setRedeFiltro(e.target.value as RedeFiltro)}
              className="rrmilhas-input w-auto h-9 px-2 text-sm"
              aria-label="Filtrar por rede"
            >
              <option value="todas">Todas as redes</option>
              <option value="loungekey">LoungeKey</option>
              <option value="dragonpass">DragonPass</option>
            </select>

            <select
              value={cartaoFiltro}
              onChange={(e) => setCartaoFiltro(e.target.value)}
              className="rrmilhas-input w-auto h-9 px-2 text-sm"
              aria-label="Filtrar por cartão"
            >
              <option value="todos">Todos os cartões</option>
              <option value="meus">Meus cartões</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg border border-[#16418F]/30 overflow-hidden">
              {(['todos', 'sala', 'restaurante'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoFiltro(t)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    tipoFiltro === t
                      ? 'bg-[#16418F] text-white'
                      : 'bg-white text-[#16418F] hover:bg-[#16418F]/5',
                  )}
                >
                  {t === 'todos' ? 'Tudo' : t === 'sala' ? 'Salas' : 'Restaurantes'}
                </button>
              ))}
            </div>
          </div>

          {/* Título do aeroporto */}
          <div>
            <h3 className="text-lg font-bold text-[#23201A]">
              {aeroportoSel.codigo} — {aeroportoSel.cidade}
              {aeroportoSel.pais ? `, ${aeroportoSel.pais}` : ''}
            </h3>
            <p className="text-sm text-[#6E6A5E]">
              {salasBusca.length} {salasBusca.length === 1 ? 'registro' : 'registros'}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6A5E]" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar sala/restaurante neste aeroporto…"
              className="pl-9 rrmilhas-input"
            />
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {salasBusca.map((l) => {
              const meta = STATUS_META[l.status ?? 'confirmado'] ?? STATUS_META.confirmado
              const stale = reviewIsStale(l.revisado_em)
              const meses = monthsSinceReview(l.revisado_em)
              const perfisAcesso = profiles.filter((p) =>
                loungeMatchesProfiles(l, profiles, [p.id], access),
              )
              return (
                <Card key={l.id} className="border-[#16418F]/15">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#23201A]">
                          {l.nome}
                          {l.terminal ? (
                            <span className="text-[#6E6A5E] font-normal"> · {l.terminal}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-[#6E6A5E]">
                          {TIPO_LABEL[l.tipo] ?? l.tipo}
                          {l.area ? ` · ${AREA_LABEL[l.area] ?? l.area}` : ''}
                          {l.redes?.length
                            ? ` · ${l.redes.map((r) => REDE_LABEL[r] ?? r).join(', ')}`
                            : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('shrink-0', meta.className)}>
                        {meta.label}
                      </Badge>
                    </div>

                    {l.observacoes && <p className="text-sm text-[#4A4638]">{l.observacoes}</p>}

                    {perfisAcesso.length > 0 && (
                      <p className="text-xs text-[#6E6A5E]">
                        Acesso:{' '}
                        {perfisAcesso
                          .map((p) => {
                            const cond = access.find((a) => a.sala === l.id && a.cartao === p.id)
                            return cond?.condicao ? `${p.codigo} (${cond.condicao})` : p.codigo
                          })
                          .join(' · ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <p
                        className={cn(
                          'text-xs',
                          stale ? 'text-[#C4452F] font-medium' : 'text-[#6E6A5E]',
                        )}
                      >
                        Revisado em {l.revisado_em ? formatDateBR(l.revisado_em.slice(0, 10)) : '—'}
                        {stale && ' ⚠ mais de 6 meses — confira antes de viajar'}
                        {!stale && meses !== null
                          ? ` (${meses} ${meses === 1 ? 'mês' : 'meses'} atrás)`
                          : ''}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConferido(l)}
                          className="h-8 gap-1.5 text-xs border-[#16418F]/30 text-[#16418F] hover:bg-[#16418F]/5"
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Conferido hoje
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(l)}
                          className="h-8 gap-1.5 text-xs border-[#16418F]/30 text-[#16418F] hover:bg-[#16418F]/5"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {salasBusca.length === 0 && (
              <p className="text-sm text-[#6E6A5E] py-6 text-center">
                Nenhuma sala/restaurante para os filtros escolhidos.
              </p>
            )}
          </div>
        </>
      )}

      {!aeroportoSel && (
        <p className="text-sm text-[#6E6A5E] py-10 text-center">
          Escolha um aeroporto acima para ver as salas e os restaurantes.
        </p>
      )}

      <LoungeEditDialog
        lounge={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    </div>
  )
}
