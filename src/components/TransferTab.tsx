import { useState } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { ProgramRecord } from '@/types/database'
import { formatMiles, formatBRL, maskBRL, parseNumberInput } from '@/lib/miles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

type TransferMode = 'so_pontos' | 'pontos_dinheiro'

/**
 * Aba Transferir: transferência de pontos de um clube/banco para uma companhia aérea,
 * com bônus e paridade. Gera saída na origem e entrada no destino (extratos reais).
 */
export function TransferTab({
  programs,
  onDone,
}: {
  programs: ProgramRecord[]
  onDone: () => void
}) {
  const { toast } = useToast()
  const [origemId, setOrigemId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [mode, setMode] = useState<TransferMode>('pontos_dinheiro')
  const [pontos, setPontos] = useState('')
  const [bonus, setBonus] = useState('')
  const [paridade, setParidade] = useState('1')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [pontosSaido, setPontosSaido] = useState('')
  const [dinheiro, setDinheiro] = useState('')
  const [observacao, setObservacao] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const origem = programs.find((p) => p.id === origemId)
  const destino = programs.find((p) => p.id === destinoId)

  /* --------- prévia ao vivo ---------- */
  const pontosTransferidos = parseNumberInput(pontos) ?? 0
  // "Apagar um dos lados apaga o outro": os dois campos são limpados juntos (handlers abaixo).
  const pontosSaidos = parseNumberInput(pontosSaido) ?? pontosTransferidos
  const bonusNum = parseNumberInput(bonus) ?? 0
  const paridadeNum = parseNumberInput(paridade) ?? 1
  const paridadeEfetiva = paridadeNum > 0 ? paridadeNum : 1
  const pontosEntrada =
    pontosTransferidos > 0
      ? Math.round((pontosTransferidos / paridadeEfetiva) * (1 + bonusNum / 100))
      : 0
  const dinheiroNum = mode === 'pontos_dinheiro' ? (parseNumberInput(dinheiro) ?? 0) : 0
  const custoMedioOrigem = origem?.cost_per_thousand || 0
  const custoTotal = dinheiroNum + (pontosSaidos / 1000) * custoMedioOrigem
  const milheiroDestino = pontosEntrada > 0 ? custoTotal / (pontosEntrada / 1000) : 0

  /* limpar um lado apaga o outro */
  const changePontos = (v: string) => {
    setPontos(v)
    if (!v) setPontosSaido('')
  }
  const changePontosSaido = (v: string) => {
    setPontosSaido(v)
    if (!v) setPontos('')
  }

  const reset = () => {
    setOrigemId('')
    setDestinoId('')
    setMode('pontos_dinheiro')
    setPontos('')
    setBonus('')
    setParidade('1')
    setPontosSaido('')
    setDinheiro('')
    setObservacao('')
    setDate(new Date().toISOString().slice(0, 10))
    setErrors({})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!origemId) errs.origem = 'Selecione a origem (clube, banco ou cartão)'
    if (!destinoId) errs.destino = 'Selecione o destino'
    if (origemId && destinoId && origemId === destinoId) {
      errs.destino = 'O destino deve ser diferente da origem'
    }
    const pts = parseNumberInput(pontos)
    if (pts == null || pts <= 0) errs.pontos = 'Informe os pontos transferidos'
    const saida = parseNumberInput(pontosSaido) ?? pts ?? 0
    if (saida <= 0) errs.pontos_saido = 'Informe os pontos que saem do saldo'
    if (origem && saida > (origem.balance || 0)) {
      errs.pontos_saido = `Saldo insuficiente: ${formatMiles(origem.balance || 0)} milhas`
    }
    if (!date) errs.date = 'Data é obrigatória'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      const dateStr = `${date} 12:00:00.000Z`
      const origemRec = (await pb
        .collection('programs')
        .getOne(origemId)) as unknown as ProgramRecord
      const destinoRec = (await pb
        .collection('programs')
        .getOne(destinoId)) as unknown as ProgramRecord

      // 1) Saída na origem
      await pb.collection('program_entries').create({
        program: origemId,
        type: 'saida',
        description: `Transferência para ${destinoRec.name}`,
        quantity: saida,
        date: dateStr,
      })
      await pb.collection('programs').update(origemId, {
        balance: (origemRec.balance || 0) - saida,
      })

      // 2) Entrada no destino, com bônus e paridade aplicados
      const custoMilheiro =
        pontosEntrada > 0 ? Math.round((custoTotal / (pontosEntrada / 1000)) * 100) / 100 : 0
      const saldoDestino = destinoRec.balance || 0
      const avgDestino = destinoRec.cost_per_thousand || 0
      const totalCost = (saldoDestino * avgDestino) / 1000 + (pontosEntrada / 1000) * custoMilheiro
      const totalMiles = saldoDestino + pontosEntrada
      const novoAvg = totalMiles > 0 ? (totalCost / totalMiles) * 1000 : 0

      const sufixo = bonusNum ? ` (+${formatMiles(bonusNum)}% bônus)` : ''
      await pb.collection('program_entries').create({
        program: destinoId,
        type: 'entrada',
        description: `Transferência de ${origemRec.name}${sufixo}`,
        quantity: pontosEntrada,
        cost_per_thousand: custoMilheiro,
        date: dateStr,
      })
      await pb.collection('programs').update(destinoId, {
        balance: totalMiles,
        cost_per_thousand: Math.round(novoAvg * 100) / 100,
      })

      toast({
        title: 'Transferência registrada',
        description: `${formatMiles(saida)} pts saíram de ${origemRec.name} e ${formatMiles(pontosEntrada)} pts entraram em ${destinoRec.name}.`,
      })
      reset()
      onDone()
    } catch (err) {
      toast({
        title: 'Erro ao registrar transferência',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const programLabel = (p: ProgramRecord) => `${p.name} · ${formatMiles(p.balance || 0)}`

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      {/* Formulário */}
      <form onSubmit={handleSave} className="paper-card p-6 space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#23201A]">Transferir pontos</h2>
          <p className="text-sm text-[#6E6A5E] mt-1">
            Do banco ou do cartão para a companhia aérea, com bônus e paridade.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tr-origem" className="text-xs font-semibold text-[#23201A]">
            Origem *
          </Label>
          <select
            id="tr-origem"
            value={origemId}
            onChange={(e) => {
              setOrigemId(e.target.value)
              setErrors((prev) => ({ ...prev, origem: '' }))
            }}
            className={cn(
              'rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white',
              errors.origem && 'border-[#C4452F]',
            )}
          >
            <option value="">Selecione a origem</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {programLabel(p)}
                {p.is_club ? ' — clube' : ''}
              </option>
            ))}
          </select>
          {origem && (
            <p className="text-xs text-[#6E6A5E]">
              Saldo: {formatMiles(origem.balance || 0)}
              {custoMedioOrigem > 0 && <> · custo médio {formatBRL(custoMedioOrigem)}/milheiro</>}
            </p>
          )}
          {errors.origem && <p className="text-xs text-[#C4452F]">{errors.origem}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tr-destino" className="text-xs font-semibold text-[#23201A]">
            Destino *
          </Label>
          <select
            id="tr-destino"
            value={destinoId}
            onChange={(e) => {
              setDestinoId(e.target.value)
              setErrors((prev) => ({ ...prev, destino: '' }))
            }}
            className={cn(
              'rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white',
              errors.destino && 'border-[#C4452F]',
            )}
          >
            <option value="">Selecione o destino</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {programLabel(p)}
              </option>
            ))}
          </select>
          {errors.destino && <p className="text-xs text-[#C4452F]">{errors.destino}</p>}
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
          {(
            [
              ['so_pontos', 'Só pontos'],
              ['pontos_dinheiro', 'Pontos + dinheiro'],
            ] as [TransferMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                'h-10 rounded-lg text-sm font-semibold transition-all',
                mode === value
                  ? 'bg-[#16418F] text-white shadow-sm'
                  : 'text-[#6E6A5E] hover:bg-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tr-pontos" className="text-xs font-semibold text-[#23201A]">
              Pontos transferidos *
            </Label>
            <Input
              id="tr-pontos"
              inputMode="numeric"
              value={pontos}
              onChange={(e) => changePontos(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 50000"
              className={cn('rrmilhas-input tabular-nums', errors.pontos && 'border-[#C4452F]')}
            />
            {errors.pontos && <p className="text-xs text-[#C4452F]">{errors.pontos}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-bonus" className="text-xs font-semibold text-[#23201A]">
              Bônus (%)
            </Label>
            <Input
              id="tr-bonus"
              inputMode="numeric"
              value={bonus}
              onChange={(e) => setBonus(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 80"
              className="rrmilhas-input tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tr-paridade" className="text-xs font-semibold text-[#23201A]">
              Paridade
            </Label>
            <Input
              id="tr-paridade"
              inputMode="decimal"
              value={paridade}
              onChange={(e) => setParidade(e.target.value.replace(/[^0-9,]/g, ''))}
              placeholder="1"
              className="rrmilhas-input tabular-nums"
            />
            <p className="text-xs text-[#6E6A5E]">Pontos da origem por 1 do destino.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-date" className="text-xs font-semibold text-[#23201A]">
              Data *
            </Label>
            <Input
              id="tr-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn('rrmilhas-input', errors.date && 'border-[#C4452F]')}
            />
            {errors.date && <p className="text-xs text-[#C4452F]">{errors.date}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tr-saida" className="text-xs font-semibold text-[#23201A]">
              Pontos saídos do saldo *
            </Label>
            <Input
              id="tr-saida"
              inputMode="numeric"
              value={pontosSaido}
              onChange={(e) => changePontosSaido(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 20000"
              className={cn(
                'rrmilhas-input tabular-nums',
                errors.pontos_saido && 'border-[#C4452F]',
              )}
            />
            {errors.pontos_saido && <p className="text-xs text-[#C4452F]">{errors.pontos_saido}</p>}
          </div>
          {mode === 'pontos_dinheiro' && (
            <div className="space-y-1.5">
              <Label htmlFor="tr-dinheiro" className="text-xs font-semibold text-[#23201A]">
                Dinheiro pago (R$)
              </Label>
              <Input
                id="tr-dinheiro"
                inputMode="decimal"
                value={dinheiro}
                onChange={(e) => setDinheiro(maskBRL(e.target.value))}
                placeholder="Ex: 350,00"
                className="rrmilhas-input tabular-nums"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tr-obs" className="text-xs font-semibold text-[#23201A]">
            Observação (opcional)
          </Label>
          <Input
            id="tr-obs"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={160}
            placeholder="Ex: promoção de 100% de bônus"
            className="rrmilhas-input"
          />
        </div>

        <Button
          type="submit"
          disabled={saving || programs.length === 0}
          className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
        >
          {saving ? 'Salvando...' : 'Registrar transferência'}
        </Button>
      </form>

      {/* Prévia ao vivo */}
      <div className="space-y-4 lg:sticky lg:top-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#6E6A5E]">Prévia</p>
        <div className="paper-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6E6A5E]">
                Sai de
              </p>
              <p className="font-serif text-lg font-bold text-[#23201A] truncate">
                {origem?.name || '—'}
              </p>
              <p className="text-sm font-semibold text-[#C4452F] tabular-nums">
                -{formatMiles(pontosSaidos)}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#0E8FB8] shrink-0" />
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#6E6A5E]">
                Entra em
              </p>
              <p className="font-serif text-lg font-bold text-[#23201A] truncate">
                {destino?.name || '—'}
              </p>
              <p className="text-sm font-semibold text-[#0E8FB8] tabular-nums">
                +{formatMiles(pontosEntrada)}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="paper-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6E6A5E]">
              Custo total
            </p>
            <p className="font-serif text-2xl font-bold text-[#23201A] mt-2 tabular-nums">
              {formatBRL(custoTotal)}
            </p>
          </div>
          <div className="paper-card p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6E6A5E]">
              Milheiro no destino
            </p>
            <p className="font-serif text-2xl font-bold text-[#0E8FB8] mt-2 tabular-nums">
              {formatBRL(milheiroDestino)}
            </p>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs text-[#6E6A5E]">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0E8FB8]" />
          O custo do milheiro no destino considera o custo médio da origem e o dinheiro pago. Apagar
          um dos lados apaga o outro.
        </p>
      </div>
    </div>
  )
}
