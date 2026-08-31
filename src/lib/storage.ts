import { promises as fs } from 'fs'
import path from 'path'

const BASE_PATH = '/tmp/my-project/smailspace'

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

export async function ensureBoxDir(slug: string): Promise<void> {
  await fs.mkdir(getBoxPath(slug), { recursive: true })
}

export async function listBoxFiles(
  slug: string,
  dirPath = ''
): Promise<{ name: string; type: 'file' | 'directory'; size?: number; modified?: string }[]> {
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

export async function readFileContent(slug: string, filePath: string): Promise<string | null> {
  const target = getFilePath(slug, filePath)
  try {
    return await fs.readFile(target, 'utf-8')
  } catch {
    return null
  }
}

export async function writeFileContent(
  slug: string,
  filePath: string,
  content: string
): Promise<void> {
  const target = getFilePath(slug, filePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content, 'utf-8')
}

export async function deleteFileOrDir(slug: string, filePath: string): Promise<boolean> {
  const target = getFilePath(slug, filePath)
  try {
    await fs.rm(target, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

export async function getBoxSize(slug: string): Promise<number> {
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
  buffer: Buffer
): Promise<void> {
  const target = getFilePath(slug, filePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, buffer)
}

export async function readFileBinary(slug: string, filePath: string): Promise<Buffer | null> {
  const target = getFilePath(slug, filePath)
  try {
    return await fs.readFile(target)
  } catch {
    return null
  }
}

export async function deleteBoxDir(slug: string): Promise<void> {
  const boxPath = getBoxPath(slug)
  await fs.rm(boxPath, { recursive: true, force: true })
}
