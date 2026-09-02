import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { listBoxFiles } from '@/lib/storage'
import { rateLimitByKey, recordAnalytics } from '@/lib/auth'

async function authenticate(req: NextRequest, slug: string) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.headers.get('x-membox-token') || ''

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing token. Provide via Authorization: Bearer <token> or X-MemBox-Token header.' }, { status: 401 }), box: null }
  }

  const box = await db.memBox.findUnique({ where: { slug } })
  if (!box) {
    return { error: NextResponse.json({ error: 'MemBox not found' }, { status: 404 }), box: null }
  }

  if (box.token !== token) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 403 }), box: null }
  }

  return { error: null, box }
}

// GET /api/m/[slug] — List all memories in the box
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { error: rlError, headers: rlHeaders } = rateLimitByKey(slug)
    if (rlError) return rlError

    const { error, box } = await authenticate(req, slug)
    if (error) return error

    const files = await listBoxFiles(slug)
    await recordAnalytics(box!.id, slug, 'LIST', 200, req)
    return NextResponse.json({ slug: box!.slug, name: box!.name, files }, { headers: rlHeaders })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
