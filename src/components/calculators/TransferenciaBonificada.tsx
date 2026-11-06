// Calculadora "Transferência bonificada" — pontos de origem × bônus × paridade.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatBRL, formatMiles, parseNumberInput } from '@/lib/miles'
import { CalcField, CalcHeader, ProgramChips, type ProgramChipData, ResultFooter } from './shared'

export function TransferenciaBonificada({ chips }: { chips: ProgramChipData[] }) {
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
  // Milheiro efetivo no destino: o custo da origem diluído nos pontos que chegam
  const efetivo =
    pronto && destino != null && destino > 0 && cost > 0 ? (cost / destino) * origem : null

  const pickChip = (c: number) =>
    setCostStr(c.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

  return (
    <section className="fade-rise">
      <CalcHeader
        title="Transferência bonificada"
        subtitle="Quantos pontos chegam no destino — e a quanto equivale cada milheiro."
      />
      <Card className="paper-card p-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <CalcField
            id="tb-origem"
            label="Pontos na origem"
            placeholder="Ex: 20.000"
            value={origemStr}
            onChange={setOrigemStr}
          />
          <CalcField
            id="tb-bonus"
            label="Bônus da transferência (%)"
            placeholder="Ex: 100"
            value={bonusStr}
            onChange={setBonusStr}
          />
          <CalcField
            id="tb-parity"
            label="Paridade"
            placeholder="1"
            hint="1 quando é 1 para 1."
            value={parityStr}
            onChange={setParityStr}
          />
          <div>
            <CalcField
              id="tb-cost"
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
      <ResultFooter message={pronto ? '' : 'Informe os pontos de origem.'}>
        {destino != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              Chegam no destino
            </p>
            <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
              {formatMiles(destino)}
            </p>
            <p className="text-xs text-[#6E6A5E]">
              {formatMiles(origem || 0)} pontos × {bonus ? `${bonus}% de bônus` : 'sem bônus'} ×
              paridade {parity}
              {efetivo != null && ` · milheiro efetivo ${formatBRL(efetivo)}`}
            </p>
          </div>
        )}
      </ResultFooter>
    </section>
  )
}

export default TransferenciaBonificada
