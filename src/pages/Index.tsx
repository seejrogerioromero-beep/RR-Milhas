import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  Wallet,
  Repeat,
  StickyNote,
  Flame,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import type {
  TaskRecord,
  TransactionRecord,
  NoteRecord,
  HabitRecord,
  HabitLogRecord,
} from '@/types/database'
import { CountUp, DonutChart } from '@/components/ovv'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  moradia: '#16418F',
  alimentacao: '#E8A33D',
  transporte: '#3B6FA0',
  saude: '#C4452F',
  lazer: '#7C5CBF',
  educacao: '#2E8B8B',
  outros: '#9B968A',
}

const CATEGORY_LABELS: Record<string, string> = {
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  lazer: 'Lazer',
  educacao: 'Educação',
  outros: 'Outros',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tasks, setTasks] = React.useState<TaskRecord[]>([])
  const [transactions, setTransactions] = React.useState<TransactionRecord[]>([])
  const [notes, setNotes] = React.useState<NoteRecord[]>([])
  const [habits, setHabits] = React.useState<HabitRecord[]>([])
  const [habitLogs, setHabitLogs] = React.useState<HabitLogRecord[]>([])

  // Fetch initial data + realtime subscriptions
  React.useEffect(() => {
    const loadAll = async () => {
      try {
        const [t, tx, n, h, hl] = await Promise.all([
          pb.collection('tasks').getFullList({ sort: '-created' }),
          pb.collection('transactions').getFullList({ sort: '-date' }),
          pb.collection('notes').getFullList({ sort: '-updated' }),
          pb.collection('habits').getFullList({ sort: 'created' }),
          pb.collection('habit_logs').getFullList({ sort: '-date' }),
        ])
        setTasks(t as TaskRecord[])
        setTransactions(tx as TransactionRecord[])
        setNotes(n as NoteRecord[])
        setHabits(h as HabitRecord[])
        setHabitLogs(hl as HabitLogRecord[])
      } catch (err) {
        console.error(err)
      }
    }
    loadAll()
  }, [])

  useRealtime<TaskRecord>('tasks', (e) => {
    setTasks((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  useRealtime<TransactionRecord>('transactions', (e) => {
    setTransactions((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  useRealtime<NoteRecord>('notes', (e) => {
    setNotes((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  useRealtime<HabitLogRecord>('habit_logs', (e) => {
    setHabitLogs((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  useRealtime<HabitRecord>('habits', (e) => {
    setHabits((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  // Aggregates
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const monthPrefix = todayStr.slice(0, 7)

  const pendingToday = tasks.filter(
    (t) => !t.done && t.due && t.due.slice(0, 10) <= todayStr,
  ).length

  const monthTx = transactions.filter((t) => t.date?.slice(0, 7) === monthPrefix)
  const receitas = monthTx.filter((t) => t.type === 'receita').reduce((s, t) => s + t.amount, 0)
  const despesas = monthTx.filter((t) => t.type === 'despesa').reduce((s, t) => s + t.amount, 0)
  const saldo = receitas - despesas

  const todayLogs = habitLogs.filter((l) => l.date?.slice(0, 10) === todayStr)
  const habitosCompletos = todayLogs.length
  const habitosTotal = habits.length

  const pinnedNotes = notes.filter((n) => n.pinned)

  // Expense donut slices
  const donutSlices = useMemo(() => {
    const byCat: Record<string, number> = {}
    for (const tx of monthTx) {
      if (tx.type === 'despesa') {
        byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount
      }
    }
    return Object.entries(byCat)
      .map(([cat, value]) => ({
        label: CATEGORY_LABELS[cat] || cat,
        value,
        color: CATEGORY_COLORS[cat] || '#9B968A',
      }))
      .sort((a, b) => b.value - a.value)
  }, [JSON.stringify(monthTx)])

  const toggleTask = async (task: TaskRecord) => {
    // Optimistic
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
    try {
      await pb.collection('tasks').update(task.id, { done: !task.done })
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)))
    }
  }

  const toggleHabitToday = async (habitId: string) => {
    const existing = todayLogs.find((l) => l.habit === habitId)
    if (existing) {
      setHabitLogs((prev) => prev.filter((l) => l.id !== existing.id))
      try {
        await pb.collection('habit_logs').delete(existing.id)
      } catch {
        setHabitLogs((prev) => [...prev, existing])
      }
    } else {
      const optimistic: HabitLogRecord = {
        id: `tmp-${habitId}`,
        habit: habitId,
        date: `${todayStr} 12:00:00`,
      } as unknown as HabitLogRecord
      setHabitLogs((prev) => [...prev, optimistic])
      try {
        const created = await pb.collection('habit_logs').create({ habit: habitId, date: todayStr })
        setHabitLogs((prev) =>
          prev.map((l) => (l.id === optimistic.id ? (created as HabitLogRecord) : l)),
        )
      } catch {
        setHabitLogs((prev) => prev.filter((l) => l.id !== optimistic.id))
      }
    }
  }
  const statCards = [
    {
      to: '/tarefas',
      label: 'Tarefas pendentes hoje',
      value: pendingToday,
      icon: CheckCircle2,
      color: 'text-[#C4452F]',
      bg: 'bg-[#C4452F]/10',
    },
    {
      to: '/financas',
      label: 'Saldo do mês',
      value: saldo,
      isCurrency: true,
      icon: Wallet,
      color: saldo >= 0 ? 'text-[#0E8FB8]' : 'text-[#C4452F]',
      bg: saldo >= 0 ? 'bg-[#0E8FB8]/10' : 'bg-[#C4452F]/10',
    },
    {
      to: '/habitos',
      label: 'Hábitos de hoje',
      value: habitosTotal > 0 ? Math.round((habitosCompletos / habitosTotal) * 100) : 0,
      suffix: '%',
      icon: Repeat,
      color: 'text-[#3B6FA0]',
      bg: 'bg-[#3B6FA0]/10',
    },
    {
      to: '/anotacoes',
      label: 'Anotações fixadas',
      value: pinnedNotes.length,
      icon: StickyNote,
      color: 'text-[#E8A33D]',
      bg: 'bg-[#E8A33D]/10',
    },
  ]

  const tasksToday = tasks.filter((t) => {
    if (t.done) return false
    if (!t.due) return false
    return t.due.slice(0, 10) <= todayStr
  })

  return (
    <div className="space-y-8 fade-rise">
      {/* Greeting */}
      <header>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#23201A] tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-[#6E6A5E] mt-1.5 capitalize">{formatDate(today)}</p>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            style={{ animationDelay: `${i * 40}ms` }}
            className="paper-card-interactive p-5 text-left group fade-rise"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={cn('p-2 rounded-xl', card.bg)}>
                <card.icon className={cn('w-5 h-5', card.color)} />
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#9B968A] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-[#23201A]">
              {card.isCurrency ? (
                <CountUp
                  value={card.value}
                  format={(n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
              ) : (
                <CountUp value={card.value} />
              )}
              {card.suffix && <span className="text-[#6E6A5E]">{card.suffix}</span>}
            </p>
            <p className="text-xs text-[#6E6A5E] mt-1">{card.label}</p>
          </button>
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="paper-card p-5">
          <h3 className="font-serif text-lg font-semibold text-[#23201A] mb-4">
            Despesas por categoria
          </h3>
          <DonutChart slices={donutSlices} centerLabel="Gastos" />
        </div>
        <div className="paper-card p-5">
          <h3 className="font-serif text-lg font-semibold text-[#23201A] mb-4">
            Receitas vs Despesas
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-1.5 text-[#23201A]">
                  <TrendingUp className="w-4 h-4 text-[#0E8FB8]" /> Receitas
                </span>
                <span className="tabular-nums font-semibold text-[#0E8FB8]">
                  {receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E8E2D6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0E8FB8] transition-all duration-500"
                  style={{
                    width: `${receitas + despesas > 0 ? (receitas / (receitas + despesas)) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-1.5 text-[#23201A]">
                  <TrendingDown className="w-4 h-4 text-[#C4452F]" /> Despesas
                </span>
                <span className="tabular-nums font-semibold text-[#C4452F]">
                  {despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#E8E2D6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#C4452F] transition-all duration-500"
                  style={{
                    width: `${receitas + despesas > 0 ? (despesas / (receitas + despesas)) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's tasks */}
      <section className="paper-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-[#23201A]">Tarefas de hoje</h3>
          <button
            onClick={() => navigate('/tarefas')}
            className="text-xs font-medium text-[#16418F] hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="space-y-2">
          {tasksToday.length === 0 && (
            <p className="text-sm text-[#6E6A5E] py-4 text-center">
              Nenhuma tarefa pendente para hoje. 🎉
            </p>
          )}
          {tasksToday.slice(0, 8).map((task, i) => {
            const isOverdue = task.due.slice(0, 10) < todayStr
            return (
              <div
                key={task.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="fade-rise flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAF7F0] transition-colors"
              >
                <button
                  onClick={() => toggleTask(task)}
                  className="shrink-0"
                  aria-label="Concluir tarefa"
                >
                  {task.done ? (
                    <CheckCircle2 className="w-5 h-5 text-[#0E8FB8]" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#9B968A] hover:text-[#16418F] transition-colors" />
                  )}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm text-[#23201A]',
                    task.done && 'line-through text-[#9B968A]',
                  )}
                >
                  {task.title}
                </span>
                {isOverdue && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-[#C4452F]/10 text-[#C4452F]">
                    Atrasada
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Today's habits */}
      <section className="paper-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-[#23201A]">Hábitos de hoje</h3>
          <span className="text-xs font-medium text-[#6E6A5E]">
            {habitosCompletos}/{habitosTotal} concluídos
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {habits.map((habit) => {
            const done = todayLogs.some((l) => l.habit === habit.id)
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabitToday(habit.id)}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <svg width={72} height={72} viewBox="0 0 72 72">
                  <circle cx={36} cy={36} r={28} fill="none" stroke="#E8E2D6" strokeWidth={6} />
                  <circle
                    cx={36}
                    cy={36}
                    r={28}
                    fill="none"
                    stroke={done ? '#0E8FB8' : 'transparent'}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={done ? 0 : 2 * Math.PI * 28}
                    transform={`rotate(-90 36 36)`}
                    className="ring-fill"
                  />
                  <text x="50%" y="55%" textAnchor="middle" style={{ fontSize: 22 }} role="img">
                    {done ? '✓' : '○'}
                  </text>
                </svg>
                <span className="text-xs text-[#23201A] font-medium group-hover:text-[#16418F] transition-colors text-center max-w-[90px] truncate">
                  {habit.name}
                </span>
              </button>
            )
          })}
          {habits.length === 0 && (
            <p className="text-sm text-[#6E6A5E] py-4">Nenhum hábito cadastrado ainda.</p>
          )}
        </div>
      </section>

      {/* Pinned notes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-[#23201A]">Anotações fixadas</h3>
          <button
            onClick={() => navigate('/anotacoes')}
            className="text-xs font-medium text-[#16418F] hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {pinnedNotes.map((note, i) => (
            <div
              key={note.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="fade-rise paper-card p-4 min-w-[260px] max-w-[300px] shrink-0 border-l-4 border-l-[#E8A33D] cursor-pointer hover:-translate-y-0.5 transition-transform"
              onClick={() => navigate('/anotacoes')}
            >
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-4 h-4 text-[#E8A33D]" />
                <h4 className="font-medium text-sm text-[#23201A] truncate">{note.title}</h4>
              </div>
              <p className="text-xs text-[#6E6A5E] line-clamp-3 leading-relaxed">{note.content}</p>
            </div>
          ))}
          {pinnedNotes.length === 0 && (
            <p className="text-sm text-[#6E6A5E] py-4">Nenhuma anotação fixada.</p>
          )}
        </div>
      </section>
    </div>
  )
}
