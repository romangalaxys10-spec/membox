import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFileContent, writeFileContent, deleteFileOrDir, listBoxFiles } from '@/lib/storage'

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

// GET /api/m/[slug]/[...path] — Read memory
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error, box } = await authenticate(req, slug)
    if (error) return error

    const filePath = pathSegments.join('/')

    if (!filePath) {
      // List all files/dirs in the box root
      const files = await listBoxFiles(slug)
      return NextResponse.json({ slug: box!.slug, name: box!.name, files })
    }

    const content = await readFileContent(slug, filePath)
    if (content === null) {
      // Check if it's a directory
      const files = await listBoxFiles(slug, filePath)
      if (files.length > 0 || filePath.includes('/')) {
        return NextResponse.json({ path: filePath, files })
      }
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const accept = req.headers.get('accept') || ''
    if (accept.includes('application/json') && !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
      return NextResponse.json({ path: filePath, content, format: 'text' })
    }

    // Try to parse as JSON, if it works return as JSON
    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({ path: filePath, data: parsed, format: 'json' })
    } catch {
      return NextResponse.json({ path: filePath, content, format: 'text' })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/m/[slug]/[...path] — Write memory (upsert)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error } = await authenticate(req, slug)
    if (error) return error

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const contentType = req.headers.get('content-type') || ''
    let content: string

    if (contentType.includes('application/json')) {
      const body = await req.json()
      // Support both { content: "..." } and { data: {...} } and raw JSON
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

    await writeFileContent(slug, filePath, content)
    return NextResponse.json({ success: true, path: filePath, message: 'Memory stored' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/m/[slug]/[...path] — Append to memory
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error } = await authenticate(req, slug)
    if (error) return error

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const contentType = req.headers.get('content-type') || ''
    let newContent: string

    if (contentType.includes('application/json')) {
      const body = await req.json()
      newContent = typeof body === 'string' ? body : JSON.stringify(body, null, 2)
    } else {
      newContent = await req.text()
    }

    const existing = await readFileContent(slug, filePath)
    const content = existing ? existing + '\n' + newContent : newContent

    await writeFileContent(slug, filePath, content)
    return NextResponse.json({ success: true, path: filePath, message: 'Memory appended' })
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
    const { error } = await authenticate(req, slug)
    if (error) return error

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const deleted = await deleteFileOrDir(slug, filePath)
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, path: filePath, message: 'Memory deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
