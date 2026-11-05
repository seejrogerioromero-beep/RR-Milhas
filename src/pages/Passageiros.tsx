import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Pencil, Trash2, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { PageContainer as Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { ConfirmDelete } from '@/components/forms'
import { formatDateBR } from '@/lib/miles'
import { cn } from '@/lib/utils'

interface PassengerRecord {
  id: string
  name: string
  document?: string
  birth_date?: string
  cpf?: string
  tem_passaporte?: boolean
  numero_passaporte?: string
  pais_emissor?: string
  emissao?: string
  validade?: string
  notes?: string
}

/** Máscara CPF: 000.000.000-00 */
const maskCPF = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" */
const brToIso = (v: string): string => {
  const [d, m, y] = v.split('/')
  if (!d || !m || !y || y.length !== 4) return ''
  return `${y}-${m}-${d}`
}

const isValidBRDate = (v: string): boolean => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false
  const [d, m, y] = v.split('/').map(Number)
  const date = new Date(y, m - 1, d, 12, 0, 0)
  return (
    !isNaN(date.getTime()) &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  )
}

/** "aaaa-mm-dd..." → "dd/mm/aaaa" */
const isoToBR = (v?: string): string => {
  if (!v) return ''
  const iso = v.slice(0, 10)
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

const toPbDate = (br: string): string | null => (br ? `${brToIso(br)} 12:00:00.000Z` : null)

/** Diálogo modal do formulário "Novo passageiro" (fiel à referência anexada). */
function PassengerDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: PassengerRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [temPassaporte, setTemPassaporte] = useState(false)
  const [numeroPassaporte, setNumeroPassaporte] = useState('')
  const [paisEmissor, setPaisEmissor] = useState('Brasil')
  const [emissao, setEmissao] = useState('')
  const [validade, setValidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (editing) {
      const [first, ...rest] = (editing.name || '').split(' ')
      setNome(first || '')
      setSobrenome(rest.join(' '))
      setCpf(editing.cpf || '')
      setNascimento(isoToBR(editing.birth_date))
      setTemPassaporte(Boolean(editing.tem_passaporte))
      setNumeroPassaporte(editing.numero_passaporte || '')
      setPaisEmissor(editing.pais_emissor || 'Brasil')
      setEmissao(isoToBR(editing.emissao))
      setValidade(isoToBR(editing.validade))
      setObservacao(editing.notes || '')
    } else {
      setNome('')
      setSobrenome('')
      setCpf('')
      setNascimento('')
      setTemPassaporte(false)
      setNumeroPassaporte('')
      setPaisEmissor('Brasil')
      setEmissao('')
      setValidade('')
      setObservacao('')
    }
  }, [open, editing])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'Informe o nome'
    if (!sobrenome.trim()) errs.sobrenome = 'Informe o sobrenome'
    if (cpf && cpf.replace(/\D/g, '').length !== 11) errs.cpf = 'CPF incompleto'
    if (nascimento && !isValidBRDate(nascimento)) errs.nascimento = 'Data inválida'
    if (temPassaporte && !numeroPassaporte.trim()) errs.numeroPassaporte = 'Informe o número'
    if (emissao && !isValidBRDate(emissao)) errs.emissao = 'Data inválida'
    if (validade && !isValidBRDate(validade)) errs.validade = 'Data inválida'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const fullName = `${nome.trim()} ${sobrenome.trim()}`.trim()
      const data = {
        name: fullName,
        document: cpf.trim() || null,
        birth_date: toPbDate(nascimento),
        cpf: cpf.trim() || null,
        tem_passaporte: temPassaporte,
        numero_passaporte: temPassaporte ? numeroPassaporte.trim() : null,
        pais_emissor: temPassaporte ? paisEmissor.trim() || 'Brasil' : null,
        emissao: temPassaporte ? toPbDate(emissao) : null,
        validade: temPassaporte ? toPbDate(validade) : null,
        notes: observacao.trim() || null,
      }
      if (editing) {
        await pb.collection('passengers').update(editing.id, data)
        toast({ title: 'Passageiro atualizado' })
      } else {
        await pb.collection('passengers').create(data)
        toast({ title: 'Passageiro cadastrado' })
      }
      onSaved()
      onClose()
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#23201A]/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-in">
        <div className="flex items-start justify-between px-6 pt-6">
          <h2 className="font-serif text-2xl font-bold text-[#23201A]">
            {editing ? 'Editar passageiro' : 'Novo passageiro'}
          </h2>
          <button
            onClick={onClose}
            className="grid place-items-center w-8 h-8 rounded-lg hover:bg-[#FAF7F0] shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-[#6E6A5E]" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4 px-6 pb-6 pt-4">
          <div className="rounded-xl bg-[#FAF7F0] border border-[#E8E2D6] px-4 py-3 text-xs leading-relaxed text-[#6E6A5E]">
            Escreva nome e sobrenome exatamente como estão no passaporte (ou no documento usado na
            viagem), sem abreviar. É assim que as companhias pedem na emissão.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pass-nome" className="text-xs font-semibold text-[#23201A]">
                Nome
              </Label>
              <Input
                id="pass-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={60}
                placeholder="Ex.: Maria Clara"
                className={cn('rrmilhas-input', errors.nome && 'border-[#C4452F]')}
              />
              {errors.nome && <p className="text-xs text-[#C4452F]">{errors.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass-sobrenome" className="text-xs font-semibold text-[#23201A]">
                Sobrenome
              </Label>
              <Input
                id="pass-sobrenome"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                maxLength={60}
                placeholder="Ex.: Souza Lima"
                className={cn('rrmilhas-input', errors.sobrenome && 'border-[#C4452F]')}
              />
              <p className="text-xs text-[#6E6A5E]">Inclui o segundo nome, se houver.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pass-cpf" className="text-xs font-semibold text-[#23201A]">
                CPF
              </Label>
              <Input
                id="pass-cpf"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                maxLength={14}
                placeholder="000.000.000-00"
                className={cn('rrmilhas-input', errors.cpf && 'border-[#C4452F]')}
              />
              {errors.cpf && <p className="text-xs text-[#C4452F]">{errors.cpf}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass-nascimento" className="text-xs font-semibold text-[#23201A]">
                Nascimento
              </Label>
              <Input
                id="pass-nascimento"
                inputMode="numeric"
                value={nascimento}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                  const br =
                    d.length > 4
                      ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
                      : d.length > 2
                        ? `${d.slice(0, 2)}/${d.slice(2)}`
                        : d
                  setNascimento(br)
                }}
                placeholder="dd/mm/aaaa"
                className={cn('rrmilhas-input', errors.nascimento && 'border-[#C4452F]')}
              />
              {errors.nascimento && <p className="text-xs text-[#C4452F]">{errors.nascimento}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#E8E2D6] px-4 py-3">
            <Label htmlFor="pass-passaporte" className="text-sm font-medium text-[#23201A]">
              Tem passaporte
            </Label>
            <Switch
              id="pass-passaporte"
              checked={temPassaporte}
              onCheckedChange={setTemPassaporte}
              className="data-[state=checked]:bg-[#B08D2C]"
            />
          </div>

          {temPassaporte && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pass-num-passaporte"
                    className="text-xs font-semibold text-[#23201A]"
                  >
                    Número do passaporte
                  </Label>
                  <Input
                    id="pass-num-passaporte"
                    value={numeroPassaporte}
                    onChange={(e) => setNumeroPassaporte(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="Ex.: BR123456"
                    className={cn('rrmilhas-input', errors.numeroPassaporte && 'border-[#C4452F]')}
                  />
                  {errors.numeroPassaporte && (
                    <p className="text-xs text-[#C4452F]">{errors.numeroPassaporte}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass-pais" className="text-xs font-semibold text-[#23201A]">
                    País emissor
                  </Label>
                  <Input
                    id="pass-pais"
                    value={paisEmissor}
                    onChange={(e) => setPaisEmissor(e.target.value)}
                    maxLength={80}
                    placeholder="Brasil"
                    className="rrmilhas-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pass-emissao" className="text-xs font-semibold text-[#23201A]">
                    Emissão
                  </Label>
                  <Input
                    id="pass-emissao"
                    inputMode="numeric"
                    value={emissao}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                      const br =
                        d.length > 4
                          ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
                          : d.length > 2
                            ? `${d.slice(0, 2)}/${d.slice(2)}`
                            : d
                      setEmissao(br)
                    }}
                    placeholder="dd/mm/aaaa"
                    className={cn('rrmilhas-input', errors.emissao && 'border-[#C4452F]')}
                  />
                  {errors.emissao && <p className="text-xs text-[#C4452F]">{errors.emissao}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass-validade" className="text-xs font-semibold text-[#23201A]">
                    Validade
                  </Label>
                  <Input
                    id="pass-validade"
                    inputMode="numeric"
                    value={validade}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                      const br =
                        d.length > 4
                          ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
                          : d.length > 2
                            ? `${d.slice(0, 2)}/${d.slice(2)}`
                            : d
                      setValidade(br)
                    }}
                    placeholder="dd/mm/aaaa"
                    className={cn('rrmilhas-input', errors.validade && 'border-[#C4452F]')}
                  />
                  {errors.validade && <p className="text-xs text-[#C4452F]">{errors.validade}</p>}
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pass-obs" className="text-xs font-semibold text-[#23201A]">
              Observação (opcional)
            </Label>
            <Input
              id="pass-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={300}
              placeholder="Ex.: prefere assento no corredor"
              className="rrmilhas-input"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-[#B08D2C] hover:bg-[#96761F] text-white font-medium active:scale-[0.98]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar passageiro'}
          </Button>
        </form>
      </div>
    </div>
  )
}

/** Ferramenta: cadastro completo de passageiros (nome, sobrenome, CPF, nascimento, passaporte). */
export default function Passageiros() {
  const { toast } = useToast()
  const [items, setItems] = useState<PassengerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PassengerRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (p: PassengerRecord) => {
    setEditing(p)
    setDialogOpen(true)
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

  const passportLine = (p: PassengerRecord) =>
    p.tem_passaporte
      ? `Passaporte ${p.numero_passaporte || '—'} · ${p.pais_emissor || '—'}`
      : 'Sem passaporte'

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
              Cadastre nome, sobrenome, CPF e passaporte para ter os dados sempre à mão na emissão.
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
                <p className="text-xs text-[#6E6A5E] mt-2">CPF: {p.cpf || p.document || '—'}</p>
                <p className="text-xs text-[#6E6A5E] mt-1">
                  Nascimento: {formatDateBR(p.birth_date)}
                </p>
                <p className="text-xs text-[#6E6A5E] mt-1">{passportLine(p)}</p>
                {p.tem_passaporte && p.validade && (
                  <p className="text-xs text-[#6E6A5E] mt-1">
                    Validade do passaporte: {formatDateBR(p.validade)}
                  </p>
                )}
                {p.notes && <p className="text-xs text-[#6E6A5E] mt-1 italic">{p.notes}</p>}
              </Card>
            ))}
          </div>
        )}

        <PassengerDialog
          open={dialogOpen}
          editing={editing}
          onClose={() => {
            setDialogOpen(false)
            setEditing(null)
          }}
          onSaved={reload}
        />

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
