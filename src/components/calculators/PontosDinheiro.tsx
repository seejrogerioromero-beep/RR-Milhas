// Calculadora "Pontos + dinheiro" — fiel ao print do usuário.
// Parte dos pontos vem do saldo, parte é comprada no carrinho; o total recebe o bônus
// da transferência e a paridade, e o resultado é o milheiro efetivo no destino.
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { formatBRL, formatMiles, parseNumberInput } from '@/lib/miles'
import { CalcField, CalcHeader, ProgramChips, type ProgramChipData, ResultFooter } from './shared'

const MSG_INCOMPLETO = 'Informe o total de pontos da transferência.'

export function PontosDinheiro({ chips }: { chips: ProgramChipData[] }) {
  const [totalStr, setTotalStr] = useState('')
  const [saldoStr, setSaldoStr] = useState('')
  const [cartStr, setCartStr] = useState('')
  const [bonusStr, setBonusStr] = useState('')
  const [parityStr, setParityStr] = useState('1')
  const [milheiroStr, setMilheiroStr] = useState('')

  const total = parseNumberInput(totalStr)
  const saldo = parseNumberInput(saldoStr) ?? 0
  const cart = parseNumberInput(cartStr) ?? 0
  const bonus = parseNumberInput(bonusStr) ?? 0
  const parity = parseNumberInput(parityStr) ?? 1
  const milheiro = parseNumberInput(milheiroStr) ?? 0

  const pronto = total != null && total > 0
  // Pontos que chegam no destino: total × (1 + bônus%) × paridade
  const destino = pronto ? total * (1 + bonus / 100) * parity : null
  // Custo total: pontos do saldo × milheiro do saldo / 1000 + valor pago no carrinho
  const custo = pronto ? (saldo / 1000) * milheiro + cart : null
  // Milheiro efetivo no destino: custo total ÷ pontos destino × 1000
  const efetivo = destino != null && destino > 0 && custo != null ? (custo / destino) * 1000 : null

  const pickChip = (cost: number) =>
    setMilheiroStr(
      cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    )

  return (
    <section className="fade-rise">
      <CalcHeader
        title="Pontos + dinheiro"
        subtitle="Parte do saldo, parte comprada no carrinho."
      />
      <Card className="paper-card p-6">
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <CalcField
            id="pd-total"
            label="Total de pontos a transferir"
            placeholder="Ex: 10.000"
            value={totalStr}
            onChange={setTotalStr}
          />
          <CalcField
            id="pd-saldo"
            label="Pontos do seu saldo"
            placeholder="Ex: 100"
            hint="O resto vem do carrinho."
            value={saldoStr}
            onChange={setSaldoStr}
          />
          <CalcField
            id="pd-cart"
            label="Pago no carrinho (R$)"
            placeholder="Ex: 320,00"
            kind="brl"
            value={cartStr}
            onChange={setCartStr}
          />
          <CalcField
            id="pd-bonus"
            label="Bônus da transferência (%)"
            placeholder="Ex: 100"
            value={bonusStr}
            onChange={setBonusStr}
          />
          <CalcField
            id="pd-parity"
            label="Paridade"
            placeholder="1"
            hint="1 quando é 1 para 1."
            value={parityStr}
            onChange={setParityStr}
          />
          <div className="md:col-span-2">
            <CalcField
              id="pd-milheiro"
              label="Milheiro do seu saldo (R$)"
              placeholder="Ex: 17,50"
              kind="brl"
              hint="Use 0 se os pontos do saldo vieram de graça."
              value={milheiroStr}
              onChange={setMilheiroStr}
            />
            <div className="mt-3">
              <ProgramChips programs={chips} onPick={pickChip} />
            </div>
          </div>
        </div>
      </Card>
      <ResultFooter message={pronto ? '' : MSG_INCOMPLETO}>
        {efetivo != null && destino != null && custo != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              Milheiro efetivo no destino
            </p>
            <p className="font-serif text-3xl font-bold text-[#16418F] tabular-nums">
              {formatBRL(efetivo)}
            </p>
            <p className="text-xs text-[#6E6A5E]">
              {formatMiles(destino)} pontos no destino · custo total {formatBRL(custo)}
            </p>
          </div>
        )}
      </ResultFooter>
    </section>
  )
}

export default PontosDinheiro
