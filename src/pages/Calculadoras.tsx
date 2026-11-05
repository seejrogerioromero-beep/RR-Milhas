import { useState } from 'react'
import { Calculator, ArrowRight, ArrowLeft, Coins } from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBRL, formatMiles, maskBRL, parseNumberInput } from '@/lib/miles'

/** Ferramenta: conversão entre milhas e reais usando o custo do milheiro. */
export default function Calculadoras() {
  // Modo 1: milhas → reais. Modo 2: reais → milhas.
  const [mode, setMode] = useState<'milhas' | 'reais'>('milhas')

  const [milesStr, setMilesStr] = useState('')
  const [costStr, setCostStr] = useState('')
  const [reaisStr, setReaisStr] = useState('')

  const cost = parseNumberInput(costStr)
  const reais = parseNumberInput(reaisStr)
  const miles = parseNumberInput(milesStr)

  // milhas × custo/1000
  const valorEmReais = miles != null && cost != null ? (miles / 1000) * cost : null
  // (reais / custo) × 1000
  const milhasEquivalentes =
    reais != null && cost != null && cost > 0 ? (reais / cost) * 1000 : null

  const swap = () => {
    setMode((m) => (m === 'milhas' ? 'reais' : 'milhas'))
    setMilesStr('')
    setReaisStr('')
  }

  const hasCost = cost != null && cost > 0

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Ferramentas</p>
          <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Calculadoras</h1>
          <p className="text-sm text-[#6E6A5E] mt-2">
            Converta milhas em reais e reais em milhas usando o custo do milheiro.
          </p>
        </div>

        <Card className="paper-card p-6 max-w-xl">
          {/* Seletor de direção */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6] mb-5">
            <button
              type="button"
              onClick={() => setMode('milhas')}
              className={
                'h-10 rounded-lg text-sm font-semibold transition-all ' +
                (mode === 'milhas'
                  ? 'bg-[#16418F] text-white shadow-sm'
                  : 'text-[#6E6A5E] hover:bg-white')
              }
            >
              Milhas → Reais
            </button>
            <button
              type="button"
              onClick={() => setMode('reais')}
              className={
                'h-10 rounded-lg text-sm font-semibold transition-all ' +
                (mode === 'reais'
                  ? 'bg-[#16418F] text-white shadow-sm'
                  : 'text-[#6E6A5E] hover:bg-white')
              }
            >
              Reais → Milhas
            </button>
          </div>

          {/* Custo do milheiro (comum aos dois modos) */}
          <div className="space-y-1.5 mb-5">
            <Label htmlFor="calc-cost" className="text-xs font-semibold text-[#23201A]">
              Custo do milheiro (R$ por 1.000 milhas) *
            </Label>
            <Input
              id="calc-cost"
              inputMode="decimal"
              value={costStr}
              onChange={(e) => setCostStr(maskBRL(e.target.value))}
              placeholder="Ex: 24,50"
              className="rrmilhas-input tabular-nums"
            />
            <p className="text-xs text-[#6E6A5E]">
              Ex.: comprou 10.000 milhas por R$ 245,00 → milheiro de R$ 24,50.
            </p>
          </div>

          {mode === 'milhas' ? (
            <div className="space-y-1.5">
              <Label htmlFor="calc-miles" className="text-xs font-semibold text-[#23201A]">
                Quantidade de milhas
              </Label>
              <Input
                id="calc-miles"
                inputMode="numeric"
                value={milesStr}
                onChange={(e) => setMilesStr(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 25000"
                className="rrmilhas-input tabular-nums"
              />
              <div className="flex items-center justify-center gap-2 py-1 text-[#0E8FB8]">
                <ArrowRight className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Resultado</span>
              </div>
              <div className="rounded-xl bg-[#FAF7F0] border border-[#E8E2D6] p-5 text-center">
                {hasCost && valorEmReais != null ? (
                  <>
                    <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
                      {formatBRL(valorEmReais)}
                    </p>
                    <p className="text-xs text-[#6E6A5E] mt-1.5">
                      {formatMiles(miles || 0)} milhas × {formatBRL(cost || 0)}/milheiro
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[#6E6A5E]">
                    {hasCost
                      ? 'Digite a quantidade de milhas para calcular.'
                      : 'Informe o custo do milheiro para calcular.'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="calc-reais" className="text-xs font-semibold text-[#23201A]">
                Valor em reais
              </Label>
              <Input
                id="calc-reais"
                inputMode="decimal"
                value={reaisStr}
                onChange={(e) => setReaisStr(maskBRL(e.target.value))}
                placeholder="Ex: 612,50"
                className="rrmilhas-input tabular-nums"
              />
              <div className="flex items-center justify-center gap-2 py-1 text-[#0E8FB8]">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Resultado</span>
              </div>
              <div className="rounded-xl bg-[#FAF7F0] border border-[#E8E2D6] p-5 text-center">
                {hasCost && milhasEquivalentes != null ? (
                  <>
                    <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums flex items-center justify-center gap-2">
                      <Coins className="w-6 h-6 text-[#0E8FB8]" />
                      {formatMiles(milhasEquivalentes)}
                      <span className="text-sm font-normal text-[#6E6A5E]">milhas</span>
                    </p>
                    <p className="text-xs text-[#6E6A5E] mt-1.5">
                      {formatBRL(reais || 0)} ÷ {formatBRL(cost || 0)}/milheiro
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[#6E6A5E]">
                    {hasCost
                      ? 'Digite o valor em reais para calcular.'
                      : 'Informe o custo do milheiro para calcular.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        <p className="flex items-center gap-2 text-xs text-[#6E6A5E]">
          <Calculator className="w-3.5 h-3.5 text-[#0E8FB8]" />
          Dica: o custo do milheiro de cada programa fica salvo no card do programa.
        </p>
      </div>
    </Layout>
  )
}
