// Auth gate hook: apenas a conta do proprietário pode autenticar.
// Estratégia robusta: em vez de ler o e-mail do record autenticado (que variou de
// forma entre versões e causou "TypeError: Object has no member 'toLowerCase'"),
// busca o record do owner pelo e-mail no banco e compara apenas o id — sempre
// disponível como string.
onRecordAuthRequest((e) => {
  const OWNER_EMAIL = 'seej.rogerio.romero@gmail.com'

  let ownerId = ''
  try {
    const owner = $app.findAuthRecordByEmail('users', OWNER_EMAIL)
    if (owner) ownerId = owner.id
  } catch (err) {
    console.error('auth_gate: owner não encontrado no banco', err)
  }

  let authId = ''
  try {
    authId = e.record ? String(e.record.id) : ''
  } catch (err) {
    console.error('auth_gate: não foi possível ler o id do registro', err)
  }

  if (ownerId === '' || authId === '' || authId !== ownerId) {
    throw new ForbiddenError('Acesso restrito ao proprietário do aplicativo.')
  }
  e.next()
}, 'users')
