'use client'

import { useState, useCallback, useEffect } from 'react'
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

function getUserId() {
  if (typeof window === "undefined") return ""
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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1.5 text-xs"
    >
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

function StorageTree({ files, slug, token }: { files: MemBox['files']; slug: string; token: string }) {
  if (!files || files.length === 0) {
    return <p className="text-sm text-zinc-500 py-4 text-center">No files yet. Use the API to store memories.</p>
  }
  return (
    <div className="space-y-1">
      {files.map((f) => (
        <div key={f.name} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800/50 text-sm">
          {f.type === 'directory' ? (
            <Folder className="h-4 w-4 text-amber-400" />
          ) : (
            <FileText className="h-4 w-4 text-zinc-400" />
          )}
          <span className="flex-1 text-zinc-300 font-mono text-xs">{f.name}</span>
          {f.type === 'file' && f.size !== undefined && (
            <span className="text-xs text-zinc-500">{formatBytes(f.size!)}</span>
          )}
          {f.modified && (
            <span className="text-xs text-zinc-600">
              {new Date(f.modified).toLocaleDateString()}
            </span>
          )}
        </div>
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
    if (!id) {
      toast.error('Please enter a User ID')
      return
    }
    setUserIdState(id)
    setUserId(id)
    setBoxes([])
    setSelectedBox(null)
    fetchBoxes(id)
    toast.success(`Welcome, ${id}!`)
  }

  const handleCreateBox = async () => {
    if (!boxName.trim()) {
      toast.error('Please enter a name for your MemBox')
      return
    }
    try {
      const res = await fetch('/api/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boxName.trim(), userId }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      setBoxName('')
      toast.success('MemBox created!')
      fetchBoxes()
    } catch {
      toast.error('Failed to create MemBox')
    }
  }

  const handleDeleteBox = async (slug: string) => {
    if (!confirm('Delete this MemBox and all its stored memories?')) return
    try {
      await fetch(`/api/boxes/${slug}`, { method: 'DELETE' })
      if (selectedBox?.slug === slug) setSelectedBox(null)
      toast.success('MemBox deleted')
      fetchBoxes()
    } catch {
      toast.error('Failed to delete MemBox')
    }
  }

  const handleViewBox = async (box: MemBox) => {
    setSelectedBox(box)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/boxes/${box.slug}`)
      const data = await res.json()
      setBoxDetail(data)
    } catch {
      toast.error('Failed to load box details')
    } finally {
      setDetailLoading(false)
    }
  }

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return ''
  }

  const generateCodeSnippets = (box: MemBox) => {
    const base = getBaseUrl()
    const slug = box.slug
    const token = box.token

    return {
      curl: `# Store a memory
curl -X PUT "${base}/api/m/${slug}/my-key" \
  -H "Authorization: Bearer ${token}" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is my agent\'s memory"}'

# Read a memory
curl "${base}/api/m/${slug}/my-key" \
  -H "Authorization: Bearer ${token}"

# List all memories
curl "${base}/api/m/${slug}" \
  -H "Authorization: Bearer ${token}"

# Delete a memory
curl -X DELETE "${base}/api/m/${slug}/my-key" \
  -H "Authorization: Bearer ${token}"`,

      python: `import requests

BASE = "${base}"
SLUG = "${slug}"
HEADERS = {"Authorization": "Bearer ${token}"}

# Store a memory
requests.put(
    f"{BASE}/api/m/{SLUG}/project-context",
    headers=HEADERS,
    json={"content": "Working on a React app with TypeScript"}
)

# Read a memory
resp = requests.get(f"{BASE}/api/m/{SLUG}/project-context", headers=HEADERS)
print(resp.json())

# Store structured data
requests.put(
    f"{BASE}/api/m/{SLUG}/user-preferences",
    headers=HEADERS,
    json={"data": {"theme": "dark", "language": "python"}}
)

# List all memories
resp = requests.get(f"{BASE}/api/m/{SLUG}", headers=HEADERS)
print(resp.json())`,

      node: `const BASE = "${base}";
const SLUG = "${slug}";
const HEADERS = { Authorization: "Bearer ${token}" };

// Store a memory
await fetch(\`\${BASE}/api/m/\${SLUG}/agent-state\`, {
  method: "PUT",
  headers: { ...HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({ content: "Remember: user prefers functional style" }),
});

// Read a memory
const resp = await fetch(\`\${BASE}/api/m/\${SLUG}/agent-state\`, {
  headers: HEADERS,
});
const data = await resp.json();
console.log(data);

// Store structured JSON
await fetch(\`\${BASE}/api/m/\${SLUG}/context\`, {
  method: "PUT",
  headers: { ...HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({ data: { task: "refactoring", step: 3 } }),
});`,

      mcp: `# Use as MCP-compatible memory server
# Add to your Claude Desktop / AI tool config:

# The MemBox API is REST-based and compatible with any tool that can make HTTP requests.
# Endpoint: ${base}/api/m/${slug}/{path}
# Auth: Bearer token in Authorization header

# Example tool definition for your agent:
# {
#   "name": "membox_store",
#   "description": "Store a memory in MemBox",
#   "parameters": {
#     "path": { "type": "string", "description": "Key path for the memory" },
#     "content": { "type": "string", "description": "Content to store" }
#   },
#   "handler": async (params) => {
#     return fetch(\"${base}/api/m/${slug}/\" + params.path, {
#       method: "PUT",
#       headers: { "Authorization": "Bearer ${token}", "Content-Type": "application/json" },
#       body: JSON.stringify({ content: params.content })
#     });
#   }
# }`,
    }
  }

  // Not logged in state
  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        {/* Nav */}
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

        {/* Hero */}
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
              Let all your coding tools and AI agents use it as persistent live memory.
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
                <Button
                  onClick={handleSetUserId}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-11 px-6"
                >
                  Get Started
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Pick any unique ID — no account needed. It saves locally in your browser.
              </p>
            </div>
          </section>

          {/* Features */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Zap,
                  title: 'Instant Setup',
                  desc: 'Create a MemBox and get your API endpoint + token in under 2 seconds. No signup, no waiting.',
                },
                {
                  icon: Terminal,
                  title: 'REST API',
                  desc: 'Simple PUT/GET/DELETE on any path. Works with curl, Python, Node.js, or any HTTP client your agent uses.',
                },
                {
                  icon: Shield,
                  title: 'Token Auth',
                  desc: 'Each MemBox gets a unique secret token. Only you (and your tools) can read and write to your memories.',
                },
                {
                  icon: HardDrive,
                  title: 'Unlimited Storage',
                  desc: 'No storage limits. Store as many memories, keys, and files as you need. Completely free forever.',
                },
                {
                  icon: Box,
                  title: 'Multiple Boxes',
                  desc: 'Create separate MemBoxes for different projects, agents, or workflows. Each isolated with its own token.',
                },
                {
                  icon: FolderOpen,
                  title: 'Path-Based',
                  desc: 'Organize memories in any folder structure. Use paths like project/context, agent/state, or notes/ideas.',
                },
              ].map((f) => (
                <Card key={f.title} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <f.icon className="h-4 w-4 text-emerald-400" />
                      <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm text-zinc-400 leading-relaxed">
                      {f.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/60 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-zinc-500">
            <span>MemBox — Free &amp; Open Memory for AI Agents</span>
            <span>No tracking. No limits. No cost.</span>
          </div>
        </footer>
      </div>
    )
  }

  // Logged in — dashboard
  const activeBox = selectedBox
  const snippets = activeBox ? generateCodeSnippets(activeBox) : null

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Nav */}
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
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserIdState('')
                setUserIdInput('')
                setBoxes([])
                setSelectedBox(null)
                localStorage.removeItem('membox-user-id')
              }}
              className="text-zinc-400 hover:text-zinc-200 text-xs"
            >
              Switch User
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {!activeBox ? (
          /* Box List View */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Create */}
            <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-400" />
                  Create a New MemBox
                </CardTitle>
                <CardDescription>
                  Give your MemBox a name. You&apos;ll get a unique API endpoint and token instantly.
                </CardDescription>
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
                  <Button
                    onClick={handleCreateBox}
                    disabled={!boxName.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Box List */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-400">
                Your MemBoxes ({boxes.length})
              </h2>
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
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBox(box.slug)
                          }}
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
                          <span className="text-[11px] text-zinc-400">
                            {new Date(box.createdAt).toLocaleDateString()}
                          </span>
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
          /* Box Detail View */
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <button
              onClick={() => { setSelectedBox(null); setBoxDetail(null) }}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to all MemBoxes
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Info */}
              <div className="lg:col-span-1 space-y-4">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setShowToken((p) => ({ ...p, [activeBox.id]: !p[activeBox.id] }))}
                          >
                            <Eye className="h-3 w-3 text-zinc-500" />
                          </Button>
                          <CopyButton text={activeBox.token} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Slug</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-zinc-400 font-mono bg-zinc-950 px-2 py-1 rounded flex-1 truncate">
                            {activeBox.slug}
                          </code>
                          <CopyButton text={activeBox.slug} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-950 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">
                          {boxDetail?.fileCount || 0}
                        </div>
                        <div className="text-[11px] text-zinc-500">Files</div>
                      </div>
                      <div className="bg-zinc-950 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">
                          {formatBytes(boxDetail?.totalSize || 0)}
                        </div>
                        <div className="text-[11px] text-zinc-500">Total Size</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stored Files */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-zinc-400" />
                      Stored Memories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailLoading ? (
                      <div className="text-center py-4 text-zinc-500 text-sm">Loading...</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <StorageTree files={boxDetail?.files} slug={activeBox.slug} token={activeBox.token} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDeleteBox(activeBox.slug)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete This MemBox
                </Button>
              </div>

              {/* Right: Code Snippets */}
              <div className="lg:col-span-2">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      API Usage
                    </CardTitle>
                    <CardDescription>
                      Copy these snippets into your coding tools, agents, or scripts. Each MemBox works as a simple key-value store over REST.
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
                      <TabsContent value="curl" className="mt-4">
                        <CodeBlock code={snippets?.curl || ''} language="bash" />
                      </TabsContent>
                      <TabsContent value="python" className="mt-4">
                        <CodeBlock code={snippets?.python || ''} language="python" />
                      </TabsContent>
                      <TabsContent value="node" className="mt-4">
                        <CodeBlock code={snippets?.node || ''} language="javascript" />
                      </TabsContent>
                      <TabsContent value="mcp" className="mt-4">
                        <CodeBlock code={snippets?.mcp || ''} language="json" />
                      </TabsContent>
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
                    <div className="space-y-4">
                      {[
                        {
                          method: 'GET',
                          path: '/api/m/{slug}',
                          desc: 'List all stored memories in the box root',
                          color: 'text-emerald-400',
                        },
                        {
                          method: 'GET',
                          path: '/api/m/{slug}/{path}',
                          desc: 'Read a specific memory by path. Auto-parses JSON.',
                          color: 'text-emerald-400',
                        },
                        {
                          method: 'PUT',
                          path: '/api/m/{slug}/{path}',
                          desc: 'Write (upsert) a memory. Accepts JSON body with {content: ...} or {data: ...}, or raw text.',
                          color: 'text-amber-400',
                        },
                        {
                          method: 'POST',
                          path: '/api/m/{slug}/{path}',
                          desc: 'Append to an existing memory. Creates the file if it does not exist.',
                          color: 'text-sky-400',
                        },
                        {
                          method: 'DELETE',
                          path: '/api/m/{slug}/{path}',
                          desc: 'Delete a memory or directory. Returns 404 if not found.',
                          color: 'text-red-400',
                        },
                      ].map((ep) => (
                        <div key={ep.method + ep.path} className="flex gap-3 items-start">
                          <span className={`text-xs font-mono font-bold ${ep.color} min-w-[48px] pt-0.5`}>
                            {ep.method}
                          </span>
                          <div>
                            <code className="text-xs font-mono text-zinc-300">{ep.path}</code>
                            <p className="text-xs text-zinc-500 mt-0.5">{ep.desc}</p>
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t border-zinc-800 mt-4">
                        <h4 className="text-xs font-semibold text-zinc-300 mb-2">Authentication</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Include your token via the <code className="text-zinc-300">Authorization: Bearer &lt;token&gt;</code>{' '}
                          header, or via the <code className="text-zinc-300">X-MemBox-Token</code> header.
                          All requests without a valid token will receive a 401 or 403 response.
                        </p>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-xs font-semibold text-zinc-300 mb-2">Request Body (PUT/POST)</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Send <code className="text-zinc-300">Content-Type: application/json</code> with one of:
                        </p>
                        <ul className="text-xs text-zinc-500 mt-1 space-y-1 ml-4 list-disc">
                          <li><code className="text-zinc-300">{'{'}&quot;content&quot;: &quot;plain text&quot;{'}'}</code> — stored as plain text</li>
                          <li><code className="text-zinc-300">{'{'}&quot;data&quot;: {'{'}...{'}'}{'}'}</code> — stored as formatted JSON</li>
                          <li><code className="text-zinc-300">{'{'}...{'}'}</code> — any JSON, stored formatted</li>
                          <li>Plain text body (without JSON content-type)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
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
