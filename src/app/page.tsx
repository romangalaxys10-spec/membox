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
  Brain, Plus, Copy, Check, Trash2, Key, FolderOpen, Zap, Shield,
  HardDrive, Terminal, ChevronRight, Box, FileText, Folder, Eye,
  Upload, Download, File, FileSpreadsheet, FileImage, FileCode,
  FileArchive, X, ArrowRight, LogIn, Sparkles, ExternalLink,
  AlertTriangle, Cpu,
} from 'lucide-react'

/* ── Types ────────────────────────────────────── */
interface MemBox {
  id: string; slug: string; name: string; token: string
  userId: string; createdAt: string
  fileCount?: number; totalSize?: number
  files?: { name: string; type: 'file' | 'directory'; size?: number; modified?: string }[]
}
interface UploadResult {
  name: string; path?: string; size?: number; type?: string; status?: string; error?: string
}

type View = 'landing' | 'dashboard' | 'login-token' | 'login'

/* ── Helpers ──────────────────────────────────── */
function getStoredUserId() { if (typeof window === 'undefined') return ''; return localStorage.getItem('membox-user-id') || '' }
function setStoredUserId(id: string) { localStorage.setItem('membox-user-id', id) }
function clearStoredUser() { localStorage.removeItem('membox-user-id') }

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const doCopy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <Button variant="ghost" size="sm" onClick={doCopy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label || (copied ? 'Copied' : 'Copy')}
    </Button>
  )
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B'
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k))
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-xl bg-zinc-950/80 border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">{language || 'code'}</span>
        <CopyBtn text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <code className="text-zinc-300 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['pdf','doc','docx','odt','rtf','txt','md','epub'].includes(ext)) return <FileText className="h-4 w-4 text-blue-400" />
  if (['xls','xlsx','ods','csv','tsv'].includes(ext)) return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return <FileImage className="h-4 w-4 text-purple-400" />
  if (['js','ts','jsx','tsx','py','go','rs','java','c','cpp','css','html','json','yaml','sql','sh'].includes(ext)) return <FileCode className="h-4 w-4 text-amber-400" />
  if (['zip','tar','gz','7z','rar'].includes(ext)) return <FileArchive className="h-4 w-4 text-orange-400" />
  return <File className="h-4 w-4 text-zinc-500" />
}

function StorageTree({ files, slug, token }: { files: MemBox['files']; slug: string; token: string }) {
  if (!files || files.length === 0) return <p className="text-sm text-zinc-500 py-4 text-center">No files yet. Upload documents or use the API.</p>
  return (
    <div className="space-y-0.5">
      {files.map((f) => (
        <div key={f.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] text-sm group transition-colors">
          {f.type === 'directory' ? <Folder className="h-4 w-4 text-amber-400/80 shrink-0" /> : <div className="shrink-0">{getFileIcon(f.name)}</div>}
          <span className="flex-1 text-zinc-300 font-mono text-xs truncate" title={f.name}>{f.name}</span>
          {f.type === 'file' && f.size !== undefined && <span className="text-[11px] text-zinc-600 shrink-0">{formatBytes(f.size!)}</span>}
          {f.type === 'file' && (
            <a href={`/api/m/${slug}/files/${f.name}?token=${token}`} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Download">
              <Download className="h-3.5 w-3.5 text-zinc-500 hover:text-emerald-400" />
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── GLM Invite CTA ───────────────────────────── */
function GLMInviteCTA() {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 fade-in-up">
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/10" />
        <div className="relative p-8 sm:p-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Z.AI GLM 5 Turbo
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Supercharge your coding with <span className="glow-text-warm">GLM 5 Turbo</span>
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Full support for Claude Code, Cline, and 20+ top coding tools — starting at just $18/month.
            Subscribe now and grab the limited-time 10% OFF deal.
          </p>
          <a
            href="https://z.ai/subscribe?ic=R0K78RJKNW"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold h-12 px-8 text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-[1.02]">
              Get 10% OFF — Join GLM Coding Plan
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}

/* ── Credit Footer ────────────────────────────── */
function CreditFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-10 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-300">MemBox</span>
            <span className="text-zinc-600 text-xs">|</span>
            <span className="text-zinc-500 text-xs">Free &amp; Open Memory for AI Agents</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Cpu className="h-3 w-3 text-emerald-500/60" />
            Built with <span className="font-medium text-zinc-400">Z.AI GLM 5 Turbo</span>
          </div>
        </div>
        <div className="pt-4 border-t border-white/[0.04]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-zinc-400 font-medium">Developed by Roman</span>
              <a href="https://t.me/VibeCodePrompterSystem" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                Telegram: @VibeCodePrompterSystem <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a href="https://www.linkedin.com/in/r%D0%BEman-m-793b3310/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                LinkedIn <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <a href="https://rommark.dev" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                Portfolio: rommark.dev <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a href="https://claw.rommark.dev" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                LLM Tech Blog: claw.rommark.dev <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════ */
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

  // Login system state
  const [view, setView] = useState<View>('landing')
  const [loginTokenInput, setLoginTokenInput] = useState('')
  const [loginUsernameInput, setLoginUsernameInput] = useState('')
  const [savedLoginToken, setSavedLoginToken] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginTokenModal, setShowLoginTokenModal] = useState(false)

  useEffect(() => {
    const saved = getStoredUserId()
    if (saved) { setUserIdState(saved); setUserIdInput(saved); setView('dashboard'); fetchBoxes(saved) }
  }, [])

  const fetchBoxes = useCallback(async (uid?: string) => {
    const id = uid || userId
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/boxes?userId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (data.boxes) setBoxes(data.boxes)
    } catch { toast.error('Failed to load MemBoxes') }
    finally { setLoading(false) }
  }, [userId])

  const handleRegister = async () => {
    const id = userIdInput.trim()
    if (!id) { toast.error('Please enter a username'); return }
    // Check if user exists
    try {
      const check = await fetch(`/api/auth/check?username=${encodeURIComponent(id)}`)
      const { exists } = await check.json()
      if (exists) { setView('login'); setLoginUsernameInput(id); return }
    } catch { /* proceed */ }
    setUserIdState(id); setStoredUserId(id); setBoxes([]); setSelectedBox(null)
    setView('dashboard'); fetchBoxes(id); toast.success(`Welcome, ${id}!`)
  }

  const handleLogin = async () => {
    const username = loginUsernameInput.trim()
    const token = loginTokenInput.trim()
    if (!username || !token) { toast.error('Username and login token are required'); return }
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, loginToken: token }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setUserIdState(username); setStoredUserId(username); setSavedLoginToken(token)
      setView('dashboard'); fetchBoxes(username)
      toast.success(`Welcome back, ${username}!`)
    } catch { toast.error('Login failed') }
    finally { setLoginLoading(false) }
  }

  const handleLogout = () => {
    setUserIdState(''); setUserIdInput(''); setBoxes([]); setSelectedBox(null); clearStoredUser(); setView('landing')
  }

  const handleCreateBox = async () => {
    if (!boxName.trim()) { toast.error('Please enter a name'); return }
    try {
      const res = await fetch('/api/boxes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boxName.trim(), userId }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      if (data.isFirstBox && data.loginToken) {
        setSavedLoginToken(data.loginToken)
        setShowLoginTokenModal(true)
      }
      setBoxName(''); toast.success('MemBox created!'); fetchBoxes()
    } catch { toast.error('Failed to create MemBox') }
  }

  const handleDeleteBox = async (slug: string) => {
    if (!confirm('Delete this MemBox and all its stored memories?')) return
    try {
      await fetch(`/api/boxes/${slug}`, { method: 'DELETE' })
      if (selectedBox?.slug === slug) setSelectedBox(null)
      toast.success('MemBox deleted'); fetchBoxes()
    } catch { toast.error('Failed to delete') }
  }

  const handleViewBox = async (box: MemBox) => {
    setSelectedBox(box); setDetailLoading(true); setUploadResults([])
    try {
      const res = await fetch(`/api/boxes/${box.slug}`)
      setBoxDetail(await res.json())
    } catch { toast.error('Failed to load') }
    finally { setDetailLoading(false) }
  }

  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!selectedBox || fileList.length === 0) return
    setUploading(true); setUploadResults([])
    try {
      const fd = new FormData()
      for (const f of Array.from(fileList)) fd.append('files', f)
      if (uploadFolder.trim()) fd.append('folder', uploadFolder.trim())
      const res = await fetch(`/api/m/${selectedBox.slug}/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${selectedBox.token}` }, body: fd })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setUploadResults(data.results || [])
      if (data.uploaded > 0) toast.success(`${data.uploaded} file(s) uploaded!`)
      if (data.failed > 0) toast.error(`${data.failed} file(s) failed`)
      handleViewBox(selectedBox); fetchBoxes()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files) }
  const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : '')

  const generateSnippets = (box: MemBox) => {
    const b = getBaseUrl(), s = box.slug, t = box.token
    return {
      curl: `# Store a memory
curl -X PUT "${b}/api/m/${s}/my-key" \
  -H "Authorization: Bearer ${t}" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is my agent memory"}'

# Read a memory
curl "${b}/api/m/${s}/my-key" -H "Authorization: Bearer ${t}"

# List all memories
curl "${b}/api/m/${s}" -H "Authorization: Bearer ${t}"

# Upload a file
curl -X POST "${b}/api/m/${s}/upload" \
  -H "Authorization: Bearer ${t}" \
  -F "files=@document.pdf" -F "folder=uploads"

# Download a file
curl -O -J "${b}/api/m/${s}/files/uploads/document.pdf" \
  -H "Authorization: Bearer ${t}"

# Delete
curl -X DELETE "${b}/api/m/${s}/my-key" -H "Authorization: Bearer ${t}"`,
      python: `import requests

BASE = "${b}"
SLUG = "${s}"
HEADERS = {"Authorization": "Bearer ${t}"}

# Store text memory
requests.put(f"{BASE}/api/m/{SLUG}/context",
    headers=HEADERS, json={"content": "Working on React + TypeScript"})

# Read memory
resp = requests.get(f"{BASE}/api/m/{SLUG}/context", headers=HEADERS)
print(resp.json())

# Upload a file
with open("doc.pdf", "rb") as f:
    requests.post(f"{BASE}/api/m/{SLUG}/upload",
        headers=HEADERS,
        files={"files": ("doc.pdf", f, "application/pdf")},
        data={"folder": "uploads"})

# Download a file
resp = requests.get(f"{BASE}/api/m/{SLUG}/files/uploads/doc.pdf", headers=HEADERS)
with open("downloaded.pdf", "wb") as f: f.write(resp.content)`,
      node: `const BASE = "${b}", SLUG = "${s}";
const H = { Authorization: "Bearer ${t}" };

// Store memory
await fetch(\`\${BASE}/api/m/\${SLUG}/state\`, {
  method: "PUT", headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({ content: "user prefers functional style" }),
});

// Upload file
const form = new FormData();
form.append("files", fileInput.files[0]);
form.append("folder", "uploads");
await fetch(\`\${BASE}/api/m/\${SLUG}/upload\`, { method: "POST", headers: H, body: form });

// Download
const dl = await fetch(\`\${BASE}/api/m/\${SLUG}/files/uploads/doc.pdf\`, { headers: H });
const a = document.createElement("a");
a.href = URL.createObjectURL(await dl.blob()); a.download = "doc.pdf"; a.click();`,
      mcp: `# MemBox MCP-compatible Memory Server

BASE = "${b}"
SLUG = "${s}"
TOKEN = "${t}"

# Endpoints:
# PUT    /api/m/{slug}/{path}     -> store text/JSON memory
# GET    /api/m/{slug}/{path}     -> read memory (auto-parses JSON)
# POST   /api/m/{slug}/{path}     -> append to memory
# POST   /api/m/{slug}/upload     -> upload files (multipart)
# GET    /api/m/{slug}/files/{p}  -> download file (raw bytes)
# DELETE /api/m/{slug}/{path}     -> delete memory/file
# GET    /api/m/{slug}            -> list all items

# Auth: Authorization: Bearer <token> or X-MemBox-Token header
# Supported: PDF, Word, Excel, PPT, images, audio, video, archives, code, data
# Max file size: 500 MB`,
    }
  }

  /* ════════════════════════════════════════════════
     LOGIN TOKEN MODAL (shown once on first box)
     ════════════════════════════════════════════════ */
  const loginTokenModal = showLoginTokenModal && savedLoginToken ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLoginTokenModal(false)} />
      <div className="relative w-full max-w-md rounded-2xl border border-amber-500/20 bg-zinc-900 p-6 sm:p-8 shadow-2xl fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold">Save Your Login Token</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
          This is the <span className="text-amber-400 font-medium">only time</span> your login token will be shown.
          Save it somewhere safe. You will need it to log back into your account.
        </p>
        <div className="bg-zinc-950 rounded-xl p-4 mb-5 border border-amber-500/10">
          <Label className="text-[11px] text-amber-400/70 uppercase tracking-widest">Login Token</Label>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-sm text-amber-300 font-mono break-all leading-relaxed">{savedLoginToken}</code>
            <CopyBtn text={savedLoginToken} label="Copy" />
          </div>
        </div>
        <div className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-white/[0.04]">
          <p className="text-xs text-zinc-500 leading-relaxed">
            <span className="text-zinc-300 font-medium">How to log back in:</span> Go to the MemBox homepage and click &quot;Log In&quot;.
            Enter your username (<code className="text-zinc-300">{userId}</code>) and this login token.
          </p>
        </div>
        <Button onClick={() => setShowLoginTokenModal(false)} className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-medium h-11 rounded-xl">
          I have saved my token
        </Button>
      </div>
    </div>
  ) : null

  /* ════════════════════════════════════════════════
     NAV (shared)
     ════════════════════════════════════════════════ */
  const nav = (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { if (userId) { setSelectedBox(null); setView('dashboard') } else { setView('landing') } }}>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/10">
            <Brain className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-base tracking-tight">MemBox</span>
        </div>
        <div className="flex items-center gap-3">
          {userId ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] font-bold text-emerald-400">{userId.charAt(0).toUpperCase()}</div>
                <span className="text-xs text-zinc-400 font-mono">{userId}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-zinc-200 text-xs">
                Log Out
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView('login')} className="text-zinc-400 hover:text-zinc-100 text-xs">
                <LogIn className="h-3.5 w-3.5 mr-1" /> Log In
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )

  /* ════════════════════════════════════════════════
     VIEW: LANDING PAGE
     ════════════════════════════════════════════════ */
  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
        {nav}
        <main className="flex-1 flex flex-col">
          {/* Hero */}
          <section className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 glow-emerald" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-3xl" />
            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
              <div className="fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-400 mb-8">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  No signup. No credit card. No limits.
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 fade-in-up">
                Live Memory for
                <br />
                <span className="glow-text">Your AI Agents</span>
              </h1>
              <p className="text-base sm:text-lg text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed fade-in-up fade-in-delay-1">
                Create a MemBox in seconds. Get an API endpoint and token.
                Upload documents, store memories, and let your AI agents access it all.
              </p>
              <div className="max-w-sm mx-auto fade-in-up fade-in-delay-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Pick a username"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    className="bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-11 rounded-xl focus:border-emerald-500/50"
                  />
                  <Button onClick={handleRegister} className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 h-11 px-6 rounded-xl font-medium">
                    Start <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-600 mt-3">Your first MemBox creates your account. A login token will be generated — save it.</p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Zap, title: 'Instant Setup', desc: 'Create a MemBox and get API endpoint + token in under 2 seconds.' },
                { icon: Terminal, title: 'REST API', desc: 'Simple PUT/GET/DELETE. Works with curl, Python, Node.js, any HTTP client.' },
                { icon: Shield, title: 'Token Auth', desc: 'Each box gets a unique secret token. Only your tools can access it.' },
                { icon: Upload, title: 'File Upload', desc: 'Upload PDFs, Word, Excel, images, code — up to 500 MB each.' },
                { icon: HardDrive, title: 'Unlimited Storage', desc: 'No storage limits. Completely free, forever.' },
                { icon: FolderOpen, title: 'Path-Based', desc: 'Organize in folders: project/context, docs/reports, agent/state.' },
              ].map((f, i) => (
                <div key={f.title} className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 card-hover fade-in-up fade-in-delay-${Math.min(i, 3)}`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <f.icon className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200">{f.title}</h3>
                  </div>
                  <p className="text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center fade-in-up fade-in-delay-3">
              <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Supported File Types</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {['PDF', 'Word', 'Excel', 'PowerPoint', 'CSV', 'JSON', 'YAML', 'Markdown', 'Images', 'Audio', 'Video', 'Archives', 'Code', 'Parquet', 'ONNX'].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-500">{t}</span>
                ))}
              </div>
            </div>
          </section>

          <GLMInviteCTA />
        </main>
        <CreditFooter />
        {loginTokenModal}
        <Toaster richColors position="bottom-right" />
      </div>
    )
  }

  /* ════════════════════════════════════════════════
     VIEW: LOGIN
     ════════════════════════════════════════════════ */
  if (view === 'login') {
    return (
      <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
        {nav}
        <main className="flex-1 flex items-center justify-center p-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] blur-3xl" />
        <div className="relative w-full max-w-sm fade-in-up">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <div className="text-center mb-8">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/10">
                <LogIn className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-sm text-zinc-500 mt-1">Enter your username and login token to access your MemBoxes.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-zinc-500">Username</Label>
                <Input
                  placeholder="your-username"
                  value={loginUsernameInput}
                  onChange={(e) => setLoginUsernameInput(e.target.value)}
                  className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Login Token</Label>
                <Input
                  placeholder="login_xxxxxxxxxxxxxxxx"
                  value={loginTokenInput}
                  onChange={(e) => setLoginTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-10 rounded-xl font-mono text-xs"
                />
              </div>
              <Button onClick={handleLogin} disabled={loginLoading || !loginUsernameInput.trim() || !loginTokenInput.trim()} className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-medium h-11 rounded-xl mt-2">
                {loginLoading ? 'Logging in...' : 'Log In'}
              </Button>
            </div>
            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <button onClick={() => setView('landing')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                New here? Create an account
              </button>
            </div>
          </div>
        </div>
      </main>
      <CreditFooter />
      <Toaster richColors position="bottom-right" />
      </div>
    )
  }

  /* ════════════════════════════════════════════════
     VIEW: DASHBOARD
     ════════════════════════════════════════════════ */
  const activeBox = selectedBox
  const snippets = activeBox ? generateSnippets(activeBox) : null

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      {nav}
      <main className="flex-1">
        {!activeBox ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Create */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-8 fade-in">
              <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
                <Plus className="h-4 w-4 text-emerald-400" /> Create a New MemBox
              </h2>
              <p className="text-xs text-zinc-500 mb-4">Give your MemBox a name. You will get a unique API endpoint and token instantly.</p>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g. my-claude-agent, project-alpha"
                  value={boxName} onChange={(e) => setBoxName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBox()}
                  className="bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 rounded-xl"
                />
                <Button onClick={handleCreateBox} disabled={!boxName.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-1" /> Create
                </Button>
              </div>
            </div>

            <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Your MemBoxes ({boxes.length})</h3>

            {loading ? (
              <div className="text-center py-16 text-zinc-600 text-sm">Loading...</div>
            ) : boxes.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.06]">
                <Box className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 text-sm">No MemBoxes yet. Create your first one above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {boxes.map((box) => (
                  <div
                    key={box.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 card-hover cursor-pointer group"
                    onClick={() => handleViewBox(box)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                          <Box className="h-4 w-4 text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold">{box.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteBox(box.slug) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-zinc-600">Slug</span><code className="text-emerald-400/70 font-mono">{box.slug}</code></div>
                      <div className="flex justify-between"><span className="text-zinc-600">Files</span><span className="text-zinc-500">{box.fileCount || 0}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-600">Size</span><span className="text-zinc-500">{formatBytes(box.totalSize || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-600">Created</span><span className="text-zinc-500">{new Date(box.createdAt).toLocaleDateString()}</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-1 text-xs text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                      View details <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Box Detail ── */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <button onClick={() => { setSelectedBox(null); setBoxDetail(null) }} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors">
              <ChevronRight className="h-4 w-4 rotate-180" /> Back to all MemBoxes
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left */}
              <div className="lg:col-span-1 space-y-4">
                {/* Box Info */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                      <Box className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold">{activeBox.name}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[10px] text-zinc-600 uppercase tracking-widest">Endpoint</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-[11px] text-emerald-400/80 font-mono bg-black/30 px-2 py-1 rounded-lg flex-1 truncate">{getBaseUrl()}/api/m/{activeBox.slug}/...</code>
                        <CopyBtn text={`${getBaseUrl()}/api/m/${activeBox.slug}/`} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-zinc-600 uppercase tracking-widest">Token</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-[11px] text-amber-400/80 font-mono bg-black/30 px-2 py-1 rounded-lg flex-1 truncate">
                          {showToken[activeBox.id] ? activeBox.token : '••••••••••••••' + activeBox.token.slice(-6)}
                        </code>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowToken((p) => ({ ...p, [activeBox.id]: !p[activeBox.id] }))}><Eye className="h-3 w-3 text-zinc-600" /></Button>
                        <CopyBtn text={activeBox.token} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-zinc-600 uppercase tracking-widest">Slug</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-[11px] text-zinc-500 font-mono bg-black/30 px-2 py-1 rounded-lg flex-1 truncate">{activeBox.slug}</code>
                        <CopyBtn text={activeBox.slug} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Upload className="h-4 w-4 text-emerald-400" /> Upload Files</h3>
                  <p className="text-[11px] text-zinc-600 mb-3">PDF, Word, Excel, images, code, archives — up to 500 MB</p>
                  <Input placeholder="Folder (e.g. docs, data)" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="bg-black/30 border-white/[0.06] text-zinc-100 placeholder:text-zinc-700 text-xs h-8 rounded-lg mb-3" />
                  <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragOver ? 'border-emerald-400/50 bg-emerald-500/[0.03]' : 'border-white/[0.08] hover:border-white/[0.12]'}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2"><div className="h-7 w-7 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /><span className="text-[11px] text-zinc-500">Uploading...</span></div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload className={`h-5 w-5 ${dragOver ? 'text-emerald-400' : 'text-zinc-600'}`} />
                        <p className="text-[11px] text-zinc-500"><span className="text-emerald-400 font-medium">Click to browse</span> or drag &amp; drop</p>
                      </div>
                    )}
                  </div>
                  {uploadResults.length > 0 && (
                    <div className="space-y-1 max-h-28 overflow-y-auto mt-3">
                      {uploadResults.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg bg-black/30">
                          {'error' in r ? <X className="h-3 w-3 text-red-400" /> : <Check className="h-3 w-3 text-emerald-400" />}
                          <span className="text-zinc-400 truncate flex-1 font-mono">{r.name}</span>
                          {r.size && <span className="text-zinc-600">{formatBytes(r.size)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats + Files */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className="text-xl font-bold text-emerald-400">{boxDetail?.fileCount || 0}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Items</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className="text-xl font-bold text-emerald-400">{formatBytes(boxDetail?.totalSize || 0)}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Size</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><FolderOpen className="h-4 w-4 text-zinc-500" /> Stored Items</h3>
                  {detailLoading ? <div className="text-center py-4 text-zinc-600 text-sm">Loading...</div> : <div className="max-h-64 overflow-y-auto"><StorageTree files={boxDetail?.files} slug={activeBox.slug} token={activeBox.token} /></div>}
                </div>

                <Button variant="destructive" className="w-full rounded-xl" onClick={() => handleDeleteBox(activeBox.slug)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete This MemBox
                </Button>
              </div>

              {/* Right: Code + API Ref */}
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><Terminal className="h-4 w-4 text-emerald-400" /> API Usage</h3>
                  <p className="text-xs text-zinc-500 mb-4">Copy these snippets into your coding tools, agents, or scripts.</p>
                  <Tabs defaultValue="curl" className="w-full">
                    <TabsList className="bg-black/30 border-white/[0.06] w-full justify-start rounded-xl">
                      <TabsTrigger value="curl" className="text-xs rounded-lg">curl</TabsTrigger>
                      <TabsTrigger value="python" className="text-xs rounded-lg">Python</TabsTrigger>
                      <TabsTrigger value="node" className="text-xs rounded-lg">Node.js</TabsTrigger>
                      <TabsTrigger value="mcp" className="text-xs rounded-lg">MCP / Agent</TabsTrigger>
                    </TabsList>
                    <TabsContent value="curl" className="mt-4"><CodeBlock code={snippets?.curl || ''} language="bash" /></TabsContent>
                    <TabsContent value="python" className="mt-4"><CodeBlock code={snippets?.python || ''} language="python" /></TabsContent>
                    <TabsContent value="node" className="mt-4"><CodeBlock code={snippets?.node || ''} language="javascript" /></TabsContent>
                    <TabsContent value="mcp" className="mt-4"><CodeBlock code={snippets?.mcp || ''} language="text" /></TabsContent>
                  </Tabs>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><Key className="h-4 w-4 text-emerald-400" /> API Reference</h3>
                  <div className="space-y-3">
                    {[
                      { method: 'GET', path: '/api/m/{slug}', desc: 'List all stored memories and files', color: 'text-emerald-400' },
                      { method: 'GET', path: '/api/m/{slug}/{path}', desc: 'Read a text/JSON memory by path.', color: 'text-emerald-400' },
                      { method: 'PUT', path: '/api/m/{slug}/{path}', desc: 'Write (upsert) a text memory.', color: 'text-amber-400' },
                      { method: 'POST', path: '/api/m/{slug}/{path}', desc: 'Append to an existing text memory.', color: 'text-sky-400' },
                      { method: 'POST', path: '/api/m/{slug}/upload', desc: 'Upload files (multipart). Max 500 MB/file.', color: 'text-violet-400' },
                      { method: 'GET', path: '/api/m/{slug}/files/{path}', desc: 'Download a file (raw bytes + correct MIME).', color: 'text-emerald-400' },
                      { method: 'DELETE', path: '/api/m/{slug}/{path}', desc: 'Delete a memory, file, or directory.', color: 'text-red-400' },
                    ].map((ep) => (
                      <div key={ep.method + ep.path} className="flex gap-3 items-start">
                        <span className={`text-[11px] font-mono font-bold ${ep.color} min-w-[40px] pt-0.5`}>{ep.method}</span>
                        <div><code className="text-[11px] font-mono text-zinc-400">{ep.path}</code><p className="text-[11px] text-zinc-600 mt-0.5">{ep.desc}</p></div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-white/[0.04] space-y-2">
                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        <span className="text-zinc-400 font-medium">Auth:</span> <code className="text-zinc-400">Authorization: Bearer {'<token>'}</code> or <code className="text-zinc-400">X-MemBox-Token</code> header. Browser downloads: <code className="text-zinc-400">?token={'<token>'}</code> query param.
                      </p>
                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        <span className="text-zinc-400 font-medium">Upload types:</span> .pdf .doc .docx .xls .xlsx .ppt .pptx .csv .json .yaml .xml .sql .png .jpg .gif .webp .svg .mp3 .mp4 .wav .zip .tar .gz .parquet .onnx .py .js .ts .go .rs and 100+ more.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <CreditFooter />
      {loginTokenModal}
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
