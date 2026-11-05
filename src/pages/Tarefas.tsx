import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
  CalendarDays,
  Flame,
  Flame as FlameHigh,
  ChevronDown,
  ChevronRight,
  Flag,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import type { TaskRecord, TaskPriority } from '@/types/database'
import { Sheet } from '@/components/ovv'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type FilterTab = 'todas' | 'hoje' | 'atrasadas' | 'concluidas'

const PRIORITY_ORDER: TaskPriority[] = ['alta', 'media', 'baixa']

const PRIORITY_STYLES: Record<TaskPriority, { label: string; className: string }> = {
  baixa: {
    label: 'Baixa',
    className: 'bg-[#9B968A]/15 text-[#6E6A5E]',
  },
  media: {
    label: 'Média',
    className: 'bg-[#E8A33D]/15 text-[#B87F1F]',
  },
  alta: {
    label: 'Alta',
    className: 'bg-[#C4452F]/15 text-[#C4452F]',
  },
}

export default function Tarefas() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [filter, setFilter] = useState<FilterTab>('todas')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRecord | null>(null)
  const [deleting, setDeleting] = useState<TaskRecord | null>(null)
  const [collapsed, setCollapsed] = useState<Record<TaskPriority, boolean>>({
    alta: false,
    media: false,
    baixa: false,
  })
  const [quickSearch, setQuickSearch] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('media')
  const [due, setDue] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Initial load
  useEffect(() => {
    pb.collection('tasks')
      .getFullList({ sort: 'due' })
      .then((res) => setTasks(res as unknown as TaskRecord[]))
      .catch(console.error)
  }, [])

  useRealtime<TaskRecord>('tasks', (e) => {
    setTasks((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  const todayStr = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    let list = tasks
    if (quickSearch) {
      const q = quickSearch.toLowerCase()
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q),
      )
    }
    switch (filter) {
      case 'todas':
        return list.filter((t) => !t.done)
      case 'hoje':
        return list.filter((t) => !t.done && t.due?.slice(0, 10) === todayStr)
      case 'atrasadas':
        return list.filter((t) => !t.done && t.due && t.due.slice(0, 10) < todayStr)
      case 'concluidas':
        return list.filter((t) => t.done)
    }
  }, [tasks, filter, quickSearch, todayStr])

  const pendingCount = tasks.filter((t) => !t.done).length
  const overdueCount = tasks.filter((t) => !t.done && t.due && t.due.slice(0, 10) < todayStr).length

  const grouped = useMemo(() => {
    return PRIORITY_ORDER.map((p) => ({
      priority: p,
      items: filtered.filter((t) => t.priority === p),
    })).filter((g) => g.items.length > 0)
  }, [filtered])

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setNotes('')
    setPriority('media')
    setDue('')
    setFieldErrors({})
    setSheetOpen(true)
  }

  const openEdit = (task: TaskRecord) => {
    setEditing(task)
    setTitle(task.title)
    setNotes(task.notes || '')
    setPriority(task.priority)
    setDue(task.due ? task.due.slice(0, 10) : '')
    setFieldErrors({})
    setSheetOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Título é obrigatório'
    if (title.length > 120) errors.title = 'Título deve ter no máximo 120 caracteres'
    if (notes.length > 2000) errors.notes = 'Anotações devem ter no máximo 2000 caracteres'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        notes: notes.trim() || null,
        priority,
        due: due || null,
      }
      if (editing) {
        await pb.collection('tasks').update(editing.id, payload)
        toast({ title: 'Tarefa atualizada', description: 'Suas alterações foram salvas.' })
      } else {
        await pb.collection('tasks').create(payload)
        toast({ title: 'Tarefa criada', description: 'Sua nova tarefa já está na lista.' })
      }
      setSheetOpen(false)
    } catch (err: unknown) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (task: TaskRecord) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
    try {
      await pb.collection('tasks').update(task.id, { done: !task.done })
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await pb.collection('tasks').delete(deleting.id)
      toast({ title: 'Tarefa excluída' })
      setDeleting(null)
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: (err as Error)?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleFilterChange = (f: FilterTab) => setFilter(f)
  const toggleGroup = useCallback(
    (p: TaskPriority) => setCollapsed((c) => ({ ...c, [p]: !c[p] })),
    [],
  )
  const handleQuickSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuickSearch(e.target.value)
  }, [])

  return (
    <div className="fade-rise space-y-6">
      {/* Global quick-search filter wired into the module list */}
      <div className="relative">
        <Input
          value={quickSearch}
          onChange={handleQuickSearch}
          placeholder="Buscar tarefa por título ou anotações..."
          className="h-11 rounded-xl bg-white border-[#E8E2D6] pl-4 pr-4 text-sm"
        />
      </div>

      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold text-[#23201A]">Tarefas</h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8A33D]/15 text-[#B87F1F]">
            {pendingCount} pendentes
          </span>
          {overdueCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#C4452F]/15 text-[#C4452F]">
              {overdueCount} atrasadas
            </span>
          )}
        </div>
        <Button
          onClick={openCreate}
          className="h-11 px-5 rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white font-medium text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> Nova tarefa
        </Button>
      </header>

      {/* Filter tabs with animated underline */}
      <div className="flex gap-1 border-b border-[#E8E2D6] overflow-x-auto">
        {(['todas', 'hoje', 'atrasadas', 'concluidas'] as FilterTab[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium capitalize transition-colors whitespace-nowrap',
              filter === f ? 'text-[#1E5C46]' : 'text-[#6E6A5E] hover:text-[#23201A]',
            )}
          >
            {f === 'hoje' ? 'Hoje' : f.charAt(0).toUpperCase() + f.slice(1)}
            {filter === f && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#1E5C46] animate-fade-in" />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-6">
        {grouped.length === 0 && (
          <div className="paper-card p-8 text-center">
            <FlameHigh className="w-8 h-8 text-[#E8A33D] mx-auto mb-2" />
            <p className="text-sm text-[#6E6A5E]">Nenhuma tarefa encontrada para este filtro.</p>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.priority}>
            <button
              onClick={() => toggleGroup(group.priority)}
              className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#6E6A5E] hover:text-[#23201A] transition-colors"
            >
              {collapsed[group.priority] ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span className="uppercase tracking-wide text-xs">
                {PRIORITY_STYLES[group.priority].label} ({group.items.length})
              </span>
            </button>
            {!collapsed[group.priority] && (
              <div className="space-y-2">
                {group.items.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    index={i}
                    task={task}
                    todayStr={todayStr}
                    onToggle={() => handleToggle(task)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleting(task)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create / Edit sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Editar tarefa' : 'Nova tarefa'}
        side="right"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs font-semibold text-[#23201A]">
              Título *
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              maxLength={120}
              className={cn('ovv-input', fieldErrors.title && 'border-[#C4452F]')}
            />
            {fieldErrors.title && <p className="text-xs text-[#C4452F]">{fieldErrors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-notes" className="text-xs font-semibold text-[#23201A]">
              Anotações
            </Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes, links, observações..."
              rows={4}
              className="ovv-input resize-none"
            />
            {fieldErrors.notes && <p className="text-xs text-[#C4452F]">{fieldErrors.notes}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#23201A]">Prioridade</Label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#E8E2D6]">
              {(['baixa', 'media', 'alta'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'h-9 rounded-lg text-xs font-semibold transition-all',
                    priority === p
                      ? p === 'alta'
                        ? 'bg-[#C4452F] text-white shadow-sm'
                        : p === 'media'
                          ? 'bg-[#E8A33D] text-white shadow-sm'
                          : 'bg-[#9B968A] text-white shadow-sm'
                      : 'text-[#6E6A5E] hover:bg-white',
                  )}
                >
                  {PRIORITY_STYLES[p].label}
                </button>
              ))}
            </div>
            {fieldErrors.priority && (
              <p className="text-xs text-[#C4452F]">{fieldErrors.priority}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-due" className="text-xs font-semibold text-[#23201A]">
              Data de vencimento
            </Label>
            <Input
              id="task-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="ovv-input"
            />
            {fieldErrors.due && <p className="text-xs text-[#C4452F]">{fieldErrors.due}</p>}
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-[#1E5C46] hover:bg-[#164635] text-white font-medium active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar tarefa'}
          </Button>
        </form>
      </Sheet>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Excluir tarefa?</DialogTitle>
            <DialogDescription>
              A tarefa <span className="font-medium text-[#23201A]">{deleting?.title}</span> será
              removida permanentemente.
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

/* ------------------------------- Task row --------------------------------- */

function TaskRow({
  task,
  index,
  todayStr,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: TaskRecord
  index: number
  todayStr: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isOverdue = !task.done && task.due && task.due.slice(0, 10) < todayStr
  const style = PRIORITY_STYLES[task.priority]

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="fade-rise paper-card-interactive flex items-center gap-3 p-4 group"
    >
      <button onClick={onToggle} className="shrink-0" aria-label="Marcar como concluída">
        {task.done ? (
          <CheckCircle2 className="w-5 h-5 text-[#2F8F5B]" />
        ) : (
          <Circle className="w-5 h-5 text-[#9B968A] group-hover:text-[#1E5C46] transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium text-[#23201A] truncate transition-all',
            task.done && 'line-through text-[#9B968A]',
          )}
        >
          {task.title}
        </p>
        {task.notes && <p className="text-xs text-[#6E6A5E] truncate mt-0.5">{task.notes}</p>}
      </div>

      <span
        className={cn(
          'hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shrink-0',
          style.className,
        )}
      >
        {style.label}
      </span>

      {task.due && (
        <span
          className={cn(
            'hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full shrink-0',
            isOverdue
              ? 'bg-[#C4452F]/10 text-[#C4452F] font-medium'
              : 'bg-[#FAF7F0] text-[#6E6A5E]',
          )}
        >
          <CalendarDays className="w-3 h-3" />
          {new Date(task.due).toLocaleDateString('pt-BR')}
        </span>
      )}

      {isOverdue && (
        <span className="sm:hidden text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4452F]/10 text-[#C4452F]">
          Atrasada
        </span>
      )}

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#FAF7F0] transition-colors"
          aria-label="Opções da tarefa"
        >
          <MoreVertical className="w-4 h-4 text-[#6E6A5E]" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-9 z-50 w-36 rounded-xl bg-white border border-[#E8E2D6] shadow-[0_8px_24px_rgba(35,32,26,0.10)] py-1 overflow-hidden">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#23201A] hover:bg-[#FAF7F0] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#C4452F] hover:bg-[#C4452F]/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
