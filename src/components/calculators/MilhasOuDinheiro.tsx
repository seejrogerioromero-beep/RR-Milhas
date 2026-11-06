// Calculadora "Milhas ou dinheiro" — comparar emitir com milhas contra pagar em dinheiro.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatBRL, formatMiles, parseNumberInput } from '@/lib/miles'
import { CalcField, CalcHeader, ProgramChips, type ProgramChipData, ResultFooter } from './shared'

export function MilhasOuDinheiro({ chips }: { chips: ProgramChipData[] }) {
  const [fareStr, setFareStr] = useState('') // valor da passagem em dinheiro
  const [milesStr, setMilesStr] = useState('') // milhas necessárias
  const [feesStr, setFeesStr] = useState('') // taxas de embarque
  const [mileStr, setMileStr] = useState('') // milheiro do programa

  const fare = parseNumberInput(fareStr)
  const miles = parseNumberInput(milesStr)
  const fees = parseNumberInput(feesStr) ?? 0
  const mile = parseNumberInput(mileStr) ?? 0

  const pronto = fare != null && fare > 0 && miles != null && miles > 0
  const custoMilhas = pronto ? (miles / 1000) * mile + fees : null
  const economia = pronto && custoMilhas != null ? fare - custoMilhas : null
  const compensa = economia != null && economia > 0
  const empate = economia != null && Math.abs(economia) < 0.01

  const pickChip = (cost: number) =>
    setMileStr(cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

  const msg = !pronto ? 'Informe o valor da passagem e as milhas necessárias.' : ''

  return (
    <section className="fade-rise">
      <CalcHeader
        title="Milhas ou dinheiro"
        subtitle="Vale mais emitir com milhas ou comprar a passagem?"
      />
      <Card className="paper-card p-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <CalcField
            id="md-fare"
            label="Valor da passagem em dinheiro (R$)"
            placeholder="Ex: 2.400,00"
            kind="brl"
            value={fareStr}
            onChange={setFareStr}
          />
          <CalcField
            id="md-miles"
            label="Milhas necessárias"
            placeholder="Ex: 50.000"
            value={milesStr}
            onChange={setMilesStr}
          />
          <CalcField
            id="md-fees"
            label="Taxas de embarque (R$)"
            placeholder="Ex: 120,00"
            kind="brl"
            value={feesStr}
            onChange={setFeesStr}
          />
          <div>
            <CalcField
              id="md-mile"
              label="Milheiro do programa (R$)"
              placeholder="Ex: 25,00"
              kind="brl"
              hint="Use 0 se as milhas vieram de graça."
              value={mileStr}
              onChange={setMileStr}
            />
            <div className="mt-3">
              <ProgramChips programs={chips} onPick={pickChip} />
            </div>
          </div>
        </div>
      </Card>
      <ResultFooter message={msg}>
        {custoMilhas != null && economia != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              {empate
                ? 'Tanto faz'
                : compensa
                  ? 'Compensa pagar com milhas'
                  : 'Compensa pagar em dinheiro'}
            </p>
            <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
              {formatBRL(Math.abs(economia))} {compensa ? 'de economia' : empate ? '' : 'a mais'}
            </p>
            <p className="text-xs text-[#6E6A5E]">
              Emitir custa {formatBRL(custoMilhas)} (milhas + taxas) · {formatMiles(miles || 0)}{' '}
              milhas
            </p>
          </div>
        )}
      </ResultFooter>
    </section>
  )
}

export default MilhasOuDinheiro
