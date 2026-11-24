// Habilita o provider OAuth2 "google" na collection users (auth) do PocketBase.
// Lê GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET dos secrets (definidos no painel
// Skip Cloud). Quando os secrets estão vazios, a migration NÃO falha: apenas
// não habilita o provider (app degrada graciosamente — o frontend mostra a
// orientação de configurar as credenciais). A senha do dono (Skip@Pass) não é
// tocada aqui — restaurada pela migration 0027 por pedido explícito do usuário.
migrate(
  (app) => {
    const clientId = ($os.getenv('GOOGLE_CLIENT_ID') || '').trim()
    const clientSecret = ($os.getenv('GOOGLE_CLIENT_SECRET') || '').trim()

    if (clientId === '' || clientSecret === '') {
      console.log(
        'migration 0033: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET vazios — provider google NÃO habilitado (frontend exibirá orientação).',
      )
      return
    }

    const users = app.findCollectionByNameOrId('users')
    const options = users.oauth2 || {}
    options.enabled = true
    options.provider = 'google'
    options.clientId = clientId
    options.clientSecret = clientSecret
    users.set('oauth2', options)
    app.save(users)
    console.log('migration 0033: provider google habilitado na collection users.')
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const options = users.oauth2 || {}
    options.enabled = false
    options.provider = ''
    options.clientId = ''
    options.clientSecret = ''
    users.set('oauth2', options)
    app.save(users)
  },
)
