// Calculadora "ALL Accor" — conversão de pontos de programas (ex.: Livelo) para Accor.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatBRL, formatMiles, parseNumberInput } from '@/lib/miles'
import { CalcField, CalcHeader, ProgramChips, type ProgramChipData, ResultFooter } from './shared'

export function AccorCalc({ chips }: { chips: ProgramChipData[] }) {
  const [origemStr, setOrigemStr] = useState('') // pontos de origem
  const [bonusStr, setBonusStr] = useState('') // bônus %
  const [parityStr, setParityStr] = useState('1') // paridade
  const [costStr, setCostStr] = useState('') // custo do milheiro na origem

  const origem = parseNumberInput(origemStr)
  const bonus = parseNumberInput(bonusStr) ?? 0
  const parity = parseNumberInput(parityStr) ?? 1
  const cost = parseNumberInput(costStr) ?? 0

  const pronto = origem != null && origem > 0
  const destino = pronto ? origem * (1 + bonus / 100) * parity : null
  const efetivo =
    pronto && destino != null && destino > 0 && cost > 0 ? (cost / destino) * origem : null

  const pickChip = (c: number) =>
    setCostStr(c.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

  return (
    <section className="fade-rise">
      <CalcHeader
        title="ALL Accor"
        subtitle="Converta pontos de programas (ex.: Livelo) para pontos Accor."
      />
      <Card className="paper-card p-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <CalcField
            id="acc-origem"
            label="Pontos a converter"
            placeholder="Ex: 10.000"
            value={origemStr}
            onChange={setOrigemStr}
          />
          <CalcField
            id="acc-bonus"
            label="Bônus da conversão (%)"
            placeholder="Ex: 100"
            value={bonusStr}
            onChange={setBonusStr}
          />
          <CalcField
            id="acc-parity"
            label="Paridade"
            placeholder="1"
            hint="1 quando é 1 para 1."
            value={parityStr}
            onChange={setParityStr}
          />
          <div>
            <CalcField
              id="acc-cost"
              label="Custo do milheiro na origem (R$)"
              placeholder="Ex: 25,00"
              kind="brl"
              hint="Use 0 se os pontos vieram de graça."
              value={costStr}
              onChange={setCostStr}
            />
            <div className="mt-3">
              <ProgramChips programs={chips} onPick={pickChip} />
            </div>
          </div>
        </div>
      </Card>
      <ResultFooter message={pronto ? '' : 'Informe os pontos a converter.'}>
        {destino != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              Pontos ALL Accor
            </p>
            <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
              {formatMiles(destino)}
            </p>
            <p className="text-xs text-[#6E6A5E]">
              {formatMiles(origem || 0)} pontos × {bonus ? `${bonus}% de bônus` : 'sem bônus'} ×
              paridade {parity}
              {efetivo != null && ` · milheiro final ${formatBRL(efetivo)}`}
            </p>
          </div>
        )}
      </ResultFooter>
    </section>
  )
}

export default AccorCalc
