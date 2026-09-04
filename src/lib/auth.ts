import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema, ensureFreshDb } from './db'
import { checkRateLimit } from './rate-limit'
import { trackEvent } from './analytics'
import { fireWebhooks } from './webhook'
import { findShare } from './share-store'

export type BoxInfo = { id: string; slug: string; name: string; token: string; userId: string }

export type AuthResult = { error: NextResponse | null; box: BoxInfo | null }

function getToken(req: NextRequest): string {
  const authHeader = req.headers.get('authorization')
  const memboxToken = req.headers.get('x-membox-token')
  const queryToken = req.nextUrl.searchParams.get('token')
  const cookieToken = req.cookies.get('membox-token')?.value
  return authHeader?.replace('Bearer ', '') || memboxToken || queryToken || cookieToken || ''
}

export async function authenticate(req: NextRequest, slug: string): Promise<AuthResult> {
  const token = getToken(req)
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing token. Provide via Authorization: Bearer <token> or X-MemBox-Token header.' }, { status: 401 }), box: null }
  }

  const box = await (async () => { await ensureFreshDb(); return db.memBox.findUnique({ where: { slug } }) })()
  if (!box) {
    return { error: NextResponse.json({ error: 'MemBox not found' }, { status: 404 }), box: null }
  }

  if (box.token === token) return { error: null, box }

  // Check share tokens (read or write) — DB first, then the central repo file
  // (authoritative across instances when the local checkpoint is stale)
  const now = new Date()
  const share = await db.shareToken.findFirst({
    where: { token, boxId: box.id, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
  })
  if (share) return { error: null, box }
  if (await findShare(box.id, token)) return { error: null, box }

  return { error: NextResponse.json({ error: 'Invalid token' }, { status: 403 }), box: null }
}

export async function requireWriteAccess(req: NextRequest, slug: string): Promise<AuthResult> {
  const token = getToken(req)
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing token' }, { status: 401 }), box: null }
  }

  const box = await (async () => { await ensureFreshDb(); return db.memBox.findUnique({ where: { slug } }) })()
  if (!box) {
    return { error: NextResponse.json({ error: 'MemBox not found' }, { status: 404 }), box: null }
  }

  if (box.token === token) return { error: null, box }

  // Only write-enabled share tokens
  const now = new Date()
  const share = await db.shareToken.findFirst({
    where: { token, boxId: box.id, permission: 'write', OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
  })
  if (share) return { error: null, box }

  return { error: NextResponse.json({ error: 'Write access denied. Use master token or a write-enabled share token.' }, { status: 403 }), box: null }
}

export function rateLimitByKey(key: string, isUpload = false) {
  const result = checkRateLimit(key, isUpload ? 20 : 120)
  if (!result.allowed) {
    return {
      error: NextResponse.json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      }, { status: 429, headers: {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      }}),
      headers: {},
    }
  }
  return {
    error: null,
    headers: {
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    },
  }
}

export async function recordAnalytics(
  boxId: string, slug: string, method: string, status: number, req: NextRequest, filePath?: string
) {
  await trackEvent(boxId, slug, method, status, req, filePath)
}

export async function emitWebhook(
  boxId: string, event: string, slug: string, filePath?: string, data?: unknown
) {
  await fireWebhooks(boxId, { event, slug, path: filePath, method: event, timestamp: new Date().toISOString(), data })
}