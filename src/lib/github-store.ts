// GitHub Contents API storage driver. When GITHUB_STORAGE_REPO + GITHUB_STORAGE_TOKEN
// are set, MemBox persists memory files and DB checkpoints in a private repo
// instead of relying on the ephemeral serverless filesystem.

const REPO = process.env.GITHUB_STORAGE_REPO || ''
const TOKEN = process.env.GITHUB_STORAGE_TOKEN || ''
const BRANCH = process.env.GITHUB_STORAGE_BRANCH || 'main'

// SSRF hardening: every request is built with new URL() and validated against a
// strict https + api.github.com allowlist before fetch; redirects are refused and
// the repo slug must match owner/name so nothing user- or operator-supplied can
// redirect these calls at another host or path.
const ALLOWED_HOST = 'api.github.com'
const REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/
const PATH_PATTERN = /^[A-Za-z0-9._\-/]+$/

export const githubStorageEnabled = REPO !== '' && TOKEN !== '' && REPO_PATTERN.test(REPO)

// Per-user (Bring-Your-Own-Repo) credentials, resolved per request
export interface GhCtx {
  repo: string
  token: string
  branch?: string
  prefix?: string  // folder root inside the repo (default: 'boxes')
}

// Authenticated user login + repo existence/creation helpers used by pairing.
// All calls are pinned to https://api.github.com; token comes from the pairing
// request and is never logged.
export async function ghGetLogin(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return typeof json.login === 'string' ? json.login : null
  } catch { return null }
}

export async function ghRepoExists(repo: string, token: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(repo)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', cache: 'no-store',
    })
    if (res.status === 404) return false
    return res.ok
  } catch { return null }
}

export async function ghCreatePrivateRepo(name: string, token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', cache: 'no-store',
      body: JSON.stringify({ name, private: true, description: 'My MemBox brain — AI agent memories (managed by MemBox)' }),
    })
    if (res.ok || res.status === 422) return { ok: true } // 422 = already exists
    if (res.status === 403 || res.status === 404) return { ok: false, error: 'Token is not allowed to create repositories (fine-grained tokens must select this repo, or the repo must already exist)' }
    return { ok: false, error: `GitHub returned ${res.status} while creating the repo` }
  } catch { return { ok: false, error: 'Could not reach GitHub' } }
}

export function ctxFor(repo: string, token: string, branch = 'main'): GhCtx | null {
  if (!repo || !token || !REPO_PATTERN.test(repo)) return null
  return { repo, token, branch }
}

function assertSafePath(p: string): void {
  if (p === '') return // repo root
  if (!PATH_PATTERN.test(p) || p.split('/').some(seg => seg === '.' || seg === '..')) {
    throw new Error('Invalid storage path')
  }
}

function buildUrl(pathname: string, query: Record<string, string> = {}, repo = REPO): URL {
  if (!REPO_PATTERN.test(repo)) throw new Error('Invalid repository slug')
  const url = new URL(`https://${ALLOWED_HOST}/repos/${repo}/contents/${encodePath(pathname)}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOST) {
    throw new Error('Blocked non-allowlisted storage endpoint')
  }
  return url
}

async function api(path: string, init: RequestInit = {}, creds?: GhCtx | null): Promise<Response> {
  assertSafePath(path)
  const repo = creds?.repo || REPO
  const branch = creds?.branch || BRANCH
  const url = buildUrl(path, init.body ? {} : { ref: branch }, repo)
  const extraHeaders = (init.headers || {}) as Record<string, string>
  const { Accept: acceptOverride, ...restHeaders } = extraHeaders
  return fetch(url, {
    ...init,
    redirect: 'error',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${creds?.token || TOKEN}`,
      Accept: (typeof acceptOverride === 'string' && acceptOverride) || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...restHeaders,
    },
  })
}

function encodePath(p: string): string {
  return p.split('/').filter(Boolean).map(encodeURIComponent).join('/')
}

export async function ghGetFile(path: string, creds?: GhCtx | null): Promise<Buffer | null> {
  const res = await api(path, { headers: { Accept: 'application/vnd.github.raw' } }, creds)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub get failed (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

export async function ghGetFileSha(path: string, creds?: GhCtx | null): Promise<string | null> {
  const res = await api(path, {}, creds)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub sha lookup failed (${res.status})`)
  const json = await res.json()
  return json.sha
}

export async function ghPutFile(path: string, content: Buffer, message: string, creds?: GhCtx | null): Promise<void> {
  assertSafePath(path)
  const sha = await ghGetFileSha(path, creds)
  const res = await api(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sha: sha || undefined,
      content: content.toString('base64'),
      branch: creds?.branch || BRANCH,
    }),
  }, creds)
  if (!res.ok) {
    throw new Error(`GitHub put failed (${res.status})`)
  }
}

export async function ghDeleteFile(path: string, message: string, creds?: GhCtx | null): Promise<boolean> {
  assertSafePath(path)
  const sha = await ghGetFileSha(path, creds)
  if (!sha) return false
  const res = await api(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, branch: creds?.branch || BRANCH, sha }),
  }, creds)
  if (res.status === 404) return false
  if (!res.ok) throw new Error(`GitHub delete failed (${res.status})`)
  return true
}

export async function ghListDir(
  path: string,
  creds?: GhCtx | null
): Promise<{ name: string; type: 'file' | 'directory'; size: number }[]> {
  const res = await api(path, {}, creds)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GitHub list failed (${res.status})`)
  const json = await res.json()
  if (!Array.isArray(json)) return []
  return json.map((e: { name: string; type: string; size: number }) => ({
    name: e.name,
    type: e.type === 'dir' ? 'directory' : 'file',
    size: e.size || 0,
  }))
}

// Recursively collect all file paths under a prefix (box dir). GitHub Contents API
// returns one level per call, so walk depth-first.
export async function ghWalkFiles(
  prefix: string,
  collect: (path: string, size: number) => Promise<void> | void,
  creds?: GhCtx | null
): Promise<void> {
  const entries = await ghListDir(prefix, creds)
  for (const entry of entries) {
    const child = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.type === 'directory') {
      await ghWalkFiles(child, collect, creds)
    } else {
      await collect(child, entry.size)
    }
  }
}
