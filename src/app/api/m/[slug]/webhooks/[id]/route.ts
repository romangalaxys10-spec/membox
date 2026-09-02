import { NextRequest, NextResponse } from 'next/server'
import { requireWriteAccess, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/m/[slug]/_webhooks/[id] — Toggle active
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  if (error) return error

  try {
    const webhook = await db.webhook.findFirst({ where: { id, boxId: box!.id } })
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const updated = await db.webhook.update({
      where: { id },
      data: { active: body.active !== undefined ? body.active : !webhook.active },
    })

    await recordAnalytics(box!.id, slug, 'WEBHOOK_UPDATE', 200, req, id)
    return NextResponse.json({ id: updated.id, url: updated.url, events: JSON.parse(updated.events), active: updated.active })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/m/[slug]/_webhooks/[id]
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
    const webhook = await db.webhook.findFirst({ where: { id, boxId: box!.id } })
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    await db.webhook.delete({ where: { id } })
    await recordAnalytics(box!.id, slug, 'WEBHOOK_DELETE', 200, req, id)
    return NextResponse.json({ success: true, message: 'Webhook deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}