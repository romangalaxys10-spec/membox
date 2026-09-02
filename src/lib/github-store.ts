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
}

export function ctxFor(repo: string, token: string, branch = 'main'): GhCtx | null {
  if (!repo || !token || !REPO_PATTERN.test(repo)) return null
  return { repo, token, branch }
}

function assertSafePath(p: string): void {
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
  return fetch(url, {
    ...init,
    redirect: 'error',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${creds?.token || TOKEN}`,
      Accept: (init.headers?.Accept as string) || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers as Record<string, string> | undefined),
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
      branch: BRANCH,
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
    const child = `${prefix}/${entry.name}`
    if (entry.type === 'directory') {
      await ghWalkFiles(child, collect, creds)
    } else {
      await collect(child, entry.size)
    }
  }
}
