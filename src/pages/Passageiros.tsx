import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Pencil, Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Sheet } from '@/components/Sheet'
import { ConfirmDelete } from '@/components/forms'
import { formatDateBR } from '@/lib/miles'
import { cn } from '@/lib/utils'

interface PassengerRecord {
  id: string
  name: string
  document?: string
  birth_date?: string
  notes?: string
}

/** Ferramenta: cadastro simples de passageiros (nome, documento, nascimento). */
export default function Passageiros() {
  const { toast } = useToast()
  const [items, setItems] = useState<PassengerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PassengerRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reload = useCallback(async () => {
    try {
      const res = await pb.collection('passengers').getFullList({ sort: 'name' })
      setItems(res as unknown as PassengerRecord[])
      setLoadError(null)
    } catch (err) {
      console.error('Passageiros: falha ao carregar', err)
      setLoadError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime('passengers', () => reload())

  const resetForm = () => {
    setName('')
    setDocument('')
    setBirthDate('')
    setErrors({})
  }

  const openNew = () => {
    setEditing(null)
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (p: PassengerRecord) => {
    setEditing(p)
    setName(p.name || '')
    setDocument(p.document || '')
    setBirthDate(p.birth_date ? p.birth_date.slice(0, 10) : '')
    setErrors({})
    setSheetOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Informe o nome do passageiro'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        document: document.trim() || null,
        birth_date: birthDate ? `${birthDate} 12:00:00.000Z` : null,
      }
      if (editing) {
        await pb.collection('passengers').update(editing.id, data)
        toast({ title: 'Passageiro atualizado' })
      } else {
        await pb.collection('passengers').create(data)
        toast({ title: 'Passageiro cadastrado' })
      }
      setSheetOpen(false)
      resetForm()
      reload()
    } catch (err) {
      toast({
        title: 'Erro ao salvar passageiro',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await pb.collection('passengers').delete(deleteId)
      toast({ title: 'Passageiro removido' })
      setDeleteId(null)
      reload()
    } catch (err) {
      toast({
        title: 'Erro ao remover',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      setDeleteId(null)
    }
  }

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">
              Ferramentas
            </p>
            <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Passageiros</h1>
            <p className="text-sm text-[#6E6A5E] mt-2">
              Dados dos viajantes que você cadastra para usar nas passagens e hospedagens.
            </p>
          </div>
          <Button
            onClick={openNew}
            className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo passageiro
          </Button>
        </div>

        {loadError && !loading && (
          <div className="flex items-start gap-3 rounded-xl border border-[#C4452F]/40 bg-[#C4452F]/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-[#C4452F] mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-[#C4452F]">
              <p className="font-semibold">Não foi possível carregar os passageiros.</p>
              <p className="mt-0.5 break-words">{loadError}</p>
            </div>
            <Button
              onClick={reload}
              size="sm"
              variant="outline"
              className="rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10 shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#6E6A5E]">Carregando...</p>
        ) : items.length === 0 ? (
          <Card className="paper-card py-14 text-center">
            <div className="grid place-items-center w-12 h-12 rounded-2xl bg-[#0E8FB8]/10 mx-auto mb-4">
              <Users className="w-6 h-6 text-[#0E8FB8]" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#23201A]">
              Nenhum passageiro cadastrado
            </h2>
            <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
              Cadastre nome, documento e data de nascimento para ter os dados sempre à mão.
            </p>
            <Button
              onClick={openNew}
              className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Novo passageiro
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {items.map((p) => (
              <Card key={p.id} className="paper-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#23201A] min-w-0">
                    <Users className="w-4 h-4 text-[#0E8FB8] shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(p)}
                      className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[#FAF7F0] text-[#6E6A5E]"
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                      aria-label={`Remover ${p.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <p className="text-xs text-[#6E6A5E] mt-2">Documento: {p.document || '—'}</p>
                <p className="text-xs text-[#6E6A5E] mt-1">
                  Nascimento: {formatDateBR(p.birth_date)}
                </p>
              </Card>
            ))}
          </div>
        )}

        <Sheet
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false)
            setEditing(null)
          }}
          title={editing ? 'Editar passageiro' : 'Novo passageiro'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pass-name" className="text-xs font-semibold text-[#23201A]">
                Nome *
              </Label>
              <Input
                id="pass-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Ex: Rogério Romero"
                className={cn('rrmilhas-input', errors.name && 'border-[#C4452F]')}
              />
              {errors.name && <p className="text-xs text-[#C4452F]">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass-doc" className="text-xs font-semibold text-[#23201A]">
                Documento
              </Label>
              <Input
                id="pass-doc"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                maxLength={40}
                placeholder="Ex: RG, CPF ou passaporte"
                className="rrmilhas-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass-birth" className="text-xs font-semibold text-[#23201A]">
                Data de nascimento
              </Label>
              <Input
                id="pass-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="rrmilhas-input"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
            >
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar passageiro'}
            </Button>
          </form>
        </Sheet>

        {deleteId && (
          <ConfirmDelete
            title="Remover passageiro"
            description={
              <>O passageiro será removido do cadastro. Essa ação não pode ser desfeita.</>
            }
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </div>
    </Layout>
  )
}
