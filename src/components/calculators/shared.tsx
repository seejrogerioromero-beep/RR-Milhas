// Peços compartilhados das calculadoras: campo com dica, chips de programa e rodapé de resultado.
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBRL, maskBRL } from '@/lib/miles'

/** 'brl' aplica a máscara de reais; 'num' aceita dígitos e separadores (10.000 / 17,5). */
export type NumKind = 'brl' | 'num'

export interface CalcFieldProps {
  id: string
  label: string
  hint?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  kind?: NumKind
}

/** Campo de número da calculadora, no padrão do print: rótulo, dica "Ex: ..." e dica auxiliar. */
export function CalcField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  kind = 'num',
}: CalcFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-[#23201A]">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            kind === 'brl' ? maskBRL(e.target.value) : e.target.value.replace(/[^\d.,]/g, ''),
          )
        }
        className="rrmilhas-input tabular-nums"
      />
      {hint && <p className="text-xs text-[#6E6A5E]">{hint}</p>}
    </div>
  )
}

export interface ProgramChipData {
  name: string
  cost: number
}

/** Chips "Livelo: R$ 25,00" — um por programa cadastrado; clicar preenche o campo milheiro. */
export function ProgramChips({
  programs,
  onPick,
}: {
  programs: ProgramChipData[]
  onPick: (cost: number) => void
}) {
  if (programs.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {programs.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => onPick(p.cost)}
          className="rounded-full border border-[#E8E2D6] bg-[#FAF7F0] px-3 py-1 text-xs font-semibold text-[#23201A] transition-colors hover:border-[#16418F]/50 hover:bg-[#16418F]/5"
        >
          {p.name}: {formatBRL(p.cost)}
        </button>
      ))}
    </div>
  )
}

/** Rodapé do print: faixa com a mensagem enquanto falta dado, resultado destacado quando completa. */
export function ResultFooter({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[#D8D2C4] bg-white px-5 py-5">
      {message ? <p className="text-sm text-[#6E6A5E]">{message}</p> : <div>{children}</div>}
    </div>
  )
}

/** Título + subtítulo da calculadora ativa, acima do card branco. */
export function CalcHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-xl font-bold text-[#23201A]">{title}</h2>
      <p className="text-sm text-[#6E6A5E] mt-1">{subtitle}</p>
    </div>
  )
}
