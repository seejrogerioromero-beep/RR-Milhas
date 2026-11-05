import React, { useState, useEffect, useMemo } from 'react'
import { Pin, PinOff, Plus, Pencil, Trash2, StickyNote, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import type { NoteRecord } from '@/types/database'
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

function relativeDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  return date.toLocaleDateString('pt-BR')
}

export default function Anotacoes() {
  const { toast } = useToast()
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<NoteRecord | null>(null)
  const [deleting, setDeleting] = useState<NoteRecord | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    pb.collection('notes')
      .getFullList({ sort: '-updated' })
      .then((res) => setNotes(res as unknown as NoteRecord[]))
      .catch(console.error)
  }, [])

  useRealtime<NoteRecord>('notes', (e) => {
    setNotes((prev) => {
      const next = prev.filter((r) => r.id !== e.record.id)
      next.push(e.record)
      return next
    })
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return notes
    const q = search.toLowerCase()
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    )
  }, [notes, search])

  // Sort: pinned first, then most recently updated
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.updated || '').localeCompare(a.updated || '')
    })
  }, [filtered])

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setContent('')
    setPinned(false)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const openEdit = (note: NoteRecord) => {
    setEditing(note)
    setTitle(note.title)
    setContent(note.content)
    setPinned(note.pinned)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Título é obrigatório'
    if (title.length > 120) errors.title = 'Máximo de 120 caracteres'
    if (!content.trim()) errors.content = 'O conteúdo é obrigatório'
    if (content.length > 10000) errors.content = 'Máximo de 10000 caracteres'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    try {
      const payload = { title: title.trim(), content: content.trim(), pinned }
      if (editing) {
        await pb.collection('notes').update(editing.id, payload)
        toast({ title: 'Anotação salva', description: 'Suas alterações foram registradas.' })
      } else {
        await pb.collection('notes').create(payload)
        toast({ title: 'Anotação criada', description: 'Sua anotação está no quadro.' })
      }
      setEditorOpen(false)
    } catch (err: unknown) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (note: NoteRecord) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)))
    try {
      await pb.collection('notes').update(note.id, { pinned: !note.pinned })
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: note.pinned } : n)))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await pb.collection('notes').delete(deleting.id)
      toast({ title: 'Anotação excluída' })
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
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold text-[#23201A]">Anotações</h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8A33D]/15 text-[#B87F1F]">
            {sorted.length} {sorted.length === 1 ? 'nota' : 'notas'}
          </span>
        </div>
        <Button
          onClick={openCreate}
          className="h-11 px-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> Nova anotação
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6A5E]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou conteúdo..."
          className="h-11 rounded-xl bg-white border-[#E8E2D6] pl-9 text-sm"
        />
      </div>

      {/* Masonry grid */}
      <div className="columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {sorted.map((note, i) => (
          <div
            key={note.id}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            onClick={() => openEdit(note)}
            className={cn(
              'fade-rise paper-card-interactive p-4 mb-4 break-inside-avoid cursor-pointer block',
              note.pinned && 'border-l-4 border-l-[#E8A33D]',
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-sm text-[#23201A] leading-snug line-clamp-2">
                {note.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePin(note)
                }}
                className="shrink-0 p-1.5 -m-1.5 rounded-lg hover:bg-[#FAF7F0] transition-colors"
                aria-label={note.pinned ? 'Desafixar anotação' : 'Fixar anotação'}
              >
                {note.pinned ? (
                  <Pin className="w-4 h-4 text-[#E8A33D]" fill="#E8A33D" />
                ) : (
                  <PinOff className="w-4 h-4 text-[#9B968A] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
            <p className="text-xs text-[#6E6A5E] leading-relaxed line-clamp-3 whitespace-pre-line">
              {note.content}
            </p>
            <p className="text-[10px] text-[#9B968A] mt-3">{relativeDate(note.updated)}</p>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="paper-card p-10 text-center col-span-full">
            <StickyNote className="w-8 h-8 text-[#E8A33D] mx-auto mb-3" />
            <p className="text-sm text-[#6E6A5E]">
              {search
                ? 'Nenhuma anotação encontrada para essa busca.'
                : 'Crie sua primeira anotação para começar.'}
            </p>
          </div>
        )}
      </div>

      {/* Editor modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? 'Editar anotação' : 'Nova anotação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="note-title" className="text-xs font-semibold text-[#23201A]">
                Título *
              </Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sobre o que é a anotação?"
                maxLength={120}
                className={cn('ovv-input', fieldErrors.title && 'border-[#C4452F]')}
              />
              {fieldErrors.title && <p className="text-xs text-[#C4452F]">{fieldErrors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note-content" className="text-xs font-semibold text-[#23201A]">
                Conteúdo *
              </Label>
              <Textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva livremente..."
                className="ovv-input min-h-[180px] resize-y leading-relaxed"
              />
              {fieldErrors.content && (
                <p className="text-xs text-[#C4452F]">{fieldErrors.content}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                  pinned
                    ? 'bg-[#E8A33D]/15 text-[#B87F1F]'
                    : 'bg-[#FAF7F0] text-[#6E6A5E] hover:bg-[#E8E2D6]/50',
                )}
              >
                <Pin className="w-3.5 h-3.5" />
                {pinned ? 'Fixada' : 'Fixar no topo'}
              </button>
            </div>

            <DialogFooter className="gap-2">
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleting(editing)}
                  className="rounded-xl text-[#C4452F] border-[#C4452F]/30 hover:bg-[#C4452F]/10"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </Button>
              )}
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Excluir anotação?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-[#23201A]">{deleting?.title}</span> será removida
              permanentemente.
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
