import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/database'

/** Builds a file URL for a PocketBase record field (record must contain `collectionId` & `id`). */
export function getPbFileUrl(
  record: { id: string; collectionId?: string; collectionName?: string } | null | undefined,
  filename?: string,
): string {
  if (!record || !filename) return ''
  const collectionId = record.collectionId || '_pb_users_auth_'
  return `${pb.baseUrl}/api/files/${collectionId}/${record.id}/${filename}`
}

export function getFileName(user: UserRecord | null | undefined): string | undefined {
  if (!user?.avatar) return undefined
  return typeof user.avatar === 'string' ? user.avatar : undefined
}

export function getUserAvatarUrl(user: UserRecord | null | undefined): string {
  const name = getFileName(user)
  if (!name) return ''
  return getPbFileUrl(user, name)
}
