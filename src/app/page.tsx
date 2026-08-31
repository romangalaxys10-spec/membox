'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster, toast } from 'sonner'
import {
  Brain,
  Plus,
  Copy,
  Check,
  Trash2,
  Key,
  FolderOpen,
  Zap,
  Shield,
  HardDrive,
  Terminal,
  ChevronRight,
  Box,
  FileText,
  Folder,
  Eye,
  Upload,
  Download,
  File,
  FileSpreadsheet,
  FileImage,
  FileCode,
  FileArchive,
  X,
} from 'lucide-react'

interface MemBox {
  id: string
  slug: string
  name: string
  token: string
  userId: string
  createdAt: string
  fileCount?: number
  totalSize?: number
  files?: { name: string; type: 'file' | 'directory'; size?: number; modified?: string }[]
}

interface UploadResult {
  name: string
  path?: string
  size?: number
  type?: string
  status?: string
  error?: string
}

function getUserId() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('membox-user-id') || ''
}

function setUserId(id: string) {
  localStorage.setItem('membox-user-id', id)
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label || (copied ? 'Copied' : 'Copy')}
    </Button>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">{language || 'plaintext'}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-zinc-300 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const docExts = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'epub', 'mobi']
  const sheetExts = ['xls', 'xlsx', 'ods', 'csv', 'tsv']
  const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif']
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'html', 'json', 'yaml', 'yml', 'xml', 'sql', 'sh', 'vue', 'svelte']
  const archiveExts = ['zip', 'tar', 'gz', 'bz2', '7z', 'rar']
  const mediaExts = ['mp3', 'wav', 'ogg', 'flac', 'mp4', 'webm', 'avi', 'mov', 'mkv']

  if (docExts.includes(ext)) return <FileText className="h-4 w-4 text-blue-400" />
  if (sheetExts.includes(ext)) return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
  if (imgExts.includes(ext)) return <FileImage className="h-4 w-4 text-purple-400" />
  if (codeExts.includes(ext)) return <FileCode className="h-4 w-4 text-amber-400" />
  if (archiveExts.includes(ext)) return <FileArchive className="h-4 w-4 text-orange-400" />
  if (mediaExts.includes(ext)) return <File className="h-4 w-4 text-pink-400" />
  return <File className="h-4 w-4 text-zinc-400" />
}

function FileTreeItem({
  file,
  slug,
  token,
  basePath,
}: {
  file: { name: string; type: 'file' | 'directory'; size?: number; modified?: string }
  slug: string
  token: string
  basePath: string
}) {
  const downloadUrl = `${basePath}/api/m/${slug}/files/${name}`
  const headers = new Headers()
  headers.set('Authorization', `Bearer ${token}`)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800/50 text-sm group">
      {file.type === 'directory' ? (
        <Folder className="h-4 w-4 text-amber-400 shrink-0" />
      ) : (
        <div className="shrink-0">{getFileIcon(file.name)}</div>
      )}
      <span className="flex-1 text-zinc-300 font-mono text-xs truncate" title={file.name}>
        {file.name}
      </span>
      {file.type === 'file' && file.size !== undefined && (
        <span className="text-[11px] text-zinc-500 shrink-0">{formatBytes(file.size!)}</span>
      )}
      {file.modified && (
        <span className="text-[11px] text-zinc-600 shrink-0 hidden sm:inline">
          {new Date(file.modified).toLocaleDateString()}
        </span>
      )}
      {file.type === 'file' && (
        <a
          href={`/api/m/${slug}/files/${file.name}?token=${token}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Download"
        >
          <Download className="h-3.5 w-3.5 text-zinc-400 hover:text-emerald-400" />
        </a>
      )}
    </div>
  )
}

function StorageTree({ files, slug, token }: { files: MemBox['files']; slug: string; token: string }) {
  if (!files || files.length === 0) {
    return <p className="text-sm text-zinc-500 py-4 text-center">No files yet. Upload documents or use the API to store memories.</p>
  }
  const basePath = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <div className="space-y-0.5">
      {files.map((f) => (
        <FileTreeItem key={f.name} file={f} slug={slug} token={token} basePath={basePath} />
      ))}
    </div>
  )
}

export default function Home() {
  const [userId, setUserIdState] = useState('')
  const [userIdInput, setUserIdInput] = useState('')
  const [boxes, setBoxes] = useState<MemBox[]>([])
  const [loading, setLoading] = useState(false)
  const [boxName, setBoxName] = useState('')
  const [selectedBox, setSelectedBox] = useState<MemBox | null>(null)
  const [boxDetail, setBoxDetail] = useState<MemBox | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showToken, setShowToken] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadFolder, setUploadFolder] = useState('uploads')
  const [dragOver, setDragOver] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = getUserId()
    if (saved) {
      setUserIdState(saved)
      setUserIdInput(saved)
      fetchBoxes(saved)
    }
  }, [])

  const fetchBoxes = useCallback(async (uid?: string) => {
    const id = uid || userId
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/boxes?userId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (data.boxes) setBoxes(data.boxes)
    } catch {
      toast.error('Failed to load MemBoxes')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleSetUserId = () => {
    const id = userIdInput.trim()
    if (!id) { toast.error('Please enter a User ID'); return }
    setUserIdState(id)
    setUserId(id)
    setBoxes([])
    setSelectedBox(null)
    fetchBoxes(id)
    toast.success(`Welcome, ${id}!`)
  }

  const handleCreateBox = async () => {
    if (!boxName.trim()) { toast.error('Please enter a name'); return }
    try {
      const res = await fetch('/api/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boxName.trim(), userId }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setBoxName('')
      toast.success('MemBox created!')
      fetchBoxes()
    } catch { toast.error('Failed to create MemBox') }
  }

  const handleDeleteBox = async (slug: string) => {
    if (!confirm('Delete this MemBox and all its stored memories?')) return
    try {
      await fetch(`/api/boxes/${slug}`, { method: 'DELETE' })
      if (selectedBox?.slug === slug) setSelectedBox(null)
      toast.success('MemBox deleted')
      fetchBoxes()
    } catch { toast.error('Failed to delete') }
  }

  const handleViewBox = async (box: MemBox) => {
    setSelectedBox(box)
    setDetailLoading(true)
    setUploadResults([])
    try {
      const res = await fetch(`/api/boxes/${box.slug}`)
      const data = await res.json()
      setBoxDetail(data)
    } catch { toast.error('Failed to load box details') }
    finally { setDetailLoading(false) }
  }

  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!selectedBox || fileList.length === 0) return
    setUploading(true)
    setUploadResults([])
    try {
      const formData = new FormData()
      for (const f of Array.from(fileList)) {
        formData.append('files', f)
      }
      if (uploadFolder.trim()) formData.append('folder', uploadFolder.trim())

      const res = await fetch(`/api/m/${selectedBox.slug}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${selectedBox.token}` },
        body: formData,
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setUploadResults(data.results || [])
      if (data.uploaded > 0) toast.success(`${data.uploaded} file(s) uploaded!`)
      if (data.failed > 0) toast.error(`${data.failed} file(s) failed`)
      // Refresh file list
      handleViewBox(selectedBox)
      fetchBoxes()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : '')

  const generateCodeSnippets = (box: MemBox) => {
    const base = getBaseUrl()
    const s = box.slug
    const t = box.token
    return {
      curl: `# --- Text Memory Operations ---

# Store a memory
curl -X PUT "${base}/api/m/${s}/my-key" \
  -H "Authorization: Bearer ${t}" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is my agent memory"}'

# Read a memory
curl "${base}/api/m/${s}/my-key" \
  -H "Authorization: Bearer ${t}"

# List all memories
curl "${base}/api/m/${s}" \
  -H "Authorization: Bearer ${t}"

# --- File Upload ---

# Upload a PDF document
curl -X POST "${base}/api/m/${s}/upload" \
  -H "Authorization: Bearer ${t}" \
  -F "files=@document.pdf" \
  -F "folder=uploads"

# Upload multiple files (Word, Excel, etc.)
curl -X POST "${base}/api/m/${s}/upload" \
  -H "Authorization: Bearer ${t}" \
  -F "files=@report.docx" \
  -F "files=@data.xlsx" \
  -F "files=@notes.pdf" \
  -F "folder=docs"

# Upload to a specific folder
curl -X POST "${base}/api/m/${s}/upload" \
  -H "Authorization: Bearer ${t}" \
  -F "files=@image.png" \
  -F "folder=images/screenshots"

# --- File Download ---

# Download a file
curl -O -J "${base}/api/m/${s}/files/uploads/document.pdf" \
  -H "Authorization: Bearer ${t}"

# --- Delete ---

curl -X DELETE "${base}/api/m/${s}/my-key" \
  -H "Authorization: Bearer ${t}"`,

      python: `import requests

BASE = "${base}"
SLUG = "${s}"
HEADERS = {"Authorization": "Bearer ${t}"}

# --- Text Memory Operations ---

requests.put(
    f"{BASE}/api/m/{SLUG}/project-context",
    headers=HEADERS,
    json={"content": "Working on a React app with TypeScript"}
)

resp = requests.get(f"{BASE}/api/m/{SLUG}/project-context", headers=HEADERS)
print(resp.json())

# --- File Upload ---

# Upload a PDF
with open("document.pdf", "rb") as f:
    resp = requests.post(
        f"{BASE}/api/m/{SLUG}/upload",
        headers=HEADERS,
        files={"files": ("document.pdf", f, "application/pdf")},
        data={"folder": "uploads"}
    )
print(resp.json())

# Upload multiple files
files_to_upload = [
    ("report.docx", open("report.docx", "rb"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ("data.xlsx", open("data.xlsx", "rb"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ("notes.pdf", open("notes.pdf", "rb"), "application/pdf"),
]
resp = requests.post(
    f"{BASE}/api/m/{SLUG}/upload",
    headers=HEADERS,
    files=[("files", name, f, mime) for name, f, mime in files_to_upload],
    data={"folder": "docs"}
)
print(resp.json())

# --- File Download ---

resp = requests.get(
    f"{BASE}/api/m/{SLUG}/files/uploads/document.pdf",
    headers=HEADERS
)
with open("downloaded.pdf", "wb") as f:
    f.write(resp.content)

# List all files
resp = requests.get(f"{BASE}/api/m/{SLUG}", headers=HEADERS)
print(resp.json())`,

      node: `const BASE = "${base}";
const SLUG = "${s}";
const HEADERS = { Authorization: "Bearer ${t}" };

// --- Text Memory Operations ---

await fetch(\`\${BASE}/api/m/\${SLUG}/agent-state\`, {
  method: "PUT",
  headers: { ...HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({ content: "Remember: user prefers functional style" }),
});

// --- File Upload ---

// Upload a single file
const form = new FormData();
form.append("files", fileInput.files[0]);
form.append("folder", "uploads");
await fetch(\`\${BASE}/api/m/\${SLUG}/upload\`, {
  method: "POST",
  headers: HEADERS,  // Note: don't set Content-Type, browser sets it with boundary
  body: form,
});

// Upload multiple files
const form2 = new FormData();
form2.append("files", pdfFile);
form2.append("files", excelFile);
form2.append("files", wordFile);
form2.append("folder", "docs");
const res = await fetch(\`\${BASE}/api/m/\${SLUG}/upload\`, {
  method: "POST",
  headers: HEADERS,
  body: form2,
});
console.log(await res.json());

// --- File Download ---

const dl = await fetch(
  \`\${BASE}/api/m/\${SLUG}/files/uploads/document.pdf\`,
  { headers: HEADERS }
);
const blob = await dl.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url; a.download = "document.pdf"; a.click();`,

      mcp: `# MemBox as MCP-compatible Memory Server
# Add to your Claude Desktop / AI tool config:

# The MemBox API supports:
# 1. Key-value text memory via PUT/GET/DELETE
# 2. File upload (PDF, Word, Excel, images, etc.) via multipart POST
# 3. File download via /files/ prefix

BASE = "${base}"
SLUG = "${s}"
TOKEN = "${t}"

# Example tool definitions for your agent:

# membox_store: PUT {path, content} -> text memory
# membox_read:  GET {path} -> text/JSON memory
# membox_upload: POST multipart {files, folder} -> file upload
# membox_download: GET /files/{path} -> binary file
# membox_list:  GET / -> list all stored items
# membox_delete: DELETE {path} -> remove item

# Upload endpoint: ${base}/api/m/${s}/upload
# Download endpoint: ${base}/api/m/${s}/files/{path}
# List endpoint: ${base}/api/m/${s}

# Supported file types for upload:
# Documents: .pdf, .doc, .docx, .odt, .rtf, .txt, .md, .html, .csv
# Spreadsheets: .xls, .xlsx, .ods, .xlsm
# Presentations: .ppt, .pptx, .odp
# Data: .json, .yaml, .xml, .sql, .parquet, .onnx
# Images: .png, .jpg, .jpeg, .gif, .webp, .svg
# Audio/Video: .mp3, .wav, .mp4, .webm
# Archives: .zip, .tar, .gz, .7z, .rar
# Code: .py, .js, .ts, .go, .rs, .java, .cpp, and more
# Max file size: 500 MB per file`,
    }
  }

  // ─── Not logged in ─────────────────────────────────────
  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Brain className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="font-semibold text-lg tracking-tight">MemBox</span>
            </div>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
              100% Free
            </Badge>
          </div>
        </header>

        <main className="flex-1">
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
              <Zap className="h-3.5 w-3.5" />
              No signup. No credit card. No limits.
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Live Memory for
              <br />
              <span className="text-emerald-400">Your AI Agents</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Create a MemBox in seconds. Get an API endpoint and token.
              Upload documents, store memories, and let your AI agents access it all via a simple REST API.
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your User ID (any name)"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetUserId()}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-11"
                />
                <Button onClick={handleSetUserId} className="bg-emerald-500 hover:bg-emerald-600 text-white h-11 px-6">
                  Get Started <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mt-3">Pick any unique ID — no account needed. It saves locally in your browser.</p>
            </div>
          </section>

          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Zap, title: 'Instant Setup', desc: 'Create a MemBox and get your API endpoint + token in under 2 seconds. No signup, no waiting.' },
                { icon: Terminal, title: 'REST API', desc: 'Simple PUT/GET/DELETE on any path. Works with curl, Python, Node.js, or any HTTP client your agent uses.' },
                { icon: Shield, title: 'Token Auth', desc: 'Each MemBox gets a unique secret token. Only you (and your tools) can read and write to your memories.' },
                { icon: Upload, title: 'File Upload', desc: 'Upload PDFs, Word docs, Excel sheets, images, code, archives — any file up to 500 MB. Organize in folders.' },
                { icon: HardDrive, title: 'Unlimited Storage', desc: 'No storage limits. Store as many memories, keys, and files as you need. Completely free forever.' },
                { icon: FolderOpen, title: 'Path-Based', desc: 'Organize memories in any folder structure. Use paths like project/context, agent/state, or docs/reports.' },
              ].map((f) => (
                <Card key={f.title} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <f.icon className="h-4 w-4 text-emerald-400" />
                      <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm text-zinc-400 leading-relaxed">{f.desc}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Supported file types */}
            <div className="mt-16 text-center">
              <h3 className="text-lg font-semibold mb-4">Upload Any Document Type</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {['PDF', 'Word', 'Excel', 'PowerPoint', 'CSV', 'JSON', 'YAML', 'Markdown', 'Images', 'Audio', 'Video', 'Archives', 'Code Files', 'Parquet', 'ONNX'].map((t) => (
                  <Badge key={t} variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-zinc-800/60 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-zinc-500">
            <span>MemBox — Free &amp; Open Memory for AI Agents</span>
            <span>No tracking. No limits. No cost.</span>
          </div>
        </footer>
      </div>
    )
  }

  // ─── Logged in — dashboard ─────────────────────────────
  const activeBox = selectedBox
  const snippets = activeBox ? generateCodeSnippets(activeBox) : null

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedBox(null); fetchBoxes() }}>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Brain className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="font-semibold text-lg tracking-tight">MemBox</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                {userId.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-zinc-300 font-mono">{userId}</span>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => { setUserIdState(''); setUserIdInput(''); setBoxes([]); setSelectedBox(null); localStorage.removeItem('membox-user-id') }}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
            >
              Switch User
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {!activeBox ? (
          /* ─── Box List View ─── */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-400" />
                  Create a New MemBox
                </CardTitle>
                <CardDescription>Give your MemBox a name. You&apos;ll get a unique API endpoint and token instantly.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="e.g. my-claude-agent, project-alpha, research-notes"
                    value={boxName}
                    onChange={(e) => setBoxName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBox()}
                    className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <Button onClick={handleCreateBox} disabled={!boxName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-1" /> Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-400">Your MemBoxes ({boxes.length})</h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : boxes.length === 0 ? (
              <Card className="bg-zinc-900/30 border-zinc-800/50 border-dashed">
                <CardContent className="py-12 text-center">
                  <Box className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No MemBoxes yet. Create your first one above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boxes.map((box) => (
                  <Card
                    key={box.id}
                    className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/30 transition-all cursor-pointer group"
                    onClick={() => handleViewBox(box)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                            <Box className="h-4 w-4 text-emerald-400" />
                          </div>
                          <CardTitle className="text-sm font-semibold">{box.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handleDeleteBox(box.slug) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Slug</span>
                          <code className="text-[11px] text-emerald-400/80 font-mono">{box.slug}</code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Files</span>
                          <span className="text-[11px] text-zinc-400">{box.fileCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Size</span>
                          <span className="text-[11px] text-zinc-400">{formatBytes(box.totalSize || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Created</span>
                          <span className="text-[11px] text-zinc-400">{new Date(box.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-zinc-800/50 flex items-center gap-1 text-xs text-emerald-400">
                        View details <ChevronRight className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ─── Box Detail View ─── */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <button
              onClick={() => { setSelectedBox(null); setBoxDetail(null) }}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to all MemBoxes
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-1 space-y-4">
                {/* Box Info */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <Box className="h-4 w-4 text-emerald-400" />
                      </div>
                      <CardTitle className="text-base">{activeBox.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Endpoint</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-emerald-400/80 font-mono bg-zinc-950 px-2 py-1 rounded flex-1 truncate">
                            {getBaseUrl()}/api/m/{activeBox.slug}/...
                          </code>
                          <CopyButton text={`${getBaseUrl()}/api/m/${activeBox.slug}/`} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Token</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-amber-400/80 font-mono bg-zinc-950 px-2 py-1 rounded flex-1 truncate">
                            {showToken[activeBox.id] ? activeBox.token : '••••••••••••••••••••' + activeBox.token.slice(-6)}
                          </code>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowToken((p) => ({ ...p, [activeBox.id]: !p[activeBox.id] }))}>
                            <Eye className="h-3 w-3 text-zinc-500" />
                          </Button>
                          <CopyButton text={activeBox.token} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Slug</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-zinc-400 font-mono bg-zinc-950 px-2 py-1 rounded flex-1 truncate">{activeBox.slug}</code>
                          <CopyButton text={activeBox.slug} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* File Upload Zone */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Upload className="h-4 w-4 text-emerald-400" />
                      Upload Files
                    </CardTitle>
                    <CardDescription className="text-xs">
                      PDF, Word, Excel, images, code, archives — up to 500 MB each
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Folder (e.g. docs, uploads, data)"
                        value={uploadFolder}
                        onChange={(e) => setUploadFolder(e.target.value)}
                        className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-xs h-8"
                      />
                    </div>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                        dragOver ? 'border-emerald-400 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                          <span className="text-xs text-zinc-400">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className={`h-6 w-6 ${dragOver ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <p className="text-xs text-zinc-400">
                            <span className="text-emerald-400 font-medium">Click to browse</span> or drag &amp; drop files here
                          </p>
                        </div>
                      )}
                    </div>
                    {uploadResults.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {uploadResults.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-950">
                            {'error' in r ? (
                              <X className="h-3 w-3 text-red-400 shrink-0" />
                            ) : (
                              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                            )}
                            <span className="text-zinc-300 truncate flex-1 font-mono">{r.name}</span>
                            {r.size && <span className="text-zinc-500 shrink-0">{formatBytes(r.size)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stats */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-950 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">{boxDetail?.fileCount || 0}</div>
                        <div className="text-[11px] text-zinc-500">Items</div>
                      </div>
                      <div className="bg-zinc-950 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">{formatBytes(boxDetail?.totalSize || 0)}</div>
                        <div className="text-[11px] text-zinc-500">Total Size</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stored Files Tree */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-zinc-400" />
                      Stored Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailLoading ? (
                      <div className="text-center py-4 text-zinc-500 text-sm">Loading...</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        <StorageTree files={boxDetail?.files} slug={activeBox.slug} token={activeBox.token} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Button variant="destructive" className="w-full" onClick={() => handleDeleteBox(activeBox.slug)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete This MemBox
                </Button>
              </div>

              {/* Right Column — Code Snippets & API Ref */}
              <div className="lg:col-span-2">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      API Usage
                    </CardTitle>
                    <CardDescription>
                      Copy these snippets into your coding tools, agents, or scripts. Supports text memory + file upload/download.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="bg-zinc-950 border-zinc-800 w-full justify-start">
                        <TabsTrigger value="curl" className="text-xs">curl</TabsTrigger>
                        <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                        <TabsTrigger value="node" className="text-xs">Node.js</TabsTrigger>
                        <TabsTrigger value="mcp" className="text-xs">MCP / Agent</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl" className="mt-4"><CodeBlock code={snippets?.curl || ''} language="bash" /></TabsContent>
                      <TabsContent value="python" className="mt-4"><CodeBlock code={snippets?.python || ''} language="python" /></TabsContent>
                      <TabsContent value="node" className="mt-4"><CodeBlock code={snippets?.node || ''} language="javascript" /></TabsContent>
                      <TabsContent value="mcp" className="mt-4"><CodeBlock code={snippets?.mcp || ''} language="text" /></TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* API Reference */}
                <Card className="bg-zinc-900/50 border-zinc-800 mt-6">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="h-4 w-4 text-emerald-400" />
                      API Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { method: 'GET', path: '/api/m/{slug}', desc: 'List all stored memories and files', color: 'text-emerald-400' },
                        { method: 'GET', path: '/api/m/{slug}/{path}', desc: 'Read a text/JSON memory by path. Auto-parses JSON.', color: 'text-emerald-400' },
                        { method: 'PUT', path: '/api/m/{slug}/{path}', desc: 'Write (upsert) a text memory. Accepts {content: ...}, {data: ...}, or raw text.', color: 'text-amber-400' },
                        { method: 'POST', path: '/api/m/{slug}/{path}', desc: 'Append to an existing text memory.', color: 'text-sky-400' },
                        { method: 'POST', path: '/api/m/{slug}/upload', desc: 'Upload files (multipart form). Field: "files". Optional: "folder". Max 500 MB/file.', color: 'text-violet-400' },
                        { method: 'GET', path: '/api/m/{slug}/files/{path}', desc: 'Download a file (returns raw bytes with correct MIME type).', color: 'text-emerald-400' },
                        { method: 'DELETE', path: '/api/m/{slug}/{path}', desc: 'Delete a memory, file, or directory.', color: 'text-red-400' },
                      ].map((ep) => (
                        <div key={ep.method + ep.path} className="flex gap-3 items-start">
                          <span className={`text-xs font-mono font-bold ${ep.color} min-w-[48px] pt-0.5`}>{ep.method}</span>
                          <div>
                            <code className="text-xs font-mono text-zinc-300">{ep.path}</code>
                            <p className="text-xs text-zinc-500 mt-0.5">{ep.desc}</p>
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t border-zinc-800 space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-300 mb-1">Authentication</h4>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            <code className="text-zinc-300">Authorization: Bearer {'<token>'}</code> or <code className="text-zinc-300">X-MemBox-Token</code> header.
                            For file downloads via browser, use <code className="text-zinc-300">?token={'<token>'}</code> query param.
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-300 mb-1">Supported Upload Types</h4>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Documents (.pdf, .doc, .docx, .odt, .rtf, .txt, .md, .csv), Spreadsheets (.xls, .xlsx, .ods),
                            Presentations (.ppt, .pptx), Images (.png, .jpg, .gif, .webp, .svg), Audio/Video (.mp3, .mp4, .wav, .webm),
                            Archives (.zip, .tar, .gz), Code files, Data files (.parquet, .onnx, .json, .yaml), and 100+ more.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-zinc-500">
          <span>MemBox — Free &amp; Open Memory for AI Agents</span>
          <span>No tracking. No limits. No cost.</span>
        </div>
      </footer>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
