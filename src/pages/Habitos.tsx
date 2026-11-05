import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Flame, Trash2, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import type { HabitRecord, HabitLogRecord, HabitColor } from '@/types/database'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const COLOR_MAP: Record<HabitColor, { bg: string; label: string; hex: string }> = {
  verde: { bg: 'bg-[#2F8F5B]', label: 'Verde', hex: '#2F8F5B' },
  ambar: { bg: 'bg-[#E8A33D]', label: 'Âmbar', hex: '#E8A33D' },
  azul: { bg: 'bg-[#3B6FA0]', label: 'Azul', hex: '#3B6FA0' },
  coral: { bg: 'bg-[#C4452F]', label: 'Coral', hex: '#C4452F' },
}

const ICON_PRESETS = [
  'droplet',
  'book-open',
  'footprints',
  'dumbbell',
  'apple',
  'moon',
  'sun',
  'heart',
  'brain',
  'music',
  'pencil',
  'medal',
]

const ICON_EMOJI: Record<string, string> = {
  droplet: '💧',
  'book-open': '📖',
  footprints: '🚶',
  dumbbell: '🏋️',
  apple: '🍎',
  moon: '🌙',
  sun: '☀️',
  heart: '❤️',
  brain: '🧠',
  music: '🎵',
  pencil: '✏️',
  medal: '🏅',
}

function dateOnly(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export default function Habitos() {
  const { toast } = useToast()
  const [habits, setHabits] = useState<HabitRecord[]>([])
  const [logs, setLogs] = useState<HabitLogRecord[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<HabitRecord | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('droplet')
  const [color, setColor] = useState<HabitColor>('verde')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      pb.collection('habits').getFullList({ sort: 'created' }),
      pb.collection('habit_logs').getFullList({ sort: '-date' }),
    ])
      .then(([h, l]) => {
        setHabits(h as unknown as HabitRecord[])
        setLogs(l as unknown as HabitLogRecord[])
      })
      .catch(console.error)
  }, [])

  useRealtime<HabitRecord>('habits', (e) => {
    setHabits((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  useRealtime<HabitLogRecord>('habit_logs', (e) => {
    setLogs((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  const last7Days = useMemo(() => [6, 5, 4, 3, 2, 1, 0].map(dateOnly), [])

  const bestStreak = useMemo(() => {
    let best = 0
    for (const habit of habits) {
      const habitLogDates = logs
        .filter((l) => l.habit === habit.id)
        .map((l) => l.date?.slice(0, 10))
        .sort()
      let streak = 0
      const dateSet = new Set(habitLogDates)
      let cursor = new Date()
      // walk back up to 60 days
      for (let i = 0; i < 60; i++) {
        const key = cursor.toISOString().slice(0, 10)
        if (dateSet.has(key)) {
          streak++
        } else if (i > 0) {
          // only break if today is not logged and we already found a streak
          if (streak > 0) break
        }
        cursor.setDate(cursor.getDate() - 1)
      }
      best = Math.max(best, streak)
    }
    return best
  }, [habits, logs])

  const weekCompletion = (habitId: string) => {
    const dates = new Set(logs.filter((l) => l.habit === habitId).map((l) => l.date?.slice(0, 10)))
    const count = last7Days.filter((d) => dates.has(d)).length
    return Math.round((count / 7) * 100)
  }

  const toggleLog = async (habitId: string, day: string) => {
    const existing = logs.find((l) => l.habit === habitId && l.date?.slice(0, 10) === day)
    if (existing) {
      setLogs((prev) => prev.filter((l) => l.id !== existing.id))
      try {
        await pb.collection('habit_logs').delete(existing.id)
      } catch {
        setLogs((prev) => [...prev, existing])
      }
    } else {
      const optimistic = {
        id: `tmp-${habitId}-${day}`,
        habit: habitId,
        date: day,
      } as HabitLogRecord
      setLogs((prev) => [...prev, optimistic])
      try {
        const created = await pb.collection('habit_logs').create({ habit: habitId, date: day })
        setLogs((prev) =>
          prev.map((l) => (l.id === optimistic.id ? (created as HabitLogRecord) : l)),
        )
      } catch {
        setLogs((prev) => prev.filter((l) => l.id !== optimistic.id))
      }
    }
  }

  const openCreate = () => {
    setName('')
    setIcon('droplet')
    setColor('verde')
    setFieldErrors({})
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (!name.trim()) {
      setFieldErrors({ name: 'Nome do hábito é obrigatório' })
      return
    }
    if (name.length > 60) {
      setFieldErrors({ name: 'Máximo de 60 caracteres' })
      return
    }

    setSaving(true)
    try {
      await pb.collection('habits').create({ name: name.trim(), icon, color, active: true })
      toast({ title: 'Hábito criado', description: 'Comece a marcar seus dias!' })
      setCreateOpen(false)
    } catch (err: unknown) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await pb.collection('habits').delete(deleting.id)
      toast({ title: 'Hábito excluído' })
      setDeleting(null)
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="fade-rise space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-2xl font-semibold text-[#23201A]">Hábitos</h1>
        <Button
          onClick={openCreate}
          className="h-11 px-5 rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white font-medium text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo hábito
        </Button>
      </header>

      {/* Streak header card */}
      <div className="paper-card-interactive p-5 flex items-center gap-4 bg-gradient-to-r from-[#FFF8EE] to-white border-[#E8E2D6]">
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-[#E8A33D]/15">
          <Flame className="w-7 h-7 text-[#E8A33D]" />
        </div>
        <div>
          <p className="text-xs font-medium text-[#6E6A5E] uppercase tracking-wide">
            Sequência atual
          </p>
          <p className="font-serif text-2xl font-semibold text-[#23201A]">
            {bestStreak} {bestStreak === 1 ? 'dia' : 'dias'} consecutivos
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-[#E8A33D] ml-auto opacity-60" />
      </div>

      {/* Habit cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {habits.map((habit, i) => {
          const meta = COLOR_MAP[habit.color]
          const completion = weekCompletion(habit.id)
          const logDates = new Set(
            logs.filter((l) => l.habit === habit.id).map((l) => l.date?.slice(0, 10)),
          )
          return (
            <div
              key={habit.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="fade-rise paper-card-interactive p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid place-items-center w-11 h-11 rounded-xl text-xl"
                    style={{ backgroundColor: `${meta.hex}20` }}
                  >
                    {ICON_EMOJI[habit.icon] || '⭐'}
                  </span>
                  <div>
                    <h3 className="font-medium text-sm text-[#23201A]">{habit.name}</h3>
                    <p className="text-[11px] text-[#6E6A5E]">{meta.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleting(habit)}
                  className="grid place-items-center w-8 h-8 rounded-lg text-[#9B968A] hover:text-[#C4452F] hover:bg-[#C4452F]/10 transition-colors"
                  aria-label={`Excluir ${habit.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* 7-day strip */}
              <div className="flex justify-between gap-1.5 mb-4">
                {last7Days.map((day) => {
                  const filled = logDates.has(day)
                  const isToday = day === dateOnly(0)
                  const dateObj = new Date(`${day}T12:00:00`)
                  return (
                    <button
                      key={day}
                      onClick={() => toggleLog(habit.id, day)}
                      className="flex flex-col items-center gap-1 flex-1 min-w-0 group"
                      aria-label={`Marcar ${day}`}
                    >
                      <span className="text-[10px] text-[#6E6A5E]">
                        {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                      </span>
                      <span
                        className={cn(
                          'w-9 h-9 rounded-full grid place-items-center text-xs font-semibold transition-all duration-200 group-hover:scale-105',
                          filled
                            ? `${meta.bg} text-white shadow-sm`
                            : 'bg-[#FAF7F0] text-[#9B968A] border border-[#E8E2D6]',
                          isToday && !filled && 'ring-2 ring-[#E8A33D]/60 ring-offset-1',
                        )}
                      >
                        {filled ? '✓' : dateObj.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Weekly completion */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#6E6A5E]">Últimos 7 dias</span>
                  <span className="font-semibold text-[#23201A]">{completion}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E8E2D6] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${completion}%`, backgroundColor: meta.hex }}
                  />
                </div>
              </div>
            </div>
          )
        })}
        {habits.length === 0 && (
          <div className="paper-card p-10 text-center col-span-full">
            <p className="text-sm text-[#6E6A5E]">Nenhum hábito cadastrado ainda.</p>
          </div>
        )}
      </div>

      {/* Create habit dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Novo hábito</DialogTitle>
            <DialogDescription>Comece com algo simples e consistente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="habit-name" className="text-xs font-semibold text-[#23201A]">
                Nome *
              </Label>
              <Input
                id="habit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Meditar 10 minutos"
                maxLength={60}
                className={cn('ovv-input', fieldErrors.name && 'border-[#C4452F]')}
              />
              {fieldErrors.name && <p className="text-xs text-[#C4452F]">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#23201A]">Ícone</Label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_PRESETS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      'grid place-items-center h-10 rounded-xl text-lg transition-all',
                      icon === ic
                        ? 'bg-[#1E5C46]/10 border-2 border-[#1E5C46]'
                        : 'bg-[#FAF7F0] border border-[#E8E2D6] hover:bg-white',
                    )}
                  >
                    {ICON_EMOJI[ic]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#23201A]">Cor</Label>
              <div className="flex gap-2">
                {(Object.keys(COLOR_MAP) as HabitColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={COLOR_MAP[c].label}
                    className={cn(
                      'w-10 h-10 rounded-full transition-all',
                      COLOR_MAP[c].bg,
                      color === c
                        ? 'ring-2 ring-offset-2 ring-[#23201A]/30 scale-110'
                        : 'opacity-70 hover:opacity-100',
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white"
              >
                {saving ? 'Salvando...' : 'Criar hábito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Excluir hábito?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-[#23201A]">{deleting?.name}</span> e todo o
              histórico de marcações serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="rounded-xl bg-[#C4452F] hover:bg-[#A93A26] text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
