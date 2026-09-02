import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema, persistDb } from '@/lib/db'
import { encryptSecret, encryptionAvailable } from '@/lib/crypto'
import { ghGetLogin, ghRepoExists, ghCreatePrivateRepo } from '@/lib/github-store'
import { ghPutFile, ghDeleteFile } from '@/lib/github-store'

const REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

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

const SCAFFOLD_README = `# My MemBox Brain

This repository stores the memories of your MemBox boxes (AI agent memory).

Layout, managed automatically by MemBox:

    membox/
      <box-name>-<id>/     one folder per MemBox (your box name + short id)
        ...memory files

Every memory write is a git commit, so you can browse or roll back history.
Feel free to explore — but edit through MemBox to keep things consistent.
`

// POST /api/auth/github — pair (or re-pair) a private repo { username, repo, token }
// The user only supplies the repo NAME and the token; owner is detected from the
// token and the repo is created automatically when it doesn't exist yet.
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
      return NextResponse.json({ error: 'Both the repo name and the token are required' }, { status: 400 })
    }
    const repoName = repo.trim().replace(/^.*\//, '') // accept pasted owner/name too — keep the name part
    if (!REPO_NAME_PATTERN.test(repoName)) {
      return NextResponse.json({ error: 'Invalid repo name (letters, numbers, dots, dashes, underscores)' }, { status: 400 })
    }
    const rawToken = token.trim()

    const login = await ghGetLogin(rawToken)
    if (!login) return NextResponse.json({ error: 'Token rejected by GitHub — is it valid and not expired?' }, { status: 400 })

    const fullRepo = `${login}/${repoName}`
    const exists = await ghRepoExists(fullRepo, rawToken)
    if (exists === null) return NextResponse.json({ error: 'Could not reach GitHub' }, { status: 502 })
    if (exists === false) {
      const created = await ghCreatePrivateRepo(repoName, rawToken)
      if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 })
    }

    const check = await validateRepoAccess(fullRepo, rawToken)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

    // Scaffold the brain folder (idempotent)
    try {
      await ghPutFile('membox/README.md', Buffer.from(SCAFFOLD_README, 'utf-8'), 'membox: scaffold brain folder', { repo: fullRepo, token: rawToken })
    } catch { /* scaffold is best-effort */ }

    const enc = encryptSecret(rawToken)
    await db.user.update({
      where: { username: user.username },
      data: { githubRepo: fullRepo, githubTokenEnc: enc },
    })
    // Authoritative copy lives as a file in the central storage repo — immune to
    // the SQLite checkpoint staleness race between serverless instances.
    try {
      await ghPutFile(
        `pairing/${user.username}.json`,
        Buffer.from(JSON.stringify({ repo: fullRepo, enc, updatedAt: new Date().toISOString() }), 'utf-8'),
        `membox: update pairing for ${user.username}`
      )
    } catch { /* best-effort; DB row remains a fallback */ }
    persistDb()
    return NextResponse.json({ success: true, repo: fullRepo, created: exists === false })
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
    try {
      await ghDeleteFile(`pairing/${user.username}.json`, `membox: remove pairing for ${user.username}`)
    } catch { /* best-effort */ }
    persistDb()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
