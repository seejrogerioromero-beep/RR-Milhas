// Página Calculadoras: 6 ferramentas de cálculo em abas/pills, como no print.
// Cálculo ao vivo no frontend, sem salvar nada no banco.
import { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  Calculator,
  CreditCard,
  Hotel,
  Plane,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import pb from '@/lib/pocketbase/client'
import type { ProgramRecord } from '@/types/database'
import { useRealtime } from '@/hooks/use-realtime'
import MilhasOuDinheiro from '@/components/calculators/MilhasOuDinheiro'
import CustoMilheiro from '@/components/calculators/CustoMilheiro'
import TransferenciaBonificada from '@/components/calculators/TransferenciaBonificada'
import PontosDinheiro from '@/components/calculators/PontosDinheiro'
import CompraBonificada from '@/components/calculators/CompraBonificada'
import AccorCalc from '@/components/calculators/AccorCalc'

type CalcId =
  | 'milhas-ou-dinheiro'
  | 'custo-milheiro'
  | 'transferencia'
  | 'pontos-dinheiro'
  | 'compra'
  | 'accor'

interface CalcTab {
  id: CalcId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: CalcTab[] = [
  { id: 'milhas-ou-dinheiro', label: 'Milhas ou dinheiro', icon: Plane },
  { id: 'custo-milheiro', label: 'Custo do milheiro', icon: Calculator },
  { id: 'transferencia', label: 'Transferência bonificada', icon: ArrowLeftRight },
  { id: 'pontos-dinheiro', label: 'Pontos + dinheiro', icon: Plus },
  { id: 'compra', label: 'Compra bonificada', icon: ShoppingCart },
  { id: 'accor', label: 'ALL Accor', icon: Hotel },
]

export default function Calculadoras() {
  const [tab, setTab] = useState<CalcId>('pontos-dinheiro')
  const [programs, setPrograms] = useState<ProgramRecord[]>([])

  useEffect(() => {
    pb.collection<ProgramRecord>('programs')
      .getFullList({ sort: 'name' })
      .then(setPrograms)
      .catch(() => {})
  }, [])

  // Chips sempre atualizados quando um programa muda no banco.
  useRealtime<ProgramRecord>('programs', () => {
    pb.collection<ProgramRecord>('programs')
      .getFullList({ sort: 'name' })
      .then(setPrograms)
      .catch(() => {})
  })

  // "Livelo: R$ 25,00" — custo médio de cada programa cadastrado.
  const chips = programs
    .filter((p) => p.cost_per_thousand > 0)
    .map((p) => ({ name: p.name, cost: p.cost_per_thousand }))

  return (
    <Layout>
      <div className="fade-rise space-y-5 max-w-5xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Ferramentas</p>
          <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Calculadoras</h1>
          <p className="text-sm text-[#6E6A5E] mt-2">
            Faça as contas antes de emitir, transferir ou comprar pontos.
          </p>
        </div>

        {/* Barra de abas/pills */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ' +
                  (active
                    ? 'border-[#C9A24B] bg-[#C9A24B]/10 text-[#23201A] shadow-sm'
                    : 'border-[#E8E2D6] bg-white text-[#23201A] hover:border-[#C9A24B]/50')
                }
              >
                <Icon className="h-4 w-4 text-[#0E8FB8]" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'milhas-ou-dinheiro' && <MilhasOuDinheiro chips={chips} />}
        {tab === 'custo-milheiro' && <CustoMilheiro />}
        {tab === 'transferencia' && <TransferenciaBonificada chips={chips} />}
        {tab === 'pontos-dinheiro' && <PontosDinheiro chips={chips} />}
        {tab === 'compra' && <CompraBonificada />}
        {tab === 'accor' && <AccorCalc chips={chips} />}

        <p className="flex items-center gap-2 text-xs text-[#6E6A5E]">
          <CreditCard className="h-3.5 w-3.5 text-[#0E8FB8]" />
          Cálculo feito na hora, sem salvar nada. Os chips usam o custo médio dos programas
          cadastrados.
        </p>
      </div>
    </Layout>
  )
}
