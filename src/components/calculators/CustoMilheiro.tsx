// Calculadora "Custo do milheiro" — quanto custa cada 1.000 milhas de uma compra.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatBRL, formatMiles, parseNumberInput } from '@/lib/miles'
import { CalcField, CalcHeader, ResultFooter } from './shared'

export function CustoMilheiro() {
  const [milesStr, setMilesStr] = useState('')
  const [priceStr, setPriceStr] = useState('')

  const miles = parseNumberInput(milesStr)
  const price = parseNumberInput(priceStr)

  const pronto = miles != null && miles > 0 && price != null && price > 0
  const milheiro = pronto ? (price / miles) * 1000 : null

  return (
    <section className="fade-rise">
      <CalcHeader
        title="Custo do milheiro"
        subtitle="Descubra quanto você paga por 1.000 milhas."
      />
      <Card className="paper-card p-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <CalcField
            id="cm-miles"
            label="Quantidade de milhas"
            placeholder="Ex: 10.000"
            value={milesStr}
            onChange={setMilesStr}
          />
          <CalcField
            id="cm-price"
            label="Preço pago (R$)"
            placeholder="Ex: 250,00"
            kind="brl"
            hint="Valor da compra, clube ou pacote."
            value={priceStr}
            onChange={setPriceStr}
          />
        </div>
      </Card>
      <ResultFooter message={pronto ? '' : 'Informe a quantidade de milhas e o preço pago.'}>
        {milheiro != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              Custo do milheiro
            </p>
            <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
              {formatBRL(milheiro)}
            </p>
            <p className="text-xs text-[#6E6A5E]">
              {formatMiles(miles || 0)} milhas por {formatBRL(price || 0)}
            </p>
          </div>
        )}
      </ResultFooter>
    </section>
  )
}

export default CustoMilheiro
