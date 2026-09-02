import { NextRequest, NextResponse } from 'next/server'
import { requireWriteAccess, authenticate, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/m/[slug]/_webhooks — Create webhook
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
    const body = await req.json()
    const url = (body.url || '').trim()
    const events = body.events || ['*']

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try { new URL(url) } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Events must be an array' }, { status: 400 })
    }

    const webhook = await db.webhook.create({
      data: { boxId: box!.id, url, events: JSON.stringify(events) },
    })

    await recordAnalytics(box!.id, slug, 'WEBHOOK_CREATE', 200, req)
    return NextResponse.json({ id: webhook.id, url: webhook.url, events: JSON.parse(webhook.events), active: webhook.active, createdAt: webhook.createdAt }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/m/[slug]/_webhooks — List webhooks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error, box } = await authenticate(req, slug)
  if (error) return error

  try {
    const webhooks = await db.webhook.findMany({
      where: { boxId: box!.id },
      orderBy: { createdAt: 'desc' },
    })
    const list = webhooks.map(w => ({
      id: w.id, url: w.url, events: JSON.parse(w.events), active: w.active, createdAt: w.createdAt,
    }))
    await recordAnalytics(box!.id, slug, 'WEBHOOK_LIST', 200, req)
    return NextResponse.json({ webhooks: list })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
