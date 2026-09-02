import { db } from './db'
import type { NextRequest } from 'next/server'

export async function trackEvent(
  boxId: string,
  slug: string,
  method: string,
  statusCode: number,
  req?: NextRequest,
  filePath?: string
): Promise<void> {
  try {
    const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              req?.headers.get('x-real-ip') ||
              'unknown'
    const ua = req?.headers.get('user-agent') || 'unknown'

    await db.analyticsEvent.create({
      data: { boxId, slug, method, path: filePath, statusCode, ip, userAgent: ua },
    })
  } catch {
    /* never block requests for analytics */
  }
}

export async function getAnalytics(boxId: string, days = 7) {
  const since = new Date(Date.now() - days * 86400_000)

  const [total, byDay, byMethod, topPaths] = await Promise.all([
    db.analyticsEvent.count({ where: { boxId, createdAt: { gte: since } } }),
    db.analyticsEvent.groupBy({
      by: ['createdAt'],
      where: { boxId, createdAt: { gte: since } },
      _count: true,
    }),
    db.analyticsEvent.groupBy({
      by: ['method'],
      where: { boxId, createdAt: { gte: since } },
      _count: true,
    }),
    db.analyticsEvent.findMany({
      where: { boxId, createdAt: { gte: since } },
      select: { path: true, method: true },
      take: 50,
    }),
  ])

  // Aggregate by day
  const dayMap = new Map<string, number>()
  for (const e of byDay) {
    const day = e.createdAt.toISOString().slice(0, 10)
    dayMap.set(day, (dayMap.get(day) || 0) + (e._count as number))
  }
  const daily = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Aggregate by method
  const methodCounts = byMethod.map(m => ({
    method: m.method,
    count: m._count as number,
  }))

  // Top paths
  const pathMap = new Map<string, number>()
  for (const e of topPaths) {
    if (e.path) pathMap.set(e.path, (pathMap.get(e.path) || 0) + 1)
  }
  const topPathsSorted = Array.from(pathMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { total, daily, byMethod: methodCounts, topPaths: topPathsSorted, period: days }
}
