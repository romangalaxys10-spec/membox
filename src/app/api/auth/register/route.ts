import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken } from '@/lib/token'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()
    const trimmed = (username || '').trim().slice(0, 100)

    if (!trimmed) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { username: trimmed } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken. Please log in instead.', errorType: 'exists' }, { status: 409 })
    }

    const loginToken = 'login_' + generateToken().replace('mb_', '')
    const user = await db.user.create({
      data: { username: trimmed, loginToken },
    })

    return NextResponse.json({
      success: true,
      username: user.username,
      loginToken: user.loginToken,
      createdAt: user.createdAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
