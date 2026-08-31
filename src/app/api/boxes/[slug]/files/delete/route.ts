import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deleteFileOrDir } from '@/lib/storage'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const box = await db.memBox.findUnique({ where: { slug } })
    if (!box) return NextResponse.json({ error: 'MemBox not found' }, { status: 404 })

    const authHeader = req.headers.get('authorization')
    const tokenHeader = req.headers.get('x-membox-token')
    let token = ''
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
    else if (tokenHeader) token = tokenHeader

    if (!token || token !== box.token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filePath } = await req.json()
    if (!filePath) return NextResponse.json({ error: 'filePath required' }, { status: 400 })

    const deleted = await deleteFileOrDir(slug, filePath)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
