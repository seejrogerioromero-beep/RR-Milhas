import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Armchair,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Building2,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { CardsTab } from '@/components/CardsTab'

interface VipLoungeRecord {
  id: string
  airport: string
  access?: string
  notes?: string
}

type Tab = 'cartoes' | 'como-funciona'

/** Ferramenta: ranking de cartões (aba CARTÕES) + cadastro de salas VIP (aba COMO FUNCIONA). */
export default function SalasVip() {
  const [tab, setTab] = useState<Tab>('cartoes')

  return (
    <Layout>
      <div className="fade-rise space-y-6 max-w-5xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0E8FB8]">Ferramentas</p>
          <h1 className="font-serif text-3xl font-bold text-[#23201A] mt-1">Salas VIP</h1>
          <p className="text-sm text-[#6E6A5E] mt-2">
            Quais cartões dão acesso às salas VIP e como entrar em cada rede.
          </p>
        </div>

        {/* Abas */}
        <div className="inline-flex rounded-full bg-[#EFEAE0] p-1.5 gap-1">
          <TabButton
            active={tab === 'cartoes'}
            onClick={() => setTab('cartoes')}
            icon={<CreditCard className="w-4 h-4" />}
            label="CARTÕES"
          />
          <TabButton
            active={tab === 'como-funciona'}
            onClick={() => setTab('como-funciona')}
            icon={<Building2 className="w-4 h-4" />}
            label="COMO FUNCIONA"
          />
        </div>

        {tab === 'cartoes' ? <CardsTab /> : <ComoFuncionaTab />}
      </div>
    </Layout>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest transition-colors',
        active ? 'bg-[#C9A24B] text-white shadow-sm' : 'text-[#6E6A5E] hover:text-[#23201A]',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/** Aba COMO FUNCIONA: salas VIP cadastradas pelo usuário (aeroporto + acesso). */
function ComoFuncionaTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<VipLoungeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<VipLoungeRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [airport, setAirport] = useState('')
  const [access, setAccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reload = useCallback(async () => {
    try {
      const res = await pb.collection('vip_lounges').getFullList({ sort: 'airport' })
      setItems(res as unknown as VipLoungeRecord[])
      setLoadError(null)
    } catch (err) {
      console.error('Salas VIP: falha ao carregar', err)
      setLoadError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useRealtime('vip_lounges', () => reload())

  const resetForm = () => {
    setAirport('')
    setAccess('')
    setErrors({})
  }

  const openNew = () => {
    setEditing(null)
    resetForm()
    setSheetOpen(true)
  }

  const openEdit = (l: VipLoungeRecord) => {
    setEditing(l)
    setAirport(l.airport || '')
    setAccess(l.access || '')
    setErrors({})
    setSheetOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!airport.trim()) errs.airport = 'Informe o aeroporto'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const data = { airport: airport.trim(), access: access.trim() || null }
      if (editing) {
        await pb.collection('vip_lounges').update(editing.id, data)
        toast({ title: 'Sala VIP atualizada' })
      } else {
        await pb.collection('vip_lounges').create(data)
        toast({ title: 'Sala VIP cadastrada' })
      }
      setSheetOpen(false)
      resetForm()
      reload()
    } catch (err) {
      toast({
        title: 'Erro ao salvar sala VIP',
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
      await pb.collection('vip_lounges').delete(deleteId)
      toast({ title: 'Sala VIP removida' })
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={openNew}
          className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nova sala VIP
        </Button>
      </div>

      {loadError && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-[#C4452F]/40 bg-[#C4452F]/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#C4452F] mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-[#C4452F]">
            <p className="font-semibold">Não foi possível carregar as salas VIP.</p>
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
            <Armchair className="w-6 h-6 text-[#0E8FB8]" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#23201A]">
            Nenhuma sala VIP cadastrada
          </h2>
          <p className="text-sm text-[#6E6A5E] mt-3 max-w-md mx-auto">
            Cadastre o aeroporto e o programa ou cartão que dá acesso para consultar antes de cada
            viagem.
          </p>
          <Button
            onClick={openNew}
            className="mt-5 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nova sala VIP
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((l) => (
            <Card key={l.id} className="paper-card p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#23201A] min-w-0">
                  <Armchair className="w-4 h-4 text-[#0E8FB8] shrink-0" />
                  <span className="truncate">{l.airport}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(l)}
                    className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[#FAF7F0] text-[#6E6A5E]"
                    aria-label={`Editar sala VIP em ${l.airport}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(l.id)}
                    className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                    aria-label={`Remover sala VIP em ${l.airport}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
              <p className="text-xs text-[#6E6A5E] mt-2">Acesso: {l.access || '—'}</p>
              {l.notes ? <p className="text-xs text-[#6E6A5E] mt-1">{l.notes}</p> : null}
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
        title={editing ? 'Editar sala VIP' : 'Nova sala VIP'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vip-airport" className="text-xs font-semibold text-[#23201A]">
              Aeroporto *
            </Label>
            <Input
              id="vip-airport"
              value={airport}
              onChange={(e) => setAirport(e.target.value)}
              maxLength={120}
              placeholder="Ex: GRU — Guarulhos (Terminal 3)"
              className={cn('rrmilhas-input', errors.airport && 'border-[#C4452F]')}
            />
            {errors.airport && <p className="text-xs text-[#C4452F]">{errors.airport}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vip-access" className="text-xs font-semibold text-[#23201A]">
              Programa / cartão que dá acesso
            </Label>
            <Input
              id="vip-access"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              maxLength={160}
              placeholder="Ex: Smiles Diamante / cartão Platinum"
              className="rrmilhas-input"
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar sala VIP'}
          </Button>
        </form>
      </Sheet>

      {deleteId && (
        <ConfirmDelete
          title="Remover sala VIP"
          description={<>A sala VIP será removida do cadastro. Essa ação não pode ser desfeita.</>}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
