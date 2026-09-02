import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFileBinary } from '@/lib/storage'
import { storageCtxForBox } from '@/lib/user-storage'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
  '.sql': 'application/sql',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.epub': 'application/epub+zip',
  '.parquet': 'application/octet-stream',
  '.onnx': 'application/octet-stream',
  '.py': 'text/x-python',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.log': 'text/plain',
}

async function authenticate(req: NextRequest, slug: string) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.headers.get('x-membox-token') || req.nextUrl.searchParams.get('token') || ''

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing token' }, { status: 401 }) }
  }

  const box = await db.memBox.findUnique({ where: { slug } })
  if (!box) {
    return { error: NextResponse.json({ error: 'MemBox not found' }, { status: 404 }) }
  }

  if (box.token !== token) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 403 }) }
  }

  return { error: null }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  try {
    const { slug, path: pathSegments } = await params
    const { error } = await authenticate(req, slug)
    const sctx = await storageCtxForBox(slug)
    if (error) return error

    const filePath = pathSegments.join('/')
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    const buffer = await readFileBinary(slug, filePath, sctx)
    if (!buffer) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
    const fileName = path.basename(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
