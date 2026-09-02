import { NextRequest, NextResponse } from 'next/server'
import { authenticate, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { getAnalytics } from '@/lib/analytics'

// GET /api/m/[slug]/_analytics?days=7
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error, box } = await authenticate(req, slug)
  if (error) return error

  try {
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '7'), 90)
    const analytics = await getAnalytics(box!.id, days)
    await recordAnalytics(box!.id, slug, 'ANALYTICS_VIEW', 200, req)
    return NextResponse.json(analytics)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
