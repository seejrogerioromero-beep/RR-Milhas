import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { CardProfileRecord, CardProfileRede } from '@/types/database'
import { REDE_LABEL } from '@/lib/salasVip'
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

interface CardProfileEditDialogProps {
  profile: CardProfileRecord | null
  onClose: () => void
  onSaved: () => void
}

const REDES: CardProfileRede[] = ['loungekey', 'dragonpass', 'nenhuma']

/** Edição de um perfil de cartão (collection card_profiles). */
export default function CardProfileEditDialog({
  profile,
  onClose,
  onSaved,
}: CardProfileEditDialogProps) {
  const { toast } = useToast()
  const [nome, setNome] = useState(profile?.nome ?? '')
  const [bandeira, setBandeira] = useState(profile?.bandeira ?? '')
  const [rede, setRede] = useState<CardProfileRede>(profile?.rede ?? 'nenhuma')
  const [acessos, setAcessos] = useState(
    profile?.acessos_ano === null || profile?.acessos_ano === undefined
      ? ''
      : String(profile.acessos_ano),
  )
  const [convidados, setConvidados] = useState(profile?.convidados_ano ?? '')
  const [gasto, setGasto] = useState(profile?.gasto_trimestral_minimo ?? '')
  const [anuidade, setAnuidade] = useState(profile?.anuidade ?? '')
  const [regras, setRegras] = useState(profile?.regras ?? '')
  const [beneficios, setBeneficios] = useState(profile?.outros_beneficios ?? '')
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  async function handleSave() {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do cartão', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await pb.collection('card_profiles').update(profile!.id, {
        nome: nome.trim(),
        bandeira: bandeira.trim(),
        rede,
        acessos_ano: acessos.trim() === '' ? null : Number(acessos),
        convidados_ano: convidados.trim(),
        gasto_trimestral_minimo: gasto.trim(),
        anuidade: anuidade.trim(),
        regras: regras.trim(),
        outros_beneficios: beneficios.trim(),
      })
      toast({ title: 'Perfil atualizado', description: nome.trim() })
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

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar perfil — {profile.codigo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bandeira</Label>
              <Input
                value={bandeira}
                onChange={(e) => setBandeira(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rede de salas</Label>
              <Select value={rede} onValueChange={(v) => setRede(v as CardProfileRede)}>
                <SelectTrigger className="rrmilhas-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REDES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REDE_LABEL[r] ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Acessos por ano</Label>
              <Input
                value={acessos}
                onChange={(e) => setAcessos(e.target.value.replace(/\D/g, ''))}
                placeholder="vazio = ilimitado"
                className="rrmilhas-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Convidados</Label>
            <Input
              value={convidados}
              onChange={(e) => setConvidados(e.target.value)}
              className="rrmilhas-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gasto trimestral mínimo</Label>
              <Input
                value={gasto}
                onChange={(e) => setGasto(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Anuidade</Label>
              <Input
                value={anuidade}
                onChange={(e) => setAnuidade(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Regras de acesso</Label>
            <Textarea
              value={regras}
              onChange={(e) => setRegras(e.target.value)}
              rows={3}
              className="rrmilhas-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Outros benefícios</Label>
            <Textarea
              value={beneficios}
              onChange={(e) => setBeneficios(e.target.value)}
              rows={4}
              className="rrmilhas-input"
            />
          </div>
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
