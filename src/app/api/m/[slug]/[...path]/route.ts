import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFileContent, writeFileContent, writeFileBinary, deleteFileOrDir, listBoxFiles, ensureBoxDir } from '@/lib/storage'
import { storageCtxForBox } from '@/lib/user-storage'
import type { StorageCtx } from '@/lib/storage'
import { rateLimitByKey, recordAnalytics, emitWebhook } from '@/lib/auth'
import { setTtl, removeTtl, removeTtlPrefix } from '@/lib/ttl'

async function authenticate(req: NextRequest, slug: string) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.headers.get('x-membox-token') || req.nextUrl.searchParams.get('token') || ''

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

// GET /api/m/[slug]/[...path] — Read memory
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error: rlError, headers: rlHeaders } = rateLimitByKey(slug)
    if (rlError) return rlError

    const { error, box } = await authenticate(req, slug)
    if (error) return error
    const sctx: StorageCtx | null = await storageCtxForBox(slug)

    const filePath = pathSegments.join('/')

    if (!filePath) {
      const files = await listBoxFiles(slug, '', sctx)
      await recordAnalytics(box!.id, slug, 'LIST', 200, req)
      return NextResponse.json({ slug: box!.slug, name: box!.name, files }, { headers: rlHeaders })
    }

    const content = await readFileContent(slug, filePath, sctx)
    if (content === null) {
      const files = await listBoxFiles(slug, filePath, sctx)
      if (files.length > 0 || filePath.includes('/')) {
        await recordAnalytics(box!.id, slug, 'LIST_DIR', 200, req, filePath)
        return NextResponse.json({ path: filePath, files }, { headers: rlHeaders })
      }
      await recordAnalytics(box!.id, slug, 'GET', 404, req, filePath)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const accept = req.headers.get('accept') || ''
    if (accept.includes('application/json') && !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
      await recordAnalytics(box!.id, slug, 'GET', 200, req, filePath)
      return NextResponse.json({ path: filePath, content, format: 'text' }, { headers: rlHeaders })
    }

    try {
      const parsed = JSON.parse(content)
      await recordAnalytics(box!.id, slug, 'GET', 200, req, filePath)
      return NextResponse.json({ path: filePath, data: parsed, format: 'json' }, { headers: rlHeaders })
    } catch {
      await recordAnalytics(box!.id, slug, 'GET', 200, req, filePath)
      return NextResponse.json({ path: filePath, content, format: 'text' }, { headers: rlHeaders })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/m/[slug]/[...path] — Write memory (upsert), supports ?ttl=3600
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error: rlError, headers: rlHeaders } = rateLimitByKey(slug)
    if (rlError) return rlError

    const { error, box } = await authenticate(req, slug)
    if (error) return error
    const sctx: StorageCtx | null = await storageCtxForBox(slug)

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const contentType = req.headers.get('content-type') || ''
    let content: string

    if (contentType.includes('application/json')) {
      const body = await req.json()
      if (typeof body === 'string') {
        content = body
      } else if (body.content !== undefined) {
        content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content, null, 2)
      } else if (body.data !== undefined) {
        content = JSON.stringify(body.data, null, 2)
      } else {
        content = JSON.stringify(body, null, 2)
      }
    } else {
      content = await req.text()
    }

    await writeFileContent(slug, filePath, content, sctx)

    // Handle TTL via query param
    const ttlParam = req.nextUrl.searchParams.get('ttl')
    if (ttlParam) {
      const ttlSeconds = parseInt(ttlParam)
      if (ttlSeconds > 0) {
        await setTtl(box!.id, filePath, ttlSeconds)
      }
    }

    await recordAnalytics(box!.id, slug, 'PUT', 200, req, filePath)
    await emitWebhook(box!.id, 'write', slug, filePath)
    return NextResponse.json({ success: true, path: filePath, message: 'Memory stored' }, { headers: rlHeaders })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/m/[slug]/[...path] — Upload files (multipart) or Append to memory
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const isUpload = pathSegments[0] === 'upload'
    const { error: rlError, headers: rlHeaders } = rateLimitByKey(slug, isUpload)
    if (rlError) return rlError

    const { error, box } = await authenticate(req, slug)
    if (error) return error
    const sctx: StorageCtx | null = await storageCtxForBox(slug)

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const contentType = req.headers.get('content-type') || ''

    // Handle multipart file upload when path is "upload"
    if (isUpload && contentType.includes('multipart/form-data')) {
      await ensureBoxDir(slug)
      const formData = await req.formData()
      const files = formData.getAll('files')
      const folder = (formData.get('folder') as string)?.trim() || 'uploads'

      if (!files.length) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 })
      }

      const results: { name: string; path: string; size: number; status: string; error?: string }[] = []
      let uploaded = 0
      let failed = 0

      for (const file of files) {
        if (!(file instanceof File)) {
          results.push({ name: String(file), path: '', size: 0, status: 'error', error: 'Not a file' })
          failed++
          continue
        }
        try {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const safeFolder = folder.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '')
          const relativePath = safeFolder ? `${safeFolder}/${safeName}` : safeName
          const buffer = Buffer.from(await file.arrayBuffer())
          await writeFileBinary(slug, relativePath, buffer)
          results.push({ name: file.name, path: relativePath, size: buffer.length, status: 'ok' })
          uploaded++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Write failed'
          results.push({ name: file.name, path: '', size: 0, status: 'error', error: msg })
          failed++
        }
      }

      await recordAnalytics(box!.id, slug, 'UPLOAD', uploaded > 0 ? 200 : 400, req, `uploaded=${uploaded}`)
      await emitWebhook(box!.id, 'upload', slug, folder)
      return NextResponse.json({ uploaded, failed, results }, { headers: rlHeaders })
    }

    // Default: append text/JSON to memory
    let newContent: string

    if (contentType.includes('application/json')) {
      const body = await req.json()
      newContent = typeof body === 'string' ? body : JSON.stringify(body, null, 2)
    } else {
      newContent = await req.text()
    }

    const existing = await readFileContent(slug, filePath, sctx)
    const content = existing ? existing + '\n' + newContent : newContent

    await writeFileContent(slug, filePath, content, sctx)
    await recordAnalytics(box!.id, slug, 'APPEND', 200, req, filePath)
    await emitWebhook(box!.id, 'write', slug, filePath)
    return NextResponse.json({ success: true, path: filePath, message: 'Memory appended' }, { headers: rlHeaders })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/m/[slug]/[...path] — Delete memory
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error: rlError, headers: rlHeaders } = rateLimitByKey(slug)
    if (rlError) return rlError

    const { error, box } = await authenticate(req, slug)
    if (error) return error
    const sctx: StorageCtx | null = await storageCtxForBox(slug)

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const deleted = await deleteFileOrDir(slug, filePath, sctx)
    if (!deleted) {
      await recordAnalytics(box!.id, slug, 'DELETE', 404, req, filePath)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Clean up TTL entries for this path
    await removeTtlPrefix(box!.id, filePath)

    await recordAnalytics(box!.id, slug, 'DELETE', 200, req, filePath)
    await emitWebhook(box!.id, 'delete', slug, filePath)
    return NextResponse.json({ success: true, path: filePath, message: 'Memory deleted' }, { headers: rlHeaders })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
