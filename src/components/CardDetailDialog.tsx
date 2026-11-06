import { X, Heart } from 'lucide-react'
import type { VipCardCatalog } from '@/lib/cardCatalog'
import { DetailSection, DETAIL_ICONS } from './CardsTab'

/** Diálogo com o detalhe completo dos benefícios de um cartão do ranking. */
export function CardDetailDialog({
  card,
  onClose,
}: {
  card: VipCardCatalog | null
  onClose: () => void
}) {
  if (!card) return null
  return (
    <div>
      <div
        className="fixed inset-0 z-50 bg-[#23201A]/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed z-50 inset-x-0 top-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:w-[520px] bg-white shadow-2xl sheet-slide flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E8E2D6]">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#C9A24B]">
              {card.position}° no ranking · {card.bank}
            </p>
            <h3 className="font-serif text-lg font-bold text-[#23201A] leading-snug">
              {card.name}
            </h3>
            <p className="text-xs text-[#6E6A5E] mt-1">Anuidade: {card.annualFee}</p>
          </div>
          <button
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-lg hover:bg-[#FAF7F0] transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-[#6E6A5E]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <DetailSection title="Salas VIP" icon={DETAIL_ICONS.salas} items={card.salasVip} />
          <DetailSection
            title="Alimentação"
            icon={DETAIL_ICONS.alimentacao}
            items={card.alimentacao}
          />
          <DetailSection title="Fast track" icon={DETAIL_ICONS.fastTrack} items={card.fastTrack} />
          <DetailSection
            title="Pontuação em milhas"
            icon={DETAIL_ICONS.pontuacao}
            items={card.pontuacao}
          />
          <DetailSection title="Outros benefícios" icon={DETAIL_ICONS.outros} items={card.outros} />
        </div>
        <div className="px-5 py-3 border-t border-[#E8E2D6]">
          <p className="flex items-center gap-2 text-xs text-[#6E6A5E]">
            <Heart className="w-3.5 h-3.5 text-[#C4452F]" />
            Fonte: Melhores Cartões e páginas oficiais do banco. Confirme as regras antes de viajar.
          </p>
        </div>
      </div>
    </div>
  )
}
