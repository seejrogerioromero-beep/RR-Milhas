// Calculadora "Compra bonificada" — milheiro de um pacote de pontos com bônus.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatBRL, formatMiles, parseNumberInput } from '@/lib/miles'
import { CalcField, CalcHeader, ResultFooter } from './shared'

export function CompraBonificada() {
  const [pointsStr, setPointsStr] = useState('') // pontos do pacote
  const [priceStr, setPriceStr] = useState('') // preço do pacote
  const [bonusStr, setBonusStr] = useState('') // bônus %

  const points = parseNumberInput(pointsStr)
  const price = parseNumberInput(priceStr)
  const bonus = parseNumberInput(bonusStr) ?? 0

  const pronto = points != null && points > 0 && price != null && price > 0
  const total = pronto ? points * (1 + bonus / 100) : null
  const milheiro = pronto && total != null && total > 0 ? (price / total) * 1000 : null
  const semBonus = pronto && bonus > 0 && points > 0 ? (price / points) * 1000 : null

  return (
    <section className="fade-rise">
      <CalcHeader
        title="Compra bonificada"
        subtitle="Quanto custa cada milheiro do pacote — e quanto o bônus ajuda."
      />
      <Card className="paper-card p-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <CalcField
            id="cb-points"
            label="Pontos do pacote"
            placeholder="Ex: 10.000"
            value={pointsStr}
            onChange={setPointsStr}
          />
          <CalcField
            id="cb-price"
            label="Preço do pacote (R$)"
            placeholder="Ex: 350,00"
            kind="brl"
            value={priceStr}
            onChange={setPriceStr}
          />
          <CalcField
            id="cb-bonus"
            label="Bônus da compra (%)"
            placeholder="Ex: 50"
            value={bonusStr}
            onChange={setBonusStr}
          />
        </div>
      </Card>
      <ResultFooter message={pronto ? '' : 'Informe os pontos do pacote e o preço.'}>
        {milheiro != null && total != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              Milheiro da compra
            </p>
            <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
              {formatBRL(milheiro)}
            </p>
            <p className="text-xs text-[#6E6A5E]">
              {formatMiles(total)} pontos no total
              {semBonus != null && ` · sem o bônus seria ${formatBRL(semBonus)}`}
            </p>
          </div>
        )}
      </ResultFooter>
    </section>
  )
}

export default CompraBonificada
