import { promises as fs } from 'fs'
import path from 'path'
import { githubStorageEnabled, ghGetFile, ghPutFile, ghDeleteFile, ghListDir, ghWalkFiles, type GhCtx } from './github-store'

// When ctx is provided, operate in the user's own paired repo; otherwise the
// app-level repo (env vars) is used.
export type StorageCtx = GhCtx

const BASE_PATH = process.env.STORAGE_PATH || '/home/z/my-project/data/smailspace'

// Memory content lives in the repo under <prefix>/<slug>/<path> when GitHub
// storage is enabled; the local fs acts as a write-through cache only.
// Default prefix is 'boxes'; paired users get a human-friendly folder instead.
function remoteKey(ctx: StorageCtx | null | undefined, slug: string, relPath: string): string {
  // A user-paired prefix already embeds the box folder (membox/<name>-<id>)
  return ctx?.prefix ? `${ctx.prefix}/${relPath}` : `boxes/${slug}/${relPath}`
}
function boxRoot(ctx: StorageCtx | null | undefined, slug: string): string {
  return ctx?.prefix || `boxes/${slug}`
}

export function getBoxPath(slug: string): string {
  return path.join(BASE_PATH, slug)
}

export function getFilePath(slug: string, filePath: string): string {
  // Sanitize: prevent path traversal
  const sanitized = filePath
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/\.{2,}/g, '')
  return path.join(BASE_PATH, slug, sanitized)
}

function getRelPath(slug: string, filePath: string): string {
  const sanitized = filePath
    .split('/')
    .filter(Boolean)
    .join('/')
    .replace(/\.{2,}/g, '')
  return sanitized
}

export async function ensureBoxDir(slug: string): Promise<void> {
  await fs.mkdir(getBoxPath(slug), { recursive: true })
}

export async function listBoxFiles(
  slug: string,
  dirPath = '',
  ctx?: StorageCtx | null
): Promise<{ name: string; type: 'file' | 'directory'; size?: number; modified?: string }[]> {
  if (ctx || githubStorageEnabled) {
    try {
      const prefix = dirPath ? remoteKey(ctx, slug, getRelPath(slug, dirPath)) : boxRoot(ctx, slug)
      const entries = await ghListDir(prefix, ctx)
      return entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    } catch {
      return []
    }
  }
  const target = dirPath ? getFilePath(slug, dirPath) : getBoxPath(slug)
  try {
    const entries = await fs.readdir(target, { withFileTypes: true })
    const results = []
    for (const entry of entries) {
      const fullPath = path.join(target, entry.name)
      if (entry.isDirectory()) {
        results.push({ name: entry.name, type: 'directory' })
      } else {
        const stat = await fs.stat(fullPath)
        results.push({
          name: entry.name,
          type: 'file',
          size: stat.size,
          modified: stat.mtime.toISOString(),
        })
      }
    }
    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

export async function readFileContent(slug: string, filePath: string, ctx?: StorageCtx | null): Promise<string | null> {
  const target = getFilePath(slug, filePath)
  try {
    return await fs.readFile(target, 'utf-8')
  } catch {
    // fall through to remote
  }
  if (ctx || githubStorageEnabled) {
    try {
      const buf = await ghGetFile(remoteKey(ctx, slug, getRelPath(slug, filePath)), ctx)
      if (buf) return buf.toString('utf-8')
    } catch {
      /* remote miss */
    }
  }
  return null
}

export async function writeFileContent(
  slug: string,
  filePath: string,
  content: string,
  ctx?: StorageCtx | null
): Promise<void> {
  const target = getFilePath(slug, filePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content, 'utf-8')
  if (ctx || githubStorageEnabled) {
    await ghPutFile(
      remoteKey(ctx, slug, getRelPath(slug, filePath)),
      Buffer.from(content, 'utf-8'),
      `membox(${slug}): write ${getRelPath(slug, filePath)}`,
      ctx
    )
  }
}

export async function deleteFileOrDir(slug: string, filePath: string, ctx?: StorageCtx | null): Promise<boolean> {
  const target = getFilePath(slug, filePath)
  let removed = false
  try {
    await fs.rm(target, { recursive: true, force: true })
    removed = true
  } catch {
    removed = false
  }
  if (ctx || githubStorageEnabled) {
    // Best effort: delete the subtree in the repo
    const prefix = remoteKey(ctx, slug, getRelPath(slug, filePath))
    const files: string[] = []
    try {
      await ghWalkFiles(prefix, (p) => { files.push(p) }, ctx)
    } catch { /* not found or list failure */ }
    if (files.length === 0) {
      try { await ghDeleteFile(prefix, `membox(${slug}): delete ${getRelPath(slug, filePath)}`, ctx) } catch { /* ignore */ }
    } else {
      for (const p of files) {
        try { await ghDeleteFile(p, `membox(${slug}): delete file`, ctx) } catch { /* ignore */ }
      }
    }
    removed = true
  }
  return removed
}

export async function getBoxSize(slug: string, ctx?: StorageCtx | null): Promise<number> {
  if (ctx || githubStorageEnabled) {
    let totalSize = 0
    try {
      await ghWalkFiles(boxRoot(ctx, slug), (_p, size) => { totalSize += size }, ctx)
    } catch { /* ignore */ }
    return totalSize
  }
  const boxPath = getBoxPath(slug)
  let totalSize = 0
  async function walk(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          const stat = await fs.stat(fullPath)
          totalSize += stat.size
        }
      }
    } catch {
      // ignore
    }
  }
  await walk(boxPath)
  return totalSize
}

export async function writeFileBinary(
  slug: string,
  filePath: string,
  buffer: Buffer,
  ctx?: StorageCtx | null
): Promise<void> {
  const target = getFilePath(slug, filePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, buffer)
  if (ctx || githubStorageEnabled) {
    await ghPutFile(
      remoteKey(ctx, slug, getRelPath(slug, filePath)),
      buffer,
      `membox(${slug}): upload ${getRelPath(slug, filePath)}`,
      ctx
    )
  }
}

export async function readFileBinary(slug: string, filePath: string, ctx?: StorageCtx | null): Promise<Buffer | null> {
  const target = getFilePath(slug, filePath)
  try {
    return await fs.readFile(target)
  } catch {
    // fall through to remote
  }
  if (ctx || githubStorageEnabled) {
    try {
      return await ghGetFile(remoteKey(ctx, slug, getRelPath(slug, filePath)), ctx)
    } catch {
      /* remote miss */
    }
  }
  return null
}

export async function deleteBoxDir(slug: string, ctx?: StorageCtx | null): Promise<void> {
  const boxPath = getBoxPath(slug)
  await fs.rm(boxPath, { recursive: true, force: true })
  if (ctx || githubStorageEnabled) {
    const files: string[] = []
    try {
      await ghWalkFiles(boxRoot(ctx, slug), (p) => { files.push(p) }, ctx)
    } catch { /* ignore */ }
    for (const p of files) {
      try { await ghDeleteFile(p, `membox(${slug}): delete file`) } catch { /* ignore */ }
    }
  }
}
