import { NextRequest, NextResponse } from 'next/server'
import { requireWriteAccess, authenticate, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateToken } from '@/lib/token'

// POST /api/m/[slug]/_shares — Create share token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  if (error) return error

  try {
    const body = await req.json().catch(() => ({}))
    const permission = body.permission === 'write' ? 'write' : 'read'
    const label = (body.label || '').trim().slice(0, 100) || undefined
    const ttlHours = body.ttlHours ? Math.min(Math.max(body.ttlHours, 1), 8760) : undefined

    const token = generateToken()
    const expiresAt = ttlHours ? new Date(Date.now() + ttlHours * 3600_000) : null

    const share = await db.shareToken.create({
      data: { boxId: box!.id, token, permission, label, expiresAt },
    })

    await recordAnalytics(box!.id, slug, 'SHARE_CREATE', 200, req)
    return NextResponse.json({
      id: share.id, token: share.token, permission: share.permission,
      label: share.label, expiresAt: share.expiresAt, createdAt: share.createdAt,
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/m/[slug]/_shares — List share tokens
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error, box } = await authenticate(req, slug)
  if (error) return error

  try {
    const shares = await db.shareToken.findMany({
      where: { boxId: box!.id },
      orderBy: { createdAt: 'desc' },
    })
    await recordAnalytics(box!.id, slug, 'SHARE_LIST', 200, req)
    return NextResponse.json({ shares })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
