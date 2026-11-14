import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  fetchAirports,
  fetchCardProfiles,
  fetchCreditCards,
  fetchLoungeAccess,
  fetchLounges,
} from '@/lib/salasVip'
import type {
  AirportRecord,
  CardProfileRecord,
  CreditCardRecord,
  LoungeAccessRecord,
  LoungeRecord,
} from '@/types/database'
import { CreditCard as CreditCardIcon, Info, Plane } from 'lucide-react'
import BaseTab from '@/components/salas/BaseTab'
import { CardsTab } from '@/components/CardsTab'
import ProfilesTab from '@/components/salas/ProfilesTab'

type Tab = 'base' | 'cartoes' | 'como-funciona'

export default function SalasVip() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('base')
  const [airports, setAirports] = useState<AirportRecord[]>([])
  const [lounges, setLounges] = useState<LoungeRecord[]>([])
  const [profiles, setProfiles] = useState<CardProfileRecord[]>([])
  const [cards, setCards] = useState<CreditCardRecord[]>([])
  const [access, setAccess] = useState<LoungeAccessRecord[]>([])

  // recarrega a base quando algo muda (edição, "conferido hoje" etc.)
  async function reload() {
    const [a, l, p, c, ac] = await Promise.all([
      fetchAirports(),
      fetchLounges(),
      fetchCardProfiles(),
      fetchCreditCards(),
      fetchLoungeAccess(),
    ])
    setAirports(a)
    setLounges(l)
    setProfiles(p)
    setCards(c)
    setAccess(ac)
  }

  useEffect(() => {
    if (user) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // realtime: qualquer mudança nas 5 collections recarrega
  useRealtime('lounges', reload)
  useRealtime('airports', reload)
  useRealtime('card_profiles', reload)
  useRealtime('lounge_access', reload)
  useRealtime('credit_cards', reload)

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#23201A]">Salas VIP</h1>
        <p className="text-sm text-[#6E6A5E]">
          Base Santander de salas e restaurantes — pesquisa de 14/11/2026. Confira o app da rede
          (Mastercard Airport Experiences ou Visa Airport Companion) antes de cada viagem.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <SegButton active={tab === 'base'} onClick={() => setTab('base')}>
          <Plane className="h-4 w-4" /> Base de salas
        </SegButton>
        <SegButton active={tab === 'cartoes'} onClick={() => setTab('cartoes')}>
          <CreditCardIcon className="h-4 w-4" /> Cartões
        </SegButton>
        <SegButton active={tab === 'como-funciona'} onClick={() => setTab('como-funciona')}>
          <Info className="h-4 w-4" /> COMO FUNCIONA
        </SegButton>
      </div>

      {tab === 'base' ? (
        <BaseTab
          airports={airports}
          lounges={lounges}
          profiles={profiles}
          cards={cards}
          access={access}
        />
      ) : tab === 'cartoes' ? (
        <ProfilesTab profiles={profiles} cards={cards} />
      ) : (
        <CardsTab />
      )}
    </PageContainer>
  )
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ' +
        (active
          ? 'bg-[#16418F] text-white'
          : 'bg-white text-[#16418F] border border-[#16418F]/30 hover:bg-[#16418F]/5')
      }
    >
      {children}
    </button>
  )
}
