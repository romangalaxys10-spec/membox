import { db } from './db'
import { deleteFileOrDir, getFilePath } from './storage'
import { promises as fs } from 'fs'

// Set TTL for a path
export async function setTtl(boxId: string, filePath: string, ttlSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await db.ttlEntry.upsert({
    where: { boxId_filePath: { boxId, filePath } },
    update: { ttlSeconds, expiresAt },
    create: { boxId, filePath, ttlSeconds, expiresAt },
  })
}

// Remove TTL entry
export async function removeTtl(boxId: string, filePath: string): Promise<void> {
  try { await db.ttlEntry.delete({ where: { boxId_filePath: { boxId, filePath } } }) } catch { /* ok */ }
}

// Remove TTL entries for a path prefix (when deleting a directory)
export async function removeTtlPrefix(boxId: string, prefix: string): Promise<void> {
  const entries = await db.ttlEntry.findMany({ where: { boxId, filePath: { startsWith: prefix } } })
  for (const e of entries) {
    try { await db.ttlEntry.delete({ where: { id: e.id } }) } catch { /* ok */ }
  }
}

// Clean expired TTL entries — call periodically
export async function cleanExpiredTtl(): Promise<number> {
  const now = new Date()
  const expired = await db.ttlEntry.findMany({ where: { expiresAt: { lte: now } } })

  let cleaned = 0
  for (const entry of expired) {
    try {
      const box = await db.memBox.findUnique({ where: { id: entry.boxId } })
      if (box) {
        await deleteFileOrDir(box.slug, entry.filePath)
        await db.ttlEntry.delete({ where: { id: entry.id } })
        cleaned++
      }
    } catch {
      /* skip */
    }
  }
  return cleaned
}

// Get TTL info for a path
export async function getTtl(boxId: string, filePath: string) {
  return db.ttlEntry.findUnique({
    where: { boxId_filePath: { boxId, filePath } },
  })
}
