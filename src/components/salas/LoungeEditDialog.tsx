import { useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDelete } from '@/components/forms'
import type { LoungeRecord, LoungeStatus, LoungeTipo } from '@/types/database'
import {
  AREA_LABEL,
  REDE_LABEL,
  STATUS_META,
  TIPO_LABEL,
  monthsSinceReview,
  reviewIsStale,
} from '@/lib/salasVip'
import { formatDateBR } from '@/lib/miles'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface LoungeEditDialogProps {
  lounge: LoungeRecord | null
  onClose: () => void
  onSaved: () => void
}

const TIPOS = ['sala', 'sala_exclusiva', 'restaurante', 'descanso', 'spa', 'coworking']
const AREAS = ['dom', 'int', 'publica', 'dom e int', 'dom e publica']
const REDES = [
  'loungekey',
  'dragonpass',
  'mastercard_black',
  'visa_infinite',
  'nenhuma',
  'a_confirmar',
]
const STATUSES = ['confirmado', 'a_confirmar', 'fechado_temporariamente', 'previsto', 'nao_incluso']

export default function LoungeEditDialog({ lounge, onClose, onSaved }: LoungeEditDialogProps) {
  const { toast } = useToast()
  const [nome, setNome] = useState(lounge?.nome ?? '')
  const [terminal, setTerminal] = useState(lounge?.terminal ?? '')
  const [area, setArea] = useState(lounge?.area ?? 'none')
  const [tipo, setTipo] = useState<LoungeTipo>(lounge?.tipo ?? 'sala')
  const [redes, setRedes] = useState<string[]>(lounge?.redes ?? [])
  const [status, setStatus] = useState<LoungeStatus>(lounge?.status ?? 'confirmado')
  const [observacoes, setObservacoes] = useState(lounge?.observacoes ?? '')
  const [saving, setSaving] = useState(false)

  if (!lounge) return null

  const toggleRede = (r: string) =>
    setRedes((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))

  async function handleSave() {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome da sala', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await pb.collection('lounges').update(lounge!.id, {
        nome: nome.trim(),
        terminal: terminal.trim(),
        area: area === 'none' ? '' : area,
        tipo,
        redes,
        status,
        observacoes: observacoes.trim(),
      })
      toast({ title: 'Sala atualizada', description: nome.trim() })
      onSaved()
      onClose()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const stale = reviewIsStale(lounge.revisado_em)
  const m = monthsSinceReview(lounge.revisado_em)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar sala ou restaurante</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rrmilhas-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Terminal</Label>
              <Input
                value={terminal}
                onChange={(e) => setTerminal(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="rrmilhas-input">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {AREA_LABEL[a] ?? a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as LoungeTipo)}>
                <SelectTrigger className="rrmilhas-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LoungeStatus)}>
                <SelectTrigger className="rrmilhas-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s]?.label ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Redes aceitas</Label>
            <div className="flex flex-wrap gap-2">
              {REDES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRede(r)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    redes.includes(r)
                      ? 'border-[#16418F] bg-[#16418F] text-white'
                      : 'border-[#16418F]/30 bg-white text-[#16418F] hover:bg-[#16418F]/5',
                  )}
                >
                  {REDE_LABEL[r] ?? r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="rrmilhas-input"
            />
          </div>
          <p className="text-xs text-[#6E6A5E]">
            Última revisão:{' '}
            {lounge.revisado_em ? formatDateBR(lounge.revisado_em.slice(0, 10)) : '—'}
            {m !== null ? ` (${m} ${m === 1 ? 'mês' : 'meses'} atrás)` : ''}
            {stale && ' — mais de 6 meses, confira antes de viajar'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#16418F] hover:bg-[#123678] text-white"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
