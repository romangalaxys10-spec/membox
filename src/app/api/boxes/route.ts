import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken, generateSlug } from '@/lib/token'
import { ensureBoxDir, listBoxFiles, getBoxSize } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body.name || '').trim().slice(0, 100)
    const userId = (body.userId || '').trim().slice(0, 100)

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { username: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please register first.' }, { status: 404 })
    }

    const slug = generateSlug()
    const token = generateToken()

    const box = await db.memBox.create({
      data: { slug, name, token, userId },
    })

    await ensureBoxDir(slug)

    return NextResponse.json({
      id: box.id,
      slug: box.slug,
      name: box.name,
      token: box.token,
      userId: box.userId,
      createdAt: box.createdAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 })
    }

    const boxes = await db.memBox.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const enriched = await Promise.all(
      boxes.map(async (b) => {
        const files = await listBoxFiles(b.slug)
        const size = await getBoxSize(b.slug)
        return {
          ...b,
          fileCount: files.length,
          totalSize: size,
        }
      })
    )

    return NextResponse.json({ boxes: enriched })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
