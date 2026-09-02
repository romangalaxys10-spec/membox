import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'
import { githubStorageEnabled, ghGetFile, ghListDir, ctxFor } from '@/lib/github-store'

const MAX_TEXT_BYTES = 512 * 1024
const SAFE_SEGMENT = /^[A-Za-z0-9._\- ]{1,120}$/

function safeRelPath(path: string): string | null {
  if (!path) return ''
  const segs = path.split('/').filter(Boolean)
  if (segs.some(s => s === '.' || s === '..' || !SAFE_SEGMENT.test(s))) return null
  return segs.join('/')
}

async function pairingCreds(username: string): Promise<{ repo: string; token: string } | null> {
  const user = await db.user.findUnique({ where: { username } })
  if (user?.githubRepo && user.githubTokenEnc) {
    try {
      const token = decryptSecret(user.githubTokenEnc)
      return { repo: user.githubRepo, token }
    } catch { /* fall through */ }
  }
  if (!githubStorageEnabled) return null
  try {
    const raw = await ghGetFile(`pairing/${username}.json`)
    if (!raw) return null
    const { repo, enc } = JSON.parse(raw.toString('utf-8')) as { repo?: string; enc?: string }
    if (!repo || !enc) return null
    return { repo, token: decryptSecret(enc) }
  } catch { return null }
}

// GET /api/auth/github/explore?username=x&path=sub/dir
// Browses the user's paired repo: directories as listings, files as text.
export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const username = (req.nextUrl.searchParams.get('username') || '').trim()
    const rel = safeRelPath(req.nextUrl.searchParams.get('path') || '')
    if (rel === null) return NextResponse.json({ error: 'Invalid path' }, { status: 400 })

    const user = await db.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const creds = await pairingCreds(username)
    if (!creds) return NextResponse.json({ error: 'No paired repo for this user' }, { status: 404 })
    const ctx = ctxFor(creds.repo, creds.token)
    if (!ctx) return NextResponse.json({ error: 'Invalid pairing' }, { status: 400 })

    // Try directory listing first; fall back to file content.
    if (rel) {
      const entries = await ghListDir(rel, ctx)
      if (entries.length > 0) {
        return NextResponse.json({ type: 'dir', path: rel, entries })
      }
      const buf = await ghGetFile(rel, ctx)
      if (buf) {
        if (buf.length > MAX_TEXT_BYTES) {
          return NextResponse.json({ type: 'file', path: rel, tooLarge: true, size: buf.length })
        }
        const content = buf.toString('utf-8')
        return NextResponse.json({ type: 'file', path: rel, size: buf.length, content })
      }
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const entries = await ghListDir('', ctx)
    return NextResponse.json({ type: 'dir', path: '', entries })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
