// Hooks de redefinição de senha (restauração do estado da 0.0.30).
//
// 1) onRecordRequestPasswordResetRequest: SEMPRE chama e.next() — sem isso o
//    PocketBase pula a gravação do token de reset no banco e o fluxo quebra.
// 2) onMailerRecordPasswordResetSend: monta o link customizado a partir de
//    e.meta.token, apontando para a rota do frontend /redefinir-senha?token=...
//    (texto e link em pt-BR).
//
// ⚠ Scoping do JSVM: funções/constantes top-level NÃO podem ser referenciadas
// dentro dos callbacks — tudo é declarado dentro de cada callback.

// Disparo do pedido de reset: apenas repassa para o handler padrão do
// PocketBase (que grava o token no banco e dispara o envio do e-mail).
onRecordRequestPasswordResetRequest((e) => {
  e.next()
}, 'users')

// Envio do e-mail de reset: substitui o template padrão por um e-mail em pt-BR
// com o link customizado do frontend.
onMailerRecordPasswordResetSend((e) => {
  let token = ''
  try {
    if (e.meta && e.meta.token) token = String(e.meta.token)
  } catch (err) {
    console.error('reset_email: não foi possível ler o token do meta', err)
  }

  if (token === '') {
    // Sem token não há link possível: segue com o e-mail padrão.
    console.error('reset_email: token ausente — mantendo e-mail padrão')
    e.next()
    return
  }

  const SITE_URL = $os.getenv('SITE_URL') || ''
  const baseUrl = SITE_URL.replace(/\/+$/, '')
  const resetLink = baseUrl + '/redefinir-senha?token=' + encodeURIComponent(token)

  const subject = 'Redefinição de senha — RRMILHAS'
  const html =
    '<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #23201A;">' +
    '<h2 style="color: #16418F; margin-top: 0;">Redefinição de senha</h2>' +
    '<p>Olá,</p>' +
    '<p>Recebemos uma solicitação para redefinir a senha do seu aplicativo RRMILHAS.</p>' +
    '<p style="margin: 28px 0;">' +
    '<a href="' +
    resetLink +
    '" ' +
    'style="display: inline-block; background-color: #16418F; color: #ffffff; ' +
    'padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">' +
    'Redefinir minha senha</a></p>' +
    '<p style="font-size: 13px; color: #6E6A5E;">' +
    'Se o botão não funcionar, copie e cole o link abaixo no navegador:<br>' +
    '<a href="' +
    resetLink +
    '" style="color: #16418F; word-break: break-all;">' +
    resetLink +
    '</a></p>' +
    '<p style="font-size: 13px; color: #6E6A5E;">' +
    'Se você não solicitou esta redefinição, ignore este e-mail — sua senha permanece a mesma.</p>' +
    '</div>'

  e.message.subject = subject
  e.message.html = html

  e.next()
}, 'users')
