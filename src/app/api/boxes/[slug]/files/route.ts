import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { listBoxFiles, readFileContent } from '@/lib/storage'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const box = await db.memBox.findUnique({ where: { slug } })
    if (!box) return NextResponse.json({ error: 'MemBox not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const dirPath = searchParams.get('path') || ''
    const previewFile = searchParams.get('preview')

    if (previewFile) {
      const content = await readFileContent(slug, previewFile)
      if (content === null) return NextResponse.json({ error: 'File not found or binary' }, { status: 404 })
      const truncated = content.length > 50000 ? content.slice(0, 50000) + '\n\n... [truncated]' : content
      return NextResponse.json({ preview: truncated, size: Buffer.byteLength(content) })
    }

    const files = await listBoxFiles(slug, dirPath)
    return NextResponse.json({ path: dirPath, files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
