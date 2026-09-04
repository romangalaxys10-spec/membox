import { githubStorageEnabled, ghGetFile, ghPutFile } from './github-store'

// Share tokens are mirrored to a file in the central storage repo so
// authentication works on every serverless instance even when its local
// SQLite checkpoint is stale (same reasoning as pairing files).
interface StoredShare {
  token: string
  permission: string
  expiresAt: string | null
}

const sharePath = (boxId: string) => `shares/${boxId}.json`
const CACHE_MS = 15_000
const cache = new Map<string, { at: number; shares: StoredShare[] }>()

export async function readShares(boxId: string): Promise<StoredShare[]> {
  if (!githubStorageEnabled) return []
  const hit = cache.get(boxId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.shares
  let shares: StoredShare[] = []
  try {
    const raw = await ghGetFile(sharePath(boxId))
    if (raw) shares = JSON.parse(raw.toString('utf-8'))
  } catch { /* no file yet */ }
  cache.set(boxId, { at: Date.now(), shares })
  return shares
}

export async function writeShare(boxId: string, share: StoredShare): Promise<void> {
  if (!githubStorageEnabled) return
  const shares = (await readShares(boxId)).filter(s => s.token !== share.token)
  shares.push(share)
  await ghPutFile(sharePath(boxId), Buffer.from(JSON.stringify(shares), 'utf-8'), `membox: share update ${boxId.slice(0, 8)}`)
  cache.set(boxId, { at: Date.now(), shares })
}

export async function removeShare(boxId: string, token: string): Promise<void> {
  if (!githubStorageEnabled) return
  const shares = (await readShares(boxId)).filter(s => s.token !== token)
  await ghPutFile(sharePath(boxId), Buffer.from(JSON.stringify(shares), 'utf-8'), `membox: share update ${boxId.slice(0, 8)}`)
  cache.set(boxId, { at: Date.now(), shares })
}

// Returns the stored share for a token, or null (unknown/expired)
export async function findShare(boxId: string, token: string): Promise<StoredShare | null> {
  const now = Date.now()
  for (const s of await readShares(boxId)) {
    if (s.token !== token) continue
    if (s.expiresAt && new Date(s.expiresAt).getTime() < now) return null
    return s
  }
  return null
}
