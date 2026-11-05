import React, { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* --------------------------------- CountUp -------------------------------- */

export function CountUp({
  value,
  duration = 600,
  format,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
}) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prev.current
    const to = value
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prev.current = to
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <span className="tabular-nums">{format ? format(display) : Math.round(display)}</span>
}

/* --------------------------------- Donut ---------------------------------- */

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export function DonutChart({
  slices,
  centerLabel,
}: {
  slices: DonutSlice[]
  centerLabel?: string
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const size = 200
  const stroke = 26
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total > 0 &&
          slices.map((slice) => {
            const fraction = slice.value / total
            const dash = fraction * circumference
            const el = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
                className="ring-fill"
              />
            )
            offset += dash
            return el
          })}
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-[#23201A]"
          style={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}
        >
          {centerLabel || 'Total'}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          className="fill-[#23201A] tabular-nums"
          style={{ fontSize: 15, fontFamily: 'Fraunces', fontWeight: 700 }}
        >
          {total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          })}
        </text>
      </svg>

      <ul className="space-y-2 flex-1 min-w-[160px]">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-[#23201A]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="tabular-nums font-medium text-[#6E6A5E]">
              {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
        {slices.length === 0 && <li className="text-sm text-[#6E6A5E]">Sem despesas neste mês</li>}
      </ul>
    </div>
  )
}

/* --------------------------------- BarChart -------------------------------- */

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const values = data.map((d) => Math.abs(d.value))
  const max = Math.max(1, ...values)

  return (
    <div className="flex items-end gap-1.5 h-44">
      {data.map((d, i) => {
        const height = (Math.abs(d.value) / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <div
              className={cn(
                'w-full rounded-t-md transition-all duration-500',
                d.value >= 0 ? 'bg-[#2F8F5B]' : 'bg-[#C4452F]',
              )}
              style={{ height: `${height}%` }}
              title={`${d.label}: ${d.value.toFixed(2)}`}
            />
            <span className="text-[9px] text-[#6E6A5E] mt-1.5 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------- Sheet ---------------------------------- */

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  side?: 'right' | 'bottom'
}

export function Sheet({ open, onClose, title, children, side = 'right' }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#23201A]/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
          />
          <div
            className={cn(
              'fixed z-50 bg-white shadow-2xl',
              side === 'right'
                ? 'sheet-slide inset-y-0 right-0 w-full sm:w-[420px] flex flex-col'
                : 'sheet-slide-up inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl flex flex-col',
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E2D6]">
              <h3 className="font-serif text-lg font-semibold text-[#23201A]">{title}</h3>
              <button
                onClick={onClose}
                className="grid place-items-center w-9 h-9 rounded-lg hover:bg-[#FAF7F0] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-[#6E6A5E]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------- MonthNav --------------------------------- */

export function MonthNav({
  month,
  onPrev,
  onNext,
  label,
}: {
  month: number
  onPrev: () => void
  onNext: () => void
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-[#E8E2D6] bg-white shadow-[0_1px_3px_rgba(35,32,26,0.06)]">
      <button
        onClick={onPrev}
        className="grid place-items-center w-9 h-9 rounded-l-xl hover:bg-[#FAF7F0] transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="w-4 h-4 text-[#6E6A5E]" />
      </button>
      <span className="min-w-[150px] text-center text-sm font-semibold text-[#23201A]">
        {label}
      </span>
      <button
        onClick={onNext}
        className="grid place-items-center w-9 h-9 rounded-r-xl hover:bg-[#FAF7F0] transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight className="w-4 h-4 text-[#6E6A5E]" />
      </button>
    </div>
  )
}
