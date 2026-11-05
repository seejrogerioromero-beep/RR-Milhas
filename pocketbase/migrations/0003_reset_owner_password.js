// Migration 0003: garante que o usuário proprietário tem a senha "Skip@Pass".
// Idempotente: se o usuário não existir (banco vazio ou outra cópia), é um no-op.
migrate(
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'seej.rogerio.romero@gmail.com')
    } catch (_) {
      console.log('0003_reset_owner_password: usuário owner não encontrado — no-op')
      return
    }

    user.setPassword('Skip@Pass')
    user.setVerified(true)
    const name = user.getString('name')
    if (!name) {
      user.set('name', 'Rogério Romero')
    }
    app.save(user)
    console.log('0003_reset_owner_password: senha do owner redefinida com sucesso')
  },
  (app) => {
    // down: nada a reverter — a senha anterior é desconhecida (hash).
  },
)
