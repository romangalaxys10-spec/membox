import { NextRequest, NextResponse } from 'next/server'
import { requireWriteAccess, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE /api/m/[slug]/_shares/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  if (error) return error

  try {
    const share = await db.shareToken.findFirst({ where: { id, boxId: box!.id } })
    if (!share) {
      return NextResponse.json({ error: 'Share token not found' }, { status: 404 })
    }
    await db.shareToken.delete({ where: { id } })
    await recordAnalytics(box!.id, slug, 'SHARE_DELETE', 200, req, id)
    return NextResponse.json({ success: true, message: 'Share token revoked' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
