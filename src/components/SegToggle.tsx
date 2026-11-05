import { cn } from '@/lib/utils'

/** Toggle segmentado pill (padrão visual do app RRMILHAS). */
export function SegToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-flow-col auto-cols-fr gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-10 rounded-lg text-sm font-semibold transition-all',
            value === o.value
              ? 'bg-[#16418F] text-white shadow-sm'
              : 'text-[#6E6A5E] hover:bg-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const todayISO = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
