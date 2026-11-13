// Migration 0026: neutraliza em runtime a senha fixa "Skip@Pass" criada pelas
// migrations 0002/0003 (imutáveis). Localiza o usuário dono pelo OWNER_EMAIL e
// troca o hash da senha por uma senha aleatória forte gerada aqui — o acesso
// passa a ser exclusivamente via fluxo de redefinição de senha por e-mail.
// Idempotente: no-op se o usuário não existir (banco vazio / outra cópia) ou
// se já tiver sido aplicada.
migrate(
  (app) => {
    const ownerEmail = ($os.getenv('OWNER_EMAIL') || 'seej.rogerio.romero@gmail.com')
      .trim()
      .toLowerCase()

    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', ownerEmail)
    } catch (_) {
      console.log('0026_randomize_owner_password: usuário owner não encontrado — no-op')
      return
    }

    // Senha aleatória forte (24 chars alfanuméricos), não registrada em log.
    const randomPassword = $security.randomString(24)
    user.setPassword(randomPassword)
    user.setVerified(true)
    app.save(user)
    console.log('0026_randomize_owner_password: senha do owner substituída por senha aleatória')
  },
  (app) => {
    // down: nada a reverter — a senha anterior é um hash desconhecido.
  },
)
