import pb from '@/lib/pocketbase/client'
import type { ProgramRecord } from '@/types/database'

/**
 * Recalcula o saldo e o custo médio ponderado de um programa a partir do
 * extrato (program_entries) — usado após exclusões com reversão, para garantir
 * que saldo e custo médio fiquem coerentes com o que está lançado.
 */
export async function recalcProgram(programId: string): Promise<ProgramRecord | null> {
  const [entries, programs] = await Promise.all([
    pb.collection('program_entries').getFullList({ filter: `program="${programId}"` }),
    pb.collection('programs').getOne(programId),
  ])

  let balance = 0
  let spent = 0
  let gained = 0
  let costTotal = 0
  let costWeight = 0
  for (const e of entries as unknown as Array<{
    type: string
    quantity: number
    cost_per_thousand?: number
  }>) {
    const q = e.quantity || 0
    if (e.type === 'entrada') {
      balance += q
      gained += q
      const c = e.cost_per_thousand || 0
      if (c > 0) {
        costTotal += c * (q / 1000)
        costWeight += q / 1000
      }
    } else {
      balance -= q
      spent += q
    }
  }

  const avgCost = costWeight > 0 ? costTotal / costWeight : 0
  const patch: Record<string, unknown> = { balance }
  // Custo médio ponderado só é reajustado se houver compras com custo registrado
  // e se ele não zerar sem motivo (mantém o anterior quando não há compras).
  if (costWeight > 0 && avgCost > 0) patch.cost_per_thousand = Math.round(avgCost * 100) / 100

  const updated = (await pb.collection('programs').update(programId, patch)) as unknown as
    | ProgramRecord
    | undefined

  void spent
  void gained
  return (updated as ProgramRecord) || null
}
