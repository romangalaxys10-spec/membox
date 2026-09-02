import { NextRequest, NextResponse } from 'next/server'
import { authenticate, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { readFileContent, listBoxFiles, getFilePath, getBoxPath } from '@/lib/storage'
import { promises as fs } from 'fs'
import path from 'path'

// GET /api/m/[slug]/_search?q=query&limit=20
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error: rlError, headers: rlHeaders } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await authenticate(req, slug)
  if (error) return error

  const q = req.nextUrl.searchParams.get('q') || ''
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200)
  const type = req.nextUrl.searchParams.get('type') || 'all' // 'all', 'file', 'content'

  if (!q) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 })
  }

  try {
    const results: { path: string; type: 'file' | 'directory'; match: string; size?: number }[] = []
    const boxPath = getBoxPath(slug)
    const boxRoot = path.resolve(boxPath)
    const qLower = q.toLowerCase()

    async function searchDir(dir: string, prefix: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (results.length >= limit) return
          const fullPath = path.join(dir, entry.name)
          // Containment guard: never follow paths that resolve outside the box directory
          if (entry.isSymbolicLink()) continue
          if (!path.resolve(fullPath).startsWith(boxRoot + path.sep)) return
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name

          // Match file/directory name
          if (entry.name.toLowerCase().includes(qLower)) {
            if (type === 'all' || type === 'file') {
              if (entry.isFile()) {
                const stat = await fs.stat(fullPath)
                results.push({ path: relPath, type: 'file', match: 'name', size: stat.size })
              } else if (type === 'all') {
                results.push({ path: relPath, type: 'directory', match: 'name' })
              }
            }
          }

          if (entry.isDirectory()) {
            await searchDir(fullPath, relPath)
          } else {
            // Search file content for text files (including files without extensions)
            try {
              const ext = path.extname(entry.name).toLowerCase()
              const textExts = ['.txt', '.md', '.json', '.yaml', '.yml', '.csv', '.xml', '.html', '.js', '.ts', '.py', '.log', '.sql', '']
              if (textExts.includes(ext) && (type === 'all' || type === 'content')) {
                const content = await fs.readFile(fullPath, 'utf-8')
                const lines = content.split('\n')
                for (let i = 0; i < lines.length && results.length < limit; i++) {
                  if (lines[i].toLowerCase().includes(qLower)) {
                    results.push({ path: relPath, type: 'file', match: 'content' })
                    break // one match per file
                  }
                }
              }
            } catch {
              /* binary file, skip content search */
            }
          }
        }
      } catch {
        /* permission error, skip */
      }
    }

    await searchDir(boxPath, '')

    await recordAnalytics(box!.id, slug, 'SEARCH', 200, req, `q=${q}`)
    return NextResponse.json({ query: q, results, total: results.length }, { headers: rlHeaders })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    await recordAnalytics(box!.id, slug, 'SEARCH', 500, req, `q=${q}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
