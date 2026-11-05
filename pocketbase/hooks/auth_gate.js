// Auth gate hook: only the owner account may authenticate.
onRecordAuthRequest((e) => {
  const OWNER_EMAIL = 'seej.rogerio.romero@gmail.com'

  // e.record is a PocketBase Record: its fields are exposed through methods
  // (email(), stringField()), not plain properties. Read it defensively so a
  // shape change never crashes the whole auth endpoint again.
  let email = ''
  try {
    let raw = ''
    if (e.record) {
      if (typeof e.record.email === 'function') raw = e.record.email()
      else if (typeof e.record.stringField === 'function') raw = e.record.stringField('email')
      else raw = e.record.get('email')
    }
    email = raw == null ? '' : String(raw).toLowerCase().trim()
  } catch (err) {
    console.error('auth_gate: não foi possível ler o e-mail do registro', err)
  }

  if (email !== OWNER_EMAIL) {
    throw new ForbiddenError('Acesso restrito ao proprietário do aplicativo.')
  }
  e.next()
}, 'users')
