import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { listBoxFiles, getBoxSize, deleteBoxDir } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const box = await db.memBox.findUnique({ where: { slug } })
    if (!box) {
      return NextResponse.json({ error: 'MemBox not found' }, { status: 404 })
    }

    const files = await listBoxFiles(slug)
    const size = await getBoxSize(slug)

    return NextResponse.json({
      ...box,
      files,
      fileCount: files.length,
      totalSize: size,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const box = await db.memBox.findUnique({ where: { slug } })
    if (!box) {
      return NextResponse.json({ error: 'MemBox not found' }, { status: 404 })
    }

    await deleteBoxDir(slug)
    await db.memBox.delete({ where: { slug } })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
