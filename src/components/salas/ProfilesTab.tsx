import { useMemo, useState } from 'react'
import type { CardProfileRecord, CreditCardRecord } from '@/types/database'
import { REDE_LABEL } from '@/lib/salasVip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pencil, Search, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import CardProfileEditDialog from './CardProfileEditDialog'

interface ProfilesTabProps {
  profiles: CardProfileRecord[]
  cards: CreditCardRecord[]
}

/** Aba CARTÕES: os 7 perfis de cartão Santander com regras e benefícios. */
export default function ProfilesTab({ profiles, cards }: ProfilesTabProps) {
  const [busca, setBusca] = useState('')
  const [editing, setEditing] = useState<CardProfileRecord | null>(null)

  // perfil → cartões do usuário vinculados
  const cardByProfile = useMemo(() => {
    const map: Record<string, CreditCardRecord[]> = {}
    for (const c of cards) {
      if (!c.perfil) continue
      ;(map[c.perfil] ??= []).push(c)
    }
    return map
  }, [cards])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q),
    )
  }, [profiles, busca])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6A5E]" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cartão…"
          className="pl-9 rrmilhas-input"
        />
      </div>

      <div className="space-y-2">
        {filtrados.map((p) => {
          const vinculados = cardByProfile[p.id] ?? []
          return (
            <Card key={p.id} className="border-[#16418F]/15">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#23201A] flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#16418F]" />
                      {p.nome}
                      <Badge
                        variant="outline"
                        className="text-[10px] border-[#16418F]/30 text-[#16418F]"
                      >
                        {p.codigo}
                      </Badge>
                    </p>
                    <p className="text-xs text-[#6E6A5E]">
                      {p.bandeira ?? ''} · Rede: {REDE_LABEL[p.rede ?? 'nenhuma'] ?? '—'} ·{' '}
                      {p.acessos_ano === null || p.acessos_ano === undefined
                        ? 'Acessos ilimitados'
                        : `${p.acessos_ano} acessos/ano`}
                      {p.anuidade ? ` · Anuidade: ${p.anuidade}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(p)}
                    className="h-8 gap-1.5 text-xs border-[#16418F]/30 text-[#16418F] hover:bg-[#16418F]/5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                </div>

                {vinculados.length > 0 && (
                  <p className="text-xs text-[#16418F] font-medium">
                    Meus cartões: {vinculados.map((c) => c.name || c.id).join(', ')}
                  </p>
                )}

                {p.regras && (
                  <div className="text-sm text-[#4A4638]">
                    <span className="font-medium text-[#23201A]">Regras: </span>
                    {p.regras}
                  </div>
                )}
                {p.outros_beneficios && (
                  <div className="text-sm text-[#4A4638]">
                    <span className="font-medium text-[#23201A]">Benefícios: </span>
                    {p.outros_beneficios}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {filtrados.length === 0 && (
          <p className="text-sm text-[#6E6A5E] py-6 text-center">Nenhum cartão encontrado.</p>
        )}
      </div>

      <CardProfileEditDialog
        profile={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    </div>
  )
}
