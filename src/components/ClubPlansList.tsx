import { useEffect, useState } from 'react'
import { Pencil, Trash2, Layers } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatBRL, formatMiles } from '@/lib/miles'
import { ConfirmDelete } from '@/components/forms'
import { cn } from '@/lib/utils'
import type { ClubPlanRecord } from '@/types/database'

/** Lista dos planos de clube cadastrados, com editar/excluir. */
export function ClubPlansList({
  reloadKey,
  onEdit,
  onChanged,
}: {
  reloadKey: number
  onEdit: (plan: ClubPlanRecord) => void
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [plans, setPlans] = useState<ClubPlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await pb.collection('club_plans').getFullList({
        sort: '-created',
        expand: 'program',
      })
      setPlans(res as unknown as ClubPlanRecord[])
    } catch (err) {
      console.error('Falha ao carregar clubes', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [reloadKey])

  const handleDelete = async () => {
    if (!deleteId) return
    const id = deleteId
    setDeleteId(null)
    try {
      await pb.collection('club_plans').delete(id)
      toast({ title: 'Clube excluído' })
      onChanged()
      load()
    } catch (err) {
      toast({
        title: 'Erro ao excluir clube',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  return (
    <section>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#16418F] mb-2">
        <Layers className="w-3.5 h-3.5" /> Planos cadastrados ({plans.length})
      </p>
      {loading ? (
        <p className="text-sm text-[#6E6A5E]">Carregando...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-[#6E6A5E] py-4 text-center paper-card">
          Nenhum plano de clube cadastrado.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="paper-card p-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif text-lg font-semibold text-[#23201A] truncate">
                  {plan.plan_name}
                </p>
                <p className="text-xs text-[#6E6A5E] mt-1">
                  {plan.expand?.program?.name || 'Sem programa'}
                </p>
                <p className="text-xs text-[#6E6A5E] mt-0.5">
                  {plan.points_per_month
                    ? `${formatMiles(plan.points_per_month)} pts/mês`
                    : '— pts/mês'}
                  {' · '}
                  {formatBRL(plan.monthly_value || 0)}
                  {plan.billing === 'anual' ? ' /ano' : ' /mês'}
                  {plan.billing_day ? ` · cobra dia ${plan.billing_day}` : ''}
                </p>
                <p
                  className={cn(
                    'mt-1.5 inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full',
                    plan.active !== false
                      ? 'bg-[#0E8FB8]/10 text-[#0E8FB8]'
                      : 'bg-[#6E6A5E]/10 text-[#6E6A5E]',
                  )}
                >
                  {plan.active !== false ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onEdit(plan)}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#16418F] hover:bg-[#16418F]/10 inline-flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => setDeleteId(plan.id)}
                  className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#C4452F]/10 text-[#C4452F]"
                  aria-label="Excluir clube"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmDelete
          title="Excluir clube"
          description={
            <>O plano será removido da lista. Os lançamentos já feitos no extrato são mantidos.</>
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </section>
  )
}
