import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'
import { githubStorageEnabled, ghGetFile, ghListDir, ghWalkFiles, ctxFor } from '@/lib/github-store'

const MAX_TEXT_BYTES = 512 * 1024
const SAFE_SEGMENT = /^[A-Za-z0-9._\- ]{1,120}$/

function safeRelPath(path: string): string | null {
  if (!path) return ''
  const segs = path.split('/').filter(Boolean)
  if (segs.some(s => s === '.' || s === '..' || !SAFE_SEGMENT.test(s))) return null
  return segs.join('/')
}

async function pairingCreds(username: string): Promise<{ repo: string; token: string } | null> {
  const user = await db.user.findUnique({ where: { username } })
  if (user?.githubRepo && user.githubTokenEnc) {
    try {
      const token = decryptSecret(user.githubTokenEnc)
      return { repo: user.githubRepo, token }
    } catch { /* fall through */ }
  }
  if (!githubStorageEnabled) return null
  try {
    const raw = await ghGetFile(`pairing/${username}.json`)
    if (!raw) return null
    const { repo, enc } = JSON.parse(raw.toString('utf-8')) as { repo?: string; enc?: string }
    if (!repo || !enc) return null
    return { repo, token: decryptSecret(enc) }
  } catch { return null }
}

const MAX_RAW_BYTES = 25 * 1024 * 1024

// GET /api/auth/github/explore?username=x&path=sub/dir
//   &search=term   → filename search across the whole repo
//   &commits=1     → recent commit history
//   &raw=1         → raw file download (with path)
export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const username = (req.nextUrl.searchParams.get('username') || '').trim()
    const rel = safeRelPath(req.nextUrl.searchParams.get('path') || '')
    if (rel === null) return NextResponse.json({ error: 'Invalid path' }, { status: 400 })

    // Pairing file is authoritative; its absence simply means "no paired repo"
    const creds = await pairingCreds(username)
    if (!creds) return NextResponse.json({ error: 'No paired repo for this user' }, { status: 404 })
    const ctx = ctxFor(creds.repo, creds.token)
    if (!ctx) return NextResponse.json({ error: 'Invalid pairing' }, { status: 400 })

    // Repo-wide filename search
    const search = (req.nextUrl.searchParams.get('search') || '').trim().toLowerCase()
    if (search) {
      const matches: { path: string; size: number }[] = []
      try {
        await ghWalkFiles('', (p, size) => {
          if (matches.length < 50 && p.toLowerCase().includes(search)) matches.push({ path: p, size })
        }, ctx)
      } catch { /* ignore walk errors */ }
      return NextResponse.json({ type: 'search', query: search, matches })
    }

    // Recent commits (memory history)
    if (req.nextUrl.searchParams.get('commits')) {
      const res = await fetch(`https://api.github.com/repos/${creds.repo}/commits?per_page=10`, {
        headers: { Authorization: `Bearer ${creds.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        redirect: 'error', cache: 'no-store',
      })
      if (!res.ok) return NextResponse.json({ type: 'commits', commits: [] })
      const json = await res.json()
      const commits = (Array.isArray(json) ? json : []).map((c: { sha: string; commit: { message: string; author?: { date?: string } } }) => ({
        sha: c.sha.slice(0, 7),
        message: (c.commit.message || '').split('\n')[0].slice(0, 120),
        date: c.commit.author?.date || null,
      }))
      return NextResponse.json({ type: 'commits', commits })
    }

    // Raw file download
    if (req.nextUrl.searchParams.get('raw') && rel) {
      const buf = await ghGetFile(rel, ctx)
      if (!buf) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (buf.length > MAX_RAW_BYTES) return NextResponse.json({ error: 'File too large to download' }, { status: 413 })
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${rel.split('/').pop() || 'file'}"`,
        },
      })
    }

    // Try directory listing first; fall back to file content.
    if (rel) {
      const entries = await ghListDir(rel, ctx)
      if (entries.length > 0) {
        return NextResponse.json({ type: 'dir', path: rel, entries })
      }
      const buf = await ghGetFile(rel, ctx)
      if (buf) {
        if (buf.length > MAX_TEXT_BYTES) {
          return NextResponse.json({ type: 'file', path: rel, tooLarge: true, size: buf.length })
        }
        const content = buf.toString('utf-8')
        return NextResponse.json({ type: 'file', path: rel, size: buf.length, content })
      }
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const entries = await ghListDir('', ctx)
    return NextResponse.json({ type: 'dir', path: '', entries })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
