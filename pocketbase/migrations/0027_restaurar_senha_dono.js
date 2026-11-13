// Migration 0027 — restaura a senha do usuário dono para "Skip@Pass".
//
// A migration 0026 randomizou a senha do dono (decisão de segurança anterior),
// mas o usuário pediu explicitamente voltar à senha fixa "Skip@Pass": é um app
// pessoal de usuário único e ele perdeu o acesso após o link de reset quebrado.
//
// Idempotente/segura em banco vazio: se o usuário não existir, nada é feito.

migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'seej.rogerio.romero@gmail.com')
      record.setPassword('Skip@Pass')
      app.save(record)
      console.log('0027_restaurar_senha_dono: senha do dono restaurada para Skip@Pass')
    } catch (err) {
      // Banco vazio (ou usuário ausente): nada a restaurar — migration permanece válida.
      console.log('0027_restaurar_senha_dono: usuário dono não encontrado, nada a fazer', err)
    }
  },
  (app) => {
    // Down: não há como voltar à senha aleatória da 0026 (era desconhecida).
    // Deixa a senha atual como está — operação sem efeito reverso real.
  },
)
