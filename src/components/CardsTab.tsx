import { useState, useMemo } from 'react'
import {
  Heart,
  Search,
  Armchair,
  UtensilsCrossed,
  PlaneTakeoff,
  Coins,
  Sparkles,
  ChevronDown,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  VIP_CARDS,
  LOUNGE_FILTERS,
  BRAND_FILTERS,
  BANK_FILTERS,
  SEGMENT_FILTERS,
  type VipCardCatalog,
} from '@/lib/cardCatalog'
import { CardDetailDialog } from './CardDetailDialog'

/** Aba CARTÕES: ranking de cartões com benefícios completos (salas VIP, alimentação, fast track, milhas, outros). */
export function CardsTab() {
  const [query, setQuery] = useState('')
  const [lounge, setLounge] = useState<string>('Todas')
  const [brand, setBrand] = useState<string>('Todas')
  const [bank, setBank] = useState<string>('Todos')
  const [segment, setSegment] = useState<string>('Todos')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VIP_CARDS.filter((c) => {
      if (onlyFavorites && !favorites.includes(c.id)) return false
      if (lounge !== 'Todas' && c.loungeProgram !== lounge) return false
      if (brand !== 'Todas' && c.brand !== brand) return false
      if (bank !== 'Todos' && c.bank !== bank) return false
      if (segment !== 'Todos' && c.segment !== segment) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.bank.toLowerCase().includes(q)
    })
  }, [query, lounge, brand, bank, segment, onlyFavorites, favorites])

  const detail = detailId ? (VIP_CARDS.find((c) => c.id === detailId) ?? null) : null

  const favoritesCount = favorites.length

  return (
    <div className="space-y-4">
      {/* Busca + favoritos */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6A5E]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cartão ou banco"
            className="pl-10 rounded-xl h-11 bg-[#FAF7F0] border-[#E8E2D6] rrmilhas-input"
          />
        </div>
        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          className={cn(
            'flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-medium transition-colors',
            onlyFavorites
              ? 'border-[#C4452F]/50 bg-[#C4452F]/10 text-[#C4452F]'
              : 'border-[#E8E2D6] bg-white text-[#23201A] hover:bg-[#FAF7F0]',
          )}
        >
          <Heart className={cn('w-4 h-4', onlyFavorites && 'fill-[#C4452F]')} />
          Favoritos ({favoritesCount})
        </button>
        <button
          onClick={() => {
            setQuery('')
            setLounge('Todas')
            setBrand('Todas')
            setBank('Todos')
            setSegment('Todos')
            setOnlyFavorites(false)
          }}
          className="h-11 px-4 rounded-xl text-sm font-medium text-[#6E6A5E] hover:text-[#23201A] hover:bg-[#FAF7F0] transition-colors"
        >
          Limpar
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FilterSelect
          label="Salas"
          value={lounge}
          onChange={setLounge}
          options={LOUNGE_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
        />
        <FilterSelect
          label="Bandeira"
          value={brand}
          onChange={setBrand}
          options={BRAND_FILTERS.map((v) => ({ value: v, label: v }))}
        />
        <FilterSelect
          label="Banco"
          value={bank}
          onChange={setBank}
          options={BANK_FILTERS.map((v) => ({ value: v, label: v }))}
        />
        <FilterSelect
          label="Segmento"
          value={segment}
          onChange={setSegment}
          options={SEGMENT_FILTERS.map((v) => ({ value: v, label: v }))}
        />
      </div>

      <p className="text-xs text-[#6E6A5E]">
        {filtered.length} cartões no ranking. Fonte:{' '}
        <a
          href="https://www.melhorescartoes.com.br"
          target="_blank"
          rel="noreferrer"
          className="text-[#0E8FB8] underline underline-offset-2"
        >
          Melhores Cartões
        </a>
        . Confirme as regras no seu banco antes de viajar.
      </p>

      {/* Ranking */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <RankingCard
            key={c.id}
            card={c}
            isFavorite={favorites.includes(c.id)}
            onToggleFavorite={() => toggleFavorite(c.id)}
            onOpenDetail={() => setDetailId(c.id)}
          />
        ))}
        {filtered.length === 0 && (
          <Card className="paper-card p-8 text-center text-sm text-[#6E6A5E]">
            Nenhum cartão encontrado com os filtros atuais.
          </Card>
        )}
      </div>

      <CardDetailDialog card={detail} onClose={() => setDetailId(null)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#23201A] mb-1 block">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 pl-3 pr-9 rounded-xl border border-[#E8E2D6] bg-[#FAF7F0] text-sm text-[#23201A] appearance-none focus:outline-none focus:border-[#16418F] focus:ring-2 focus:ring-[#16418F]/30"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6A5E] pointer-events-none" />
      </div>
    </label>
  )
}

/** Card do ranking: resumo com as principais seções e clique abre o detalhe completo. */
function RankingCard({
  card,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
}: {
  card: VipCardCatalog
  isFavorite: boolean
  onToggleFavorite: () => void
  onOpenDetail: () => void
}) {
  return (
    <Card
      className="paper-card-interactive p-5 cursor-pointer"
      onClick={onOpenDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail()
        }
      }}
    >
      <div className="flex items-start gap-4">
        <span className="font-serif text-2xl font-bold text-[#C9A24B] w-10 shrink-0 tabular-nums">
          {card.position}°
        </span>
        <div
          className="w-14 h-9 rounded-md shrink-0 grid place-items-center text-[10px] font-bold text-white"
          style={{ background: card.brand === 'Mastercard' ? '#23201A' : '#1A1F71' }}
        >
          {card.brand === 'Mastercard' ? 'MC' : 'VISA'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-bold text-[#23201A] leading-snug">{card.name}</h3>
          <p className="text-xs text-[#6E6A5E] mt-0.5">Anuidade: {card.annualFee}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className="shrink-0 p-1 rounded-lg hover:bg-[#FAF7F0]"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart
            className={cn(
              'w-5 h-5',
              isFavorite ? 'fill-[#C4452F] text-[#C4452F]' : 'text-[#C4C0B4]',
            )}
          />
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <CardSummarySection
          title="SALAS VIP"
          icon={<Armchair className="w-3.5 h-3.5" />}
          items={card.salasVip}
        />
        <CardSummarySection
          title="PONTOS / MILHAS"
          icon={<Coins className="w-3.5 h-3.5" />}
          items={card.pontuacao.slice(0, 2)}
        />
        <CardSummarySection
          title="DESTAQUES"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          items={card.highlights.slice(0, 3)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-4">
        {card.tags.map((t) => (
          <span
            key={t}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[#FAF7F0] border border-[#E8E2D6] text-[#6E6A5E]"
          >
            {t}
          </span>
        ))}
        <span className="flex-1" />
        <span className="flex items-center gap-1 text-xs font-semibold text-[#0E8FB8]">
          Ver todos os benefícios <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  )
}

function CardSummarySection({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6E6A5E] mb-1.5">
        {icon}
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-[#23201A] leading-relaxed">
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Seção de benefícios usada no diálogo de detalhe. */
export function DetailSection({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
}) {
  if (items.length === 0) return null
  return (
    <div className="border-t border-[#E8E2D6] pt-4 first:border-t-0 first:pt-0">
      <p className="flex items-center gap-2 text-sm font-bold text-[#23201A] mb-2">
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#23201A]">
            <BadgeCheck className="w-4 h-4 text-[#0E8FB8] shrink-0 mt-0.5" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const DETAIL_ICONS = {
  salas: <Armchair className="w-4 h-4 text-[#0E8FB8]" />,
  alimentacao: <UtensilsCrossed className="w-4 h-4 text-[#0E8FB8]" />,
  fastTrack: <PlaneTakeoff className="w-4 h-4 text-[#0E8FB8]" />,
  pontuacao: <Coins className="w-4 h-4 text-[#0E8FB8]" />,
  outros: <Sparkles className="w-4 h-4 text-[#0E8FB8]" />,
}
