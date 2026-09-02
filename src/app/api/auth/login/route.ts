import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema } from '@/lib/db'
import { generateToken } from '@/lib/token'

export async function POST(req: NextRequest) {
  try {
    const { username, loginToken } = await req.json()
    if (!username || !loginToken) {
      return NextResponse.json({ error: 'Username and login token are required' }, { status: 400 })
    }

    await ensureSchema()
    const user = await db.user.findUnique({ where: { username: username.trim() } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found. Check your username or create a new MemBox to register.' }, { status: 404 })
    }

    if (user.loginToken !== loginToken.trim()) {
      return NextResponse.json({ error: 'Invalid login token. Each account gets a unique token on first creation.' }, { status: 403 })
    }

    return NextResponse.json({ success: true, username: user.username })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
