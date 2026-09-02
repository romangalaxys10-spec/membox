import { NextRequest, NextResponse } from 'next/server'
import { requireWriteAccess, rateLimitByKey, recordAnalytics, emitWebhook } from '@/lib/auth'
import { readFileContent, writeFileContent, deleteFileOrDir, listBoxFiles } from '@/lib/storage'
import { storageCtxForBox } from '@/lib/user-storage'
import { setTtl, removeTtl } from '@/lib/ttl'

type BatchOp = { method: 'GET' | 'PUT' | 'DELETE'; path: string; content?: string; ttl?: number }

// POST /api/m/[slug]/_batch — Execute multiple operations in one request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  const sctx = await storageCtxForBox(slug)
  if (error) return error

  try {
    const body = await req.json()
    const operations: BatchOp[] = body.operations

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: 'operations array is required' }, { status: 400 })
    }
    if (operations.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 operations per batch' }, { status: 400 })
    }

    const results: { path: string; method: string; status: number; data?: unknown; error?: string }[] = []

    for (const op of operations) {
      try {
        const filePath = (op.path || '').split('/').filter(Boolean).join('/').replace(/\.{2,}/g, '')
        if (!filePath) {
          results.push({ path: op.path, method: op.method, status: 400, error: 'Path is required' })
          continue
        }

        if (op.method === 'PUT') {
          const content = typeof op.content === 'string' ? op.content : JSON.stringify(op.content, null, 2)
          await writeFileContent(slug, filePath, content, sctx)
          if (op.ttl) await setTtl(box!.id, filePath, op.ttl)
          await emitWebhook(box!.id, 'write', slug, filePath)
          results.push({ path: filePath, method: 'PUT', status: 200, data: { message: 'Stored' } })
        } else if (op.method === 'GET') {
          const content = await readFileContent(slug, filePath, sctx)
          if (content === null) {
            results.push({ path: filePath, method: 'GET', status: 404, error: 'Not found' })
          } else {
            try {
              results.push({ path: filePath, method: 'GET', status: 200, data: JSON.parse(content) })
            } catch {
              results.push({ path: filePath, method: 'GET', status: 200, data: content })
            }
          }
        } else if (op.method === 'DELETE') {
          const deleted = await deleteFileOrDir(slug, filePath)
          if (deleted) {
            await removeTtl(box!.id, filePath)
            await emitWebhook(box!.id, 'delete', slug, filePath)
            results.push({ path: filePath, method: 'DELETE', status: 200, data: { message: 'Deleted' } })
          } else {
            results.push({ path: filePath, method: 'DELETE', status: 404, error: 'Not found' })
          }
        } else {
          results.push({ path: op.path, method: op.method, status: 400, error: 'Invalid method. Use GET, PUT, or DELETE.' })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed'
        results.push({ path: op.path, method: op.method, status: 500, error: msg })
      }
    }

    const succeeded = results.filter(r => r.status < 400).length
    const failed = results.filter(r => r.status >= 400).length
    await recordAnalytics(box!.id, slug, 'BATCH', 200, req, `${succeeded}ok/${failed}fail`)
    return NextResponse.json({ succeeded, failed, results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
