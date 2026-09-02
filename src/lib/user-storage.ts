import { db, ensureSchema } from './db'
import { decryptSecret } from './crypto'
import { githubStorageEnabled, ghGetFile, ctxFor, type GhCtx } from './github-store'

// Pairing credentials are stored as a file in the central storage repo so every
// instance sees the same fresh state (SQLite checkpoints can be stale).
// Short per-instance cache keeps the common path at one API call per 30s.
const PAIRING_PATH = (u: string) => `pairing/${u}.json`
const CACHE_MS = 30_000
const cache = new Map<string, { at: number; ctx: GhCtx | null }>()

async function readPairingFile(username: string): Promise<GhCtx | null> {
  if (!githubStorageEnabled) return null
  const hit = cache.get(username)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ctx
  let ctx: GhCtx | null = null
  try {
    const raw = await ghGetFile(PAIRING_PATH(username))
    if (raw) {
      const { repo, enc } = JSON.parse(raw.toString('utf-8')) as { repo?: string; enc?: string }
      if (repo && enc) ctx = ctxFor(repo, decryptSecret(enc))
    }
  } catch { /* no pairing file */ }
  cache.set(username, { at: Date.now(), ctx })
  return ctx
}

export function invalidatePairingCache(username?: string): void {
  if (username) cache.delete(username)
  else cache.clear()
}

// Resolve the storage context for a box: the owner's paired GitHub repo if they
// have one, otherwise null (app-level storage from env vars applies).
export async function storageCtxForBox(slug: string): Promise<GhCtx | null> {
  try {
    await ensureSchema()
    const box = await db.memBox.findUnique({ where: { slug } })
    if (!box) return null

    const fromFile = await readPairingFile(box.userId)
    if (fromFile) {
      // Human-friendly brain folder: <box-name>-<short-slug> under membox/
      const nameSlug = (box.name || 'box').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'box'
      fromFile.prefix = `membox/${nameSlug}-${box.slug.slice(0, 6)}`
      return fromFile
    }

    // Fallback: DB row (paired before the pairing file existed)
    const user = await db.user.findUnique({ where: { username: box.userId } })
    if (!user?.githubRepo || !user.githubTokenEnc) return null
    const ctx = ctxFor(user.githubRepo, decryptSecret(user.githubTokenEnc))
    if (ctx) {
      const nameSlug = (box.name || 'box').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'box'
      ctx.prefix = `membox/${nameSlug}-${box.slug.slice(0, 6)}`
    }
    return ctx
  } catch {
    return null
  }
}
