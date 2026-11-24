// Hook de limpeza OAuth: o PocketBase cria automaticamente um registro em
// `users` quando alguém se autentica pela primeira vez via Google. Como este é
// um aplicativo pessoal de usuário único, se o e-mail da conta Google autenticada
// NÃO for o do proprietário (OWNER_EMAIL), o registro recém-criado é removido
// imediatamente — não sobra nem o cadastro. O hook de bloqueio de sessão
// (auth_gate.js, onRecordAuthRequest) já barra o token antes disso, em qualquer
// fluxo (senha ou OAuth); este hook cobre o caso de sobrar lixo de registro.
// Nota: onRecordAfterCreateRequest foi removido no PocketBase v0.23 — usa-se
// onRecordAfterCreateSuccess (pós-commit), com e.collection / e.record.
onRecordAfterCreateSuccess((e) => {
  const OWNER_EMAIL = ($os.getenv('OWNER_EMAIL') || 'seej.rogerio.romero@gmail.com')
    .trim()
    .toLowerCase()

  const colName = e.collection && e.collection.name ? String(e.collection.name) : ''
  if (colName !== 'users') {
    e.next()
    return
  }

  let email = ''
  try {
    email = e.record
      ? String(e.record.email() || '')
          .trim()
          .toLowerCase()
      : ''
  } catch (err) {
    console.error('oauth_cleanup: não foi possível ler o e-mail do registro', err)
  }

  if (email !== '' && email !== OWNER_EMAIL) {
    try {
      $app.delete(e.record)
      console.log(
        'oauth_cleanup: registro users criado via OAuth para e-mail não autorizado e removido.',
      )
    } catch (err) {
      console.error('oauth_cleanup: falha ao remover registro não autorizado', err)
    }
  }

  e.next()
}, 'users')
