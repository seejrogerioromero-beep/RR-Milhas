// Auth gate hook: only the owner account may authenticate.
onRecordAuthRequest((e) => {
  const email = (e.record?.email || '').toLowerCase().trim()
  if (email !== 'seej.rogerio.romero@gmail.com') {
    throw new ForbiddenError('Acesso restrito ao proprietário do aplicativo.')
  }
  e.next()
}, 'users')
