import { db, ensureSchema } from './db'
import { decryptSecret } from './crypto'
import { ctxFor, type GhCtx } from './github-store'

// Resolve the storage context for a box: the owner's paired GitHub repo if they
// have one, otherwise null (app-level storage from env vars applies).
export async function storageCtxForBox(slug: string): Promise<GhCtx | null> {
  try {
    await ensureSchema()
    const box = await db.memBox.findUnique({ where: { slug } })
    if (!box) return null
    const user = await db.user.findUnique({ where: { username: box.userId } })
    if (!user?.githubRepo || !user.githubTokenEnc) return null
    return ctxFor(user.githubRepo, decryptSecret(user.githubTokenEnc))
  } catch {
    return null
  }
}
