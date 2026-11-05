// Auth gate hook: apenas a conta do proprietário pode autenticar.
// Estratégia robusta: em vez de ler o e-mail do record autenticado (que variou de
// forma entre versões e causou "TypeError: Object has no member 'toLowerCase'"),
// busca o record do owner pelo e-mail no banco e compara apenas o id — sempre
// disponível como string.
onRecordAuthRequest((e) => {
  const OWNER_EMAIL = 'seej.rogerio.romero@gmail.com'

  // Corpo malformado (identity que não é string: undefined, null, objeto, número)
  // recebe 400 de autenticação padrão, sem lançar TypeError no hook.
  let info = null
  try {
    info = e.requestInfo ? e.requestInfo() : null
  } catch (err) {
    info = null
  }
  if (
    info &&
    info.body &&
    info.body.identity !== undefined &&
    typeof info.body.identity !== 'string'
  ) {
    throw new BadRequestError('Failed to authenticate.')
  }

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
