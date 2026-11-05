import { useState } from 'react'
import { Plus, CreditCard, Star, Trash2, Users, Building2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { ProgramRecord, CreditCardRecord } from '@/types/database'
import { formatMiles } from '@/lib/miles'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { ProgramFormSheet } from '@/components/forms'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDelete } from '@/components/forms'
import { cn } from '@/lib/utils'

const BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Diners', 'Outra']

/**
 * Aba Clubes: programas marcados como clube/banco — origem de transferência
 * de pontos (Livelo, Esfera, iupp, cartões etc.).
 */
export function ClubesTab({
  programs,
  onChanged,
}: {
  programs: ProgramRecord[]
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const clubes = programs.filter((p) => p.is_club)
  const outros = programs.filter((p) => !p.is_club)

  const toggleClub = async (program: ProgramRecord, toClub: boolean) => {
    setBusyId(program.id)
    try {
      await pb.collection('programs').update(program.id, { is_club: toClub })
      toast({
        title: toClub
          ? `${program.name} marcado como clube`
          : `${program.name} removido dos clubes`,
      })
      onChanged()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar programa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#23201A]">Clubes e bancos</h2>
          <p className="text-sm text-[#6E6A5E] mt-1">
            Programas que podem ser origem de transferência de pontos: Livelo, Esfera, iupp, cartões
            etc.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Novo clube
        </Button>
      </div>

      <div className="space-y-6">
        <section>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0E8FB8] mb-2">
            <Users className="w-3.5 h-3.5" /> Marcados como clube ({clubes.length})
          </p>
          {clubes.length === 0 ? (
            <p className="text-sm text-[#6E6A5E] py-4 text-center paper-card">
              Nenhum clube marcado ainda. Marque um programa abaixo como origem de transferência.
            </p>
          ) : (
            <div className="paper-card px-5 py-1">
              {clubes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-3.5 border-b border-[#E8E2D6]/70 last:border-0"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0 bg-[#0E8FB8]/10 text-[#0E8FB8]">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#23201A] truncate">{p.name}</p>
                    <p className="text-xs text-[#6E6A5E]">
                      Saldo: {formatMiles(p.balance || 0)} milhas
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => toggleClub(p, false)}
                    className="h-8 rounded-lg border-[#C4452F]/40 text-[#C4452F] hover:bg-[#C4452F]/10 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-[#6E6A5E] mb-2">
            Outros programas ({outros.length})
          </p>
          {outros.length === 0 ? (
            <p className="text-sm text-[#6E6A5E] py-4 text-center paper-card">
              Todos os programas já são clubes.
            </p>
          ) : (
            <div className="paper-card px-5 py-1">
              {outros.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-3.5 border-b border-[#E8E2D6]/70 last:border-0"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0 bg-[#16418F]/10 text-[#16418F]">
                    <Star className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#23201A] truncate">{p.name}</p>
                    <p className="text-xs text-[#6E6A5E]">
                      Saldo: {formatMiles(p.balance || 0)} milhas
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => toggleClub(p, true)}
                    className="h-8 rounded-lg border-[#0E8FB8]/40 text-[#0E8FB8] hover:bg-[#0E8FB8]/10 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tornar clube
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ProgramFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          onChanged()
          toast({ title: 'Clube cadastrado' })
        }}
      />

      {removingId && (
        <ConfirmDelete
          title="Remover dos clubes"
          description={
            <>
              Este programa deixa de aparecer como origem de transferência. Os dados são mantidos.
            </>
          }
          onConfirm={async () => {
            const p = programs.find((x) => x.id === removingId)
            setRemovingId(null)
            if (p) await toggleClub(p, false)
          }}
          onCancel={() => setRemovingId(null)}
        />
      )}
    </div>
  )
}

/**
 * Aba Cartões: CRUD simples de cartões de crédito com programa de pontos associado.
 */
export function CartoesTab({
  programs,
  onChanged,
}: {
  programs: ProgramRecord[]
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [cards, setCards] = useState<CreditCardRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCardRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [programId, setProgramId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reloadCards = async () => {
    try {
      const res = await pb.collection('credit_cards').getFullList({
        sort: '-created',
        expand: 'program',
      })
      setCards(res as unknown as CreditCardRecord[])
    } catch (err) {
      console.error('Falha ao carregar cartões', err)
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => {
    setEditing(null)
    setName('')
    setBrand('')
    setProgramId('')
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (card: CreditCardRecord) => {
    setEditing(card)
    setName(card.name)
    setBrand(card.brand || '')
    setProgramId(card.program || '')
    setErrors({})
    setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Informe o nome do cartão'
    if (!programId) errs.program = 'Vincule o programa de pontos'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const data = { name: name.trim(), brand: brand || undefined, program: programId }
      if (editing) {
        await pb.collection('credit_cards').update(editing.id, data)
        toast({ title: 'Cartão atualizado' })
      } else {
        await pb.collection('credit_cards').create(data)
        toast({ title: 'Cartão cadastrado' })
      }
      setFormOpen(false)
      onChanged()
      reloadCards()
    } catch (err) {
      toast({
        title: 'Erro ao salvar cartão',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const id = deleteId
    setDeleteId(null)
    try {
      await pb.collection('credit_cards').delete(id)
      toast({ title: 'Cartão excluído' })
      onChanged()
      reloadCards()
    } catch (err) {
      toast({
        title: 'Erro ao excluir cartão',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#23201A]">Cartões de crédito</h2>
          <p className="text-sm text-[#6E6A5E] mt-1">
            Cada cartão vinculado ao programa de pontos em que ele acumula.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Novo cartão
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-[#6E6A5E]">Carregando...</p>
      ) : cards.length === 0 ? (
        <div className="paper-card py-14 text-center">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-[#0E8FB8]/10 mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-[#0E8FB8]" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#23201A]">Nenhum cartão cadastrado</h3>
          <p className="text-sm text-[#6E6A5E] mt-2 max-w-md mx-auto">
            Cadastre seus cartões e vincule cada um ao programa de pontos em que ele acumula.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <div key={card.id} className="paper-card p-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-serif text-lg font-semibold text-[#23201A] truncate">
                  <CreditCard className="w-4 h-4 text-[#0E8FB8] shrink-0" /> {card.name}
                </p>
                <p className="text-xs text-[#6E6A5E] mt-1">
                  {card.brand ? `${card.brand} · ` : ''}
                  {card.expand?.program?.name || 'Sem programa'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(card)}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#16418F] hover:bg-[#16418F]/10"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteId(card.id)}
                  className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                  aria-label="Excluir cartão"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar cartão' : 'Novo cartão'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="card-name" className="text-xs font-semibold text-[#23201A]">
              Nome do cartão *
            </Label>
            <Input
              id="card-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Ex: Itaú Click Visa"
              className={cn('rrmilhas-input', errors.name && 'border-[#C4452F]')}
            />
            {errors.name && <p className="text-xs text-[#C4452F]">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-brand" className="text-xs font-semibold text-[#23201A]">
              Bandeira (opcional)
            </Label>
            <select
              id="card-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white"
            >
              <option value="">Sem bandeira</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-program" className="text-xs font-semibold text-[#23201A]">
              Programa de pontos *
            </Label>
            <select
              id="card-program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className={cn(
                'rrmilhas-input w-full h-11 px-3 text-sm text-[#23201A] bg-white',
                errors.program && 'border-[#C4452F]',
              )}
            >
              <option value="">Selecione o programa</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.program && <p className="text-xs text-[#C4452F]">{errors.program}</p>}
          </div>

          <Button
            type="submit"
            disabled={saving || programs.length === 0}
            className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar cartão'}
          </Button>
        </form>
      </Sheet>

      {deleteId && (
        <ConfirmDelete
          title="Excluir cartão"
          description={<>O cartão será removido da lista. Essa ação não pode ser desfeita.</>}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
