// In-memory rate limiter — simple token bucket per token/slug
const buckets = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000 // 1 minute window
const DEFAULT_LIMIT = 120 // requests per window
const UPLOAD_LIMIT = 20 // upload requests per window

function cleanOld() {
  const now = Date.now()
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  limit?: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanOld()
  const maxRequests = limit ?? DEFAULT_LIMIT
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }

  bucket.count++
  const remaining = Math.max(0, maxRequests - bucket.count)
  return {
    allowed: bucket.count <= maxRequests,
    remaining,
    resetAt: bucket.resetAt,
  }
}

export { UPLOAD_LIMIT }
