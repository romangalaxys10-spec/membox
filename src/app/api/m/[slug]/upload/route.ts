import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFileBinary } from '@/lib/storage'

const ALLOWED_EXTENSIONS = new Set([
  // Documents
  '.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.md', '.html', '.htm',
  '.csv', '.tsv',
  // Spreadsheets
  '.xls', '.xlsx', '.ods', '.xlsm', '.xlsb',
  // Presentations
  '.ppt', '.pptx', '.odp',
  // Data / Config
  '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env', '.conf', '.cfg',
  '.sql', '.db', '.sqlite',
  // Code
  '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.r', '.lua', '.pl', '.sh', '.bash',
  '.ps1', '.bat', '.cmd',
  '.vue', '.svelte', '.astro', '.css', '.scss', '.sass', '.less',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif',
  '.avif', '.heic', '.heif',
  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma',
  // Video
  '.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  // eBooks
  '.epub', '.mobi', '.azw', '.azw3',
  // Other
  '.log', '.parquet', '.arrow', '.feather', '.npy', '.npz', '.pkl', '.pickle',
  '.h5', '.hdf5', '.onnx', '.pt', '.pth', '.bin', '.dat', '.pickle',
])

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB per file

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

async function authenticate(req: NextRequest, slug: string) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.headers.get('x-membox-token') || ''

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing token' }, { status: 401 }), box: null }
  }

  const box = await db.memBox.findUnique({ where: { slug } })
  if (!box) {
    return { error: NextResponse.json({ error: 'MemBox not found' }, { status: 404 }), box: null }
  }

  if (box.token !== token) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 403 }), box: null }
  }

  return { error: null, box }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { error } = await authenticate(req, slug)
    if (error) return error

    const formData = await req.formData()
    const files = formData.getAll('files')

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided. Use "files" field in multipart form data.' }, { status: 400 })
    }

    const results = []

    for (const file of files) {
      if (!(file instanceof File)) {
        results.push({ name: 'invalid', error: 'Not a valid file' })
        continue
      }

      const ext = getExtension(file.name)
      if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        results.push({ name: file.name, error: `File type ${ext} is not allowed` })
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        results.push({ name: file.name, error: `File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB)` })
        continue
      }

      const folder = formData.get('folder') || 'uploads'
      const folderStr = String(folder).trim().replace(/\.{2,}/g, '').split('/').filter(Boolean).join('/')
      const filePath = folderStr ? `${folderStr}/${file.name}` : file.name

      const bytes = await file.arrayBuffer()
      await writeFileBinary(slug, filePath, Buffer.from(bytes))

      results.push({
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
        status: 'uploaded',
      })
    }

    const successCount = results.filter((r) => !('error' in r)).length
    const failCount = results.length - successCount

    return NextResponse.json({
      uploaded: successCount,
      failed: failCount,
      results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
