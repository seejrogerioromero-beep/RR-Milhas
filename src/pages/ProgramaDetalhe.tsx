import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/** Detalhe de um programa: resumo + extrato de movimentações.

  Este componente foi integrado à página /programas (query ?acessar=<id> abre o
  extrato inline, sem diálogo de exclusão). Esta rota agora apenas redireciona.
*/
export default function ProgramaDetalheRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/programas', { replace: true })
  }, [navigate])

  return null
}
