import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema, persistDb } from '@/lib/db'
import { encryptSecret, encryptionAvailable } from '@/lib/crypto'

const REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/

// Validate a user's fine-grained PAT against their repo (read access) without
// ever logging or storing the raw token.
async function validateRepoAccess(repo: string, token: string): Promise<{ ok: boolean; error?: string }> {
  if (!REPO_PATTERN.test(repo)) return { ok: false, error: 'Repo must be in owner/name form' }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      redirect: 'error',
      cache: 'no-store',
    })
    if (res.status === 401) return { ok: false, error: 'Token rejected by GitHub (invalid or expired)' }
    if (res.status === 404) return { ok: false, error: 'Repo not found — check the name, and that the token has access to it' }
    if (!res.ok) return { ok: false, error: `GitHub returned ${res.status}` }
    const json = await res.json()
    if (!json.permissions?.push) return { ok: false, error: 'Token is missing Contents write permission for this repo' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach GitHub' }
  }
}

// GET /api/auth/github?username=x — pairing status (repo name only, never the token)
export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const username = req.nextUrl.searchParams.get('username') || ''
    const user = await db.user.findUnique({ where: { username } })
    return NextResponse.json({ paired: Boolean(user?.githubRepo), repo: user?.githubRepo || null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

// POST /api/auth/github — pair (or re-pair) a private repo { username, repo, token }
export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    if (!encryptionAvailable) {
      return NextResponse.json({ error: 'GitHub pairing is not configured on this server (missing APP_SECRET)' }, { status: 503 })
    }
    const { username, repo, token } = await req.json()
    const user = await db.user.findUnique({ where: { username: (username || '').trim() } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (typeof repo !== 'string' || typeof token !== 'string' || !repo || !token) {
      return NextResponse.json({ error: 'Both repo (owner/name) and token are required' }, { status: 400 })
    }

    const check = await validateRepoAccess(repo.trim(), token.trim())
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

    await db.user.update({
      where: { username: user.username },
      data: { githubRepo: repo.trim(), githubTokenEnc: encryptSecret(token.trim()) },
    })
    persistDb()
    return NextResponse.json({ success: true, repo: repo.trim() })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/auth/github — unpair { username }
export async function DELETE(req: NextRequest) {
  try {
    await ensureSchema()
    const { username } = await req.json()
    const user = await db.user.findUnique({ where: { username: (username || '').trim() } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    await db.user.update({
      where: { username: user.username },
      data: { githubRepo: null, githubTokenEnc: null },
    })
    persistDb()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
