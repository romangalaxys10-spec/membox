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
  AlertTriangle, Cpu, UserPlus, FolderPlus, ChevronLeft, Search, FileMinus, Globe,
} from 'lucide-react'

import { t, getStoredLang, setStoredLang, isRTL, LANG_LABELS } from '@/lib/i18n'
import type { LangCode } from '@/lib/i18n'

/* ── Types ────────────────────────────────────── */
interface FileEntry { name: string; type: 'file' | 'directory'; size?: number; modified?: string; path?: string }
interface MemBox {
  id: string; slug: string; name: string; token: string
  userId: string; createdAt: string
  fileCount?: number; totalSize?: number
  files?: FileEntry[]
}
interface UploadResult {
  name: string; path?: string; size?: number; type?: string; status?: string; error?: string
}

type View = 'landing' | 'dashboard' | 'login-token' | 'login'

/* ── Apple Magic: Hooks ─────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target) } }) },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )
    el.querySelectorAll('.reveal').forEach(child => obs.observe(child))
    if (el.classList.contains('reveal')) obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function useMagnetic() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const dx = (e.clientX - cx) / r.width, dy = (e.clientY - cy) / r.height
      el.style.transform = `translate(${dx * 6}px, ${dy * 4}px)`
    }
    const onLeave = () => { el.style.transform = 'translate(0, 0)' }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [])
  return ref
}

function useNavScroll() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return scrolled
}

/* ── Helpers ──────────────────────────────────── */
function getStoredUserId() { if (typeof window === 'undefined') return ''; return localStorage.getItem('membox-user-id') || '' }
function setStoredUserId(id: string) { localStorage.setItem('membox-user-id', id) }
function clearStoredUser() { localStorage.removeItem('membox-user-id') }

function CopyBtn({ text, label, lang }: { text: string; label?: string; lang: LangCode }) {
  const [copied, setCopied] = useState(false)
  const doCopy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <Button variant="ghost" size="sm" onClick={doCopy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label || (copied ? t(lang, 'copy.copied') : t(lang, 'copy.copy'))}
    </Button>
  )
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B'
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k))
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]
}

function CodeBlock({ code, language, lang }: { code: string; language?: string; lang: LangCode }) {
  return (
    <div className="relative group rounded-xl bg-zinc-950/80 border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">{language || 'code'}</span>
        <CopyBtn text={code} lang={lang} />
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

function isTextFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ['txt','md','json','yaml','yml','xml','csv','tsv','sql','py','js','ts','jsx','tsx','go','rs','java','c','cpp','h','hpp','cs','rb','php','sh','bash','zsh','html','htm','css','scss','less','toml','ini','cfg','conf','env','gitignore','dockerfile','makefile','log','r','swift','kt','dart','lua','pl','ex','exs','clj','hs','ml','vim','sh','bat','ps1','graphql','gql','proto','tf','hcl','rego','wasm','asm','s','vue','svelte','astro'].includes(ext)
}

function FileBrowser({ slug, token, onRefresh, lang }: { slug: string; token: string; onRefresh: () => void; lang: LangCode }) {
  const [currentPath, setCurrentPath] = useState('')
  const [browserFiles, setBrowserFiles] = useState<FileEntry[]>([])
  const [browserLoading, setBrowserLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const navigateTo = useCallback(async (path: string) => {
    setCurrentPath(path)
    setPreviewFile(null)
    setPreviewContent('')
    setDeleteConfirm(null)
    setSearchQuery('')
    setBrowserLoading(true)
    try {
      const res = await fetch(`/api/boxes/${slug}/files?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.files) setBrowserFiles(data.files.map((f: FileEntry) => ({ ...f, path: path ? `${path}/${f.name}` : f.name })))
    } catch { toast.error(t(lang, 'err.browseFailed')) }
    finally { setBrowserLoading(false) }
  }, [slug])

  useEffect(() => { navigateTo('') }, [slug])

  const openFolder = (name: string) => navigateTo(currentPath ? `${currentPath}/${name}` : name)
  const goUp = () => { if (currentPath) { const parts = currentPath.split('/'); parts.pop(); navigateTo(parts.join('/')) } }
  const goToPath = (idx: number) => { const parts = currentPath.split('/').slice(0, idx + 1); navigateTo(parts.join('/')) }

  const previewTextFile = async (filePath: string) => {
    setPreviewFile(filePath)
    setPreviewLoading(true)
    setPreviewContent('')
    try {
      const res = await fetch(`/api/boxes/${slug}/files?preview=${encodeURIComponent(filePath)}`)
      const data = await res.json()
      if (data.preview) setPreviewContent(data.preview)
      else toast.error(t(lang, 'err.previewFailed'))
    } catch { toast.error(t(lang, 'err.previewError')) }
    finally { setPreviewLoading(false) }
  }

  const handleDelete = async (filePath: string) => {
    try {
      const res = await fetch(`/api/boxes/${slug}/files/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ filePath }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      toast.success(t(lang, 'err.deleteOk'))
      setDeleteConfirm(null)
      if (previewFile === filePath) { setPreviewFile(null); setPreviewContent('') }
      navigateTo(currentPath)
      onRefresh()
    } catch { toast.error(t(lang, 'err.deleteFail')) }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    const folderPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim()
    try {
      const res = await fetch(`/api/m/${slug}/${folderPath}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '', _mkdir: true }),
      })
      if (res.ok) { toast.success(t(lang, 'err.folderCreated', { name: newFolderName.trim() })); setNewFolderName(''); setShowNewFolder(false); navigateTo(currentPath); onRefresh() }
      else toast.error(t(lang, 'err.folderFail'))
    } catch { toast.error(t(lang, 'err.failed')) }
  }

  const pathParts = currentPath ? currentPath.split('/') : []
  const filteredFiles = searchQuery
    ? browserFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : browserFiles
  const folderCount = filteredFiles.filter(f => f.type === 'directory').length
  const fileCount = filteredFiles.filter(f => f.type === 'file').length

  return (
    <div className="space-y-3">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-xs min-w-0 overflow-x-auto scrollbar-none">
        <button onClick={() => navigateTo('')} className={`shrink-0 px-1.5 py-0.5 rounded-md transition-colors ${!currentPath ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'}`}>{t(lang, 'fb.root')}</button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="h-3 w-3 text-zinc-700" />
            <button onClick={() => goToPath(i)} className={`px-1.5 py-0.5 rounded-md transition-colors ${i === pathParts.length - 1 ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'}`}>{part}</button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <Input
            placeholder={t(lang, 'fb.filterPh')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-black/30 border-white/[0.06] text-xs rounded-lg placeholder:text-zinc-700"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setShowNewFolder(!showNewFolder); setNewFolderName('') }} className="h-8 px-2 text-zinc-500 hover:text-emerald-400">
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { navigateTo(currentPath); onRefresh() }} className="h-8 px-2 text-zinc-500 hover:text-zinc-200">
          <span className="text-[10px]">{t(lang, 'fb.refresh')}</span>
        </Button>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={t(lang, 'fb.folderNamePh')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            autoFocus
            className="h-8 bg-black/30 border-white/[0.06] text-xs rounded-lg placeholder:text-zinc-700"
          />
          <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs">{t(lang, 'fb.create')}</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(false)} className="h-8 w-8 p-0"><X className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {/* Info bar */}
      <div className="flex items-center justify-between text-[10px] text-zinc-600 px-1">
        <span>{folderCount > 0 ? `${folderCount} ${t(lang, 'fb.folders')}` : ''}{folderCount > 0 && fileCount > 0 ? ', ' : ''}{fileCount} {t(lang, 'fb.files')}</span>
        {currentPath && <button onClick={goUp} className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"><ChevronLeft className="h-3 w-3" /> {t(lang, 'fb.parent')}</button>}
      </div>

      {/* File list */}
      {browserLoading ? (
        <div className="text-center py-8 text-zinc-600 text-xs">{t(lang, 'fb.loading')}</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-white/[0.06]">
          <Folder className="h-8 w-8 text-zinc-800 mx-auto mb-2" />
          <p className="text-zinc-600 text-xs">{searchQuery ? t(lang, 'fb.noMatch') : t(lang, 'fb.empty')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-black/20 overflow-hidden divide-y divide-white/[0.04]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_100px_60px] gap-2 px-3 py-2 text-[10px] text-zinc-600 uppercase tracking-wider bg-white/[0.02]">
            <span>{t(lang, 'fb.name')}</span><span>{t(lang, 'fb.sizeCol')}</span><span>{t(lang, 'fb.modified')}</span><span></span>
          </div>
          {/* Rows */}
          {filteredFiles.map((f) => {
            const isActive = previewFile === f.path
            return (
              <div
                key={f.name}
                className={`grid grid-cols-[1fr_80px_100px_60px] gap-2 px-3 py-2 items-center text-xs group transition-colors ${isActive ? 'bg-emerald-500/[0.05]' : 'hover:bg-white/[0.02]'}`}
                onDoubleClick={() => f.type === 'directory' ? openFolder(f.name) : isTextFile(f.name) ? previewTextFile(f.path || f.name) : undefined}
              >
                {/* Name + icon */}
                <div className={`flex items-center gap-2.5 min-w-0 ${f.type === 'directory' ? 'cursor-pointer' : ''} ${isTextFile(f.name) && f.type === 'file' ? 'cursor-pointer' : ''}`} onClick={() => f.type === 'directory' ? openFolder(f.name) : isTextFile(f.name) ? previewTextFile(f.path || f.name) : undefined}>
                  {f.type === 'directory' ? (
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/10"><Folder className="h-3.5 w-3.5 text-amber-400" /></div>
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">{getFileIcon(f.name)}</div>
                  )}
                  <span className="font-mono text-[11px] truncate {f.type === 'directory' ? 'text-zinc-200' : 'text-zinc-300'}">{f.name}</span>
                </div>
                {/* Size */}
                <span className="text-zinc-600 text-[11px]">{f.type === 'file' && f.size !== undefined ? formatBytes(f.size) : '—'}</span>
                {/* Modified */}
                <span className="text-zinc-700 text-[10px]">{f.modified ? new Date(f.modified).toLocaleDateString() : '—'}</span>
                {/* Actions */}
                <div className="flex items-center justify-end gap-0.5">
                  {f.type === 'file' && (
                    <a
                      href={`/api/m/${slug}/files/${f.path || f.name}?token=${token}`}
                      className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-700 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/[0.06]"
                      title={t(lang, 'fb.download')}
                    ><Download className="h-3 w-3" /></a>
                  )}
                  {deleteConfirm === (f.path || f.name) ? (
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleDelete(f.path || f.name)} className="h-6 px-1.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30 transition-colors">{t(lang, 'fb.yes')}</button>
                      <button onClick={() => setDeleteConfirm(null)} className="h-6 px-1.5 rounded-md text-zinc-500 text-[10px] hover:bg-white/[0.06] transition-colors">{t(lang, 'fb.no')}</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(f.path || f.name)} className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/[0.06]" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview panel */}
      {previewFile && (
        <div className="rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.04]">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-zinc-400 font-mono truncate">{previewFile}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href={`/api/m/${slug}/files/${previewFile}?token=${token}`} className="h-6 px-2 rounded-md flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors"><Download className="h-3 w-3" />{t(lang, 'fb.download')}</a>
              <button onClick={() => { setPreviewFile(null); setPreviewContent('') }} className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"><X className="h-3 w-3" /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center py-8"><div className="h-5 w-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /></div>
            ) : (
              <pre className="p-4 text-[12px] leading-relaxed text-zinc-400 font-mono whitespace-pre-wrap break-all">{previewContent}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── GLM Invite CTA ───────────────────────────── */
function GLMInviteCTA({ lang }: { lang: LangCode }) {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] cta-glow transition-all duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/10" />
        <div className="relative p-8 sm:p-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            {t(lang, 'glm.badge')}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            {t(lang, 'glm.title')} <span className="glow-text-warm shimmer-text" style={{ position: 'relative', display: 'inline-block' }}>{t(lang, 'glm.highlight')}</span>
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            {t(lang, 'glm.desc')}
          </p>
          <a
            href="https://z.ai/subscribe?ic=R0K78RJKNW"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold h-12 px-8 text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/30 hover:scale-[1.03] active:scale-[0.98]">
              {t(lang, 'glm.btn')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}

/* ── Credit Footer ────────────────────────────── */
function CreditFooter({ lang }: { lang: LangCode }) {
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
            <span className="text-zinc-500 text-xs">{t(lang, 'footer.tagline')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Cpu className="h-3 w-3 text-emerald-500/60" />
            {t(lang, 'footer.builtWith')} <span className="font-medium text-zinc-400">Z.AI GLM 5 Turbo</span>
          </div>
        </div>
        <div className="pt-4 border-t border-white/[0.04]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-600">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-zinc-400 font-medium">{t(lang, 'footer.developedBy')}</span>
              <a href="https://t.me/VibeCodePrompterSystem" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                Telegram: @VibeCodePrompterSystem <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a href="https://www.linkedin.com/in/r%D0%BEman-m-793b3310/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                LinkedIn <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <a href="https://github.com/romangalaxys10-spec/membox" target="_blank" rel="noopener noreferrer" className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/[0.12] hover:border-emerald-500/40 hover:from-emerald-500/[0.12] hover:to-emerald-500/[0.04] transition-all duration-300 text-zinc-200 hover:text-white font-medium text-sm shadow-lg shadow-black/20 hover:shadow-emerald-500/10 hover:scale-[1.03]">
                <svg className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                <span>{t(lang, 'footer.starOnGithub')}</span>
                <span className="flex items-center gap-0.5 text-xs bg-white/[0.08] px-1.5 py-0.5 rounded-md group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  {t(lang, 'footer.support')}
                </span>
              </a>
              <a href="https://rommark.dev" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                Portfolio: rommark.dev <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a href="https://claw.rommark.dev" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors inline-flex items-center gap-1">
                LLM Tech Blog: claw.rommark.dev <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a href="https://codetrendy.com/?utm_source=github.com&utm_medium=badge" target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center">
                <img src="https://codetrendy.com/api/badge?style=classic" alt="Profiled on CodeTrendy" height={54} />
              </a>
              <a href="https://sitepatent.com/?utm_source=github.com&utm_medium=badge" target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center">
                <img src="https://sitepatent.com/api/badge?style=classic" alt="Profiled on SitePatent" height={54} />
              </a>
              <a href="https://mediapronet.com/?utm_source=github.com&utm_medium=badge" target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center">
                <img src="https://mediapronet.com/api/badge?style=classic" alt="Profiled on MEDIAPRONET" height={54} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ── Login Token Modal (mandatory) ────────────── */
function LoginTokenModalContent({ userId, token, onAcknowledge, lang }: { userId: string; token: string; onAcknowledge: () => void; lang: LangCode }) {
  const [copied, setCopied] = useState(false)
  const [ackChecked, setAckChecked] = useState(false)
  const doCopy = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative w-full max-w-md rounded-2xl border border-amber-500/20 bg-zinc-900 p-6 sm:p-8 shadow-2xl fade-in">
      {/* Warning header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{t(lang, 'token.title')}</h3>
          <p className="text-[11px] text-amber-400/80 mt-0.5">{t(lang, 'token.shownOnce')}</p>
        </div>
      </div>

      {/* Username */}
      <div className="bg-zinc-950 rounded-xl p-4 mb-3 border border-white/[0.06]">
        <Label className="text-[11px] text-zinc-500 uppercase tracking-widest">{t(lang, 'token.username')}</Label>
        <div className="flex items-center gap-2 mt-1.5">
          <code className="flex-1 text-sm text-zinc-200 font-mono break-all">{userId}</code>
          <CopyBtn text={userId} label={t(lang, 'copy.copy')} lang={lang} />
        </div>
      </div>

      {/* Login Token */}
      <div className="bg-zinc-950 rounded-xl p-4 mb-4 border border-amber-500/10">
        <Label className="text-[11px] text-amber-400/70 uppercase tracking-widest">{t(lang, 'token.loginToken')}</Label>
        <div className="flex items-center gap-2 mt-2">
          <code className="flex-1 text-[13px] text-amber-300 font-mono break-all leading-relaxed select-all">{token}</code>
          <CopyBtn text={token} label={t(lang, 'copy.copy')} lang={lang} />
        </div>
        <button
          onClick={doCopy}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/15 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t(lang, 'token.copied') : t(lang, 'token.copyToken')}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-zinc-950/50 rounded-xl p-4 mb-5 border border-white/[0.04]">
        <p className="text-xs text-zinc-400 font-medium mb-2">{t(lang, 'token.howTo')}</p>
        <ol className="text-xs text-zinc-500 leading-relaxed space-y-1 list-decimal list-inside">
          <li>{t(lang, 'token.step1')}</li>
          <li>{t(lang, 'token.step2')}</li>
          <li>{t(lang, 'token.step3')}</li>
        </ol>
        <p className="text-[11px] text-red-400/80 mt-3 leading-relaxed">
          {t(lang, 'token.warning')}
        </p>
      </div>

      {/* Mandatory acknowledgment */}
      <label className="flex items-start gap-3 mb-5 cursor-pointer group">
        <div className="relative mt-0.5">
          <input type="checkbox" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} className="peer sr-only" />
          <div className="h-5 w-5 rounded-md border-2 border-zinc-700 bg-zinc-950 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 transition-all flex items-center justify-center">
            {ackChecked && <Check className="h-3 w-3 text-emerald-400" />}
          </div>
        </div>
        <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
          {t(lang, 'token.ack')}
        </span>
      </label>

      <Button
        onClick={onAcknowledge}
        disabled={!ackChecked}
        className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-medium h-11 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {t(lang, 'token.continue')}
      </Button>
    </div>
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
  const [registerLoading, setRegisterLoading] = useState(false)
  const [createBoxLoading, setCreateBoxLoading] = useState(false)
  const [loginTab, setLoginTab] = useState<'login' | 'signup'>('login')
  const [lang, setLang] = useState<LangCode>(getStoredLang)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const navScrolled = useNavScroll()
  const changeLang = (l: LangCode) => { setLang(l); setStoredLang(l); document.documentElement.dir = isRTL(l) ? 'rtl' : 'ltr' }
  useEffect(() => { document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr' }, [lang])

  // Global reveal fallback: any .reveal element anywhere (e.g. the GLM invite CTA
  // outside the section refs) gets observed, so it can never stay stuck invisible.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target) } }) },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )
    const scan = () => document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { obs.disconnect(); mo.disconnect() }
  }, [])

  useEffect(() => {
    const saved = getStoredUserId()
    if (!saved) return
    // Verify the stored user still exists before auto-logging in
    fetch(`/api/auth/check?username=${encodeURIComponent(saved)}`)
      .then(r => r.json())
      .then(data => {
        if (data.exists) {
          setUserIdState(saved); setUserIdInput(saved); setView('dashboard'); fetchBoxes(saved)
        } else {
          clearStoredUser()
        }
      })
      .catch(() => clearStoredUser())
  }, [])

  const fetchBoxes = useCallback(async (uid?: string) => {
    const id = uid || userId
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/boxes?userId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (data.boxes) setBoxes(data.boxes)
    } catch { toast.error(t(lang, 'err.failedLoad')) }
    finally { setLoading(false) }
  }, [userId])

  const handleRegister = async () => {
    const id = userIdInput.trim()
    if (!id) { toast.error(t(lang, 'err.enterUsername')); return }
    setRegisterLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id }),
      })
      const data = await res.json()
      if (data.errorType === 'exists') {
        setView('login'); setLoginUsernameInput(id)
        setRegisterLoading(false)
        toast.info(t(lang, 'err.alreadyExists'))
        return
      }
      if (data.error) { toast.error(data.error); setRegisterLoading(false); return }
      // New user created — show mandatory full-page token intro
      setUserIdState(id); setStoredUserId(id); setBoxes([]); setSelectedBox(null)
      setSavedLoginToken(data.loginToken)
      setView('login-token')
    } catch { toast.error(t(lang, 'err.regFailed')) }
    finally { setRegisterLoading(false) }
  }

  const handleLogin = async () => {
    const username = loginUsernameInput.trim()
    const token = loginTokenInput.trim()
    if (!username || !token) { toast.error(t(lang, 'err.userTokenRequired')); return }
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
      toast.success(t(lang, 'err.welcomeBack', { username }))
    } catch { toast.error(t(lang, 'err.loginFailed')) }
    finally { setLoginLoading(false) }
  }

  const handleLogout = () => {
    setUserIdState(''); setUserIdInput(''); setBoxes([]); setSelectedBox(null)
    setLoginUsernameInput(''); setLoginTokenInput(''); setSavedLoginToken('')
    clearStoredUser(); setView('landing')
  }

  const handleCreateBox = async () => {
    if (!boxName.trim()) { toast.error(t(lang, 'err.enterName')); return }
    setCreateBoxLoading(true)
    try {
      const res = await fetch('/api/boxes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boxName.trim(), userId }),
      })
      const data = await res.json()
      if (data.error) {
        if (data.error.includes('not found') || data.error.includes('register')) {
          toast.error(t(lang, 'err.sessionExpired'))
          clearStoredUser(); setUserIdState(''); setView('landing')
        } else {
          toast.error(data.error)
        }
        return
      }
      setBoxName(''); toast.success('MemBox created!'); fetchBoxes()
    } catch { toast.error(t(lang, 'err.createFailed')) }
    finally { setCreateBoxLoading(false) }
  }

  const handleDeleteBox = async (slug: string) => {
    if (!confirm(t(lang, 'err.deleteConfirm'))) return
    try {
      await fetch(`/api/boxes/${slug}`, { method: 'DELETE' })
      if (selectedBox?.slug === slug) setSelectedBox(null)
      toast.success(t(lang, 'err.deleted')); fetchBoxes()
    } catch { toast.error(t(lang, 'err.deleteFail')) }
  }

  const handleViewBox = async (box: MemBox) => {
    setSelectedBox(box); setDetailLoading(true); setUploadResults([])
    try {
      const res = await fetch(`/api/boxes/${box.slug}`)
      setBoxDetail(await res.json())
    } catch { toast.error(t(lang, 'err.failedLoadBox')) }
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
      if (data.uploaded > 0) toast.success(t(lang, 'err.uploaded', { count: data.uploaded }))
      if (data.failed > 0) toast.error(t(lang, 'err.uploadFailedCount', { count: data.failed }))
      handleViewBox(selectedBox); fetchBoxes()
    } catch { toast.error(t(lang, 'err.uploadFailed')) }
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
     NAV (shared)
     ════════════════════════════════════════════════ */
  const nav = (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${navScrolled ? 'glass-nav-scrolled border-b border-white/[0.08]' : 'glass border-b border-white/[0.06]'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer logo-hover" onClick={() => { if (userId) { setSelectedBox(null); setView('dashboard') } else { setView('landing') } }}>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/10 transition-all duration-300">
            <Brain className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-base tracking-tight">MemBox</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setLangMenuOpen(p => !p)} className="text-zinc-500 hover:text-zinc-200 text-xs h-8 px-2 gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{LANG_LABELS[lang]}</span>
            </Button>
            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl p-1 shadow-xl z-50">
                {(['en','ru','ka','ar','he'] as LangCode[]).map(l => (
                  <button key={l} onClick={() => { changeLang(l); setLangMenuOpen(false) }} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${lang === l ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'}`}>{LANG_LABELS[l]}</button>
                ))}
              </div>
            )}
          </div>
          {userId ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] font-bold text-emerald-400">{userId.charAt(0).toUpperCase()}</div>
                <span className="text-xs text-zinc-400 font-mono">{userId}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 hover:text-zinc-200 text-xs">
                {t(lang, 'nav.logout')}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView('login')} className="text-zinc-400 hover:text-zinc-100 text-xs">
                <LogIn className="h-3.5 w-3.5 mr-1" /> {t(lang, 'nav.login')}
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
    const heroMag = useMagnetic()
    const featuresRef = useReveal()
    const typesRef = useReveal()
    return (
      <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100" dir={isRTL(lang) ? 'rtl' : 'ltr'}>
        {nav}
        <main className="flex-1 flex flex-col">
          {/* Hero */}
          <section className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 glow-emerald" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-3xl float-orb" />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-emerald-500/[0.02] blur-3xl float-orb-slow" />
            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
              <div className="fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-400 mb-8 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  {t(lang, 'hero.badge')}
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 fade-in-up">
                {t(lang, 'hero.h1a')}
                <br />
                <span className="glow-text shimmer-text inline-block" style={{ position: 'relative', display: 'inline-block' }}>{t(lang, 'hero.h1b')}</span>
              </h1>
              <p className="text-base sm:text-lg text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed fade-in-up fade-in-delay-1">
                {t(lang, 'hero.desc')}
              </p>
              <div className="max-w-sm mx-auto fade-in-up fade-in-delay-2" ref={heroMag}>
                <div className="magnetic-btn flex gap-2 rounded-2xl">
                  <Input
                    placeholder={t(lang, 'hero.placeholder')}
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    className="bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-11 rounded-xl focus:border-emerald-500/50 apple-focus transition-all duration-300"
                  />
                  <Button onClick={handleRegister} disabled={registerLoading || !userIdInput.trim()} className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 h-11 px-6 rounded-xl font-medium disabled:opacity-50 transition-all duration-200 active:scale-95">
                    {registerLoading ? <div className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" /> : <>{t(lang, 'hero.start')} <ChevronRight className="h-4 w-4 ml-0.5" /></>}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-600 mt-3">{(() => { const hint = t(lang, 'hero.hint'); const hl = t(lang, 'hero.hintHighlight'); const idx = hint.indexOf(hl); if (idx === -1) return hint; return <>{hint.slice(0, idx)}<span className="text-amber-400/80" style={{ transition: 'color 0.3s' }}>{hl}</span>{hint.slice(idx + hl.length)}</>; })()}</p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16" ref={featuresRef}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Zap, tk: 'setup' },
                { icon: Terminal, tk: 'api' },
                { icon: Shield, tk: 'auth' },
                { icon: Upload, tk: 'upload' },
                { icon: HardDrive, tk: 'storage' },
                { icon: FolderOpen, tk: 'paths' },
              ].map((f, i) => (
                <div key={f.tk} className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 card-hover reveal reveal-delay-${Math.min(i, 5)}`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <f.icon className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200">{t(lang, 'feat.' + f.tk + '.title')}</h3>
                  </div>
                  <p className="text-[13px] text-zinc-500 leading-relaxed">{t(lang, 'feat.' + f.tk + '.desc')}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center reveal">
              <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">{t(lang, 'feat.fileTypes')}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {['PDF', 'Word', 'Excel', 'PowerPoint', 'CSV', 'JSON', 'YAML', 'Markdown', 'Images', 'Audio', 'Video', 'Archives', 'Code', 'Parquet', 'ONNX'].map((ft) => (
                  <span key={ft} className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-500 pill-lift cursor-default">{ft}</span>
                ))}
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 reveal" ref={typesRef}>
            <h2 className="text-center text-xs text-zinc-500 uppercase tracking-[0.2em] mb-10 font-medium">{t(lang, 'how.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['s1', 's2', 's3'].map((s, i) => (
                <div key={s} className={"relative reveal " + ("reveal-delay-" + (i + 1))}>
                  <div className="text-5xl font-black text-white/[0.03] absolute -top-3 -left-1 select-none" style={{ fontFamily: 'system-ui' }}>{t(lang, `how.${s}num`)}</div>
                  <div className="relative pt-8 pl-1">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">{t(lang, `how.${s}title`)}</h3>
                    <p className="text-[13px] text-zinc-500 leading-relaxed">{t(lang, `how.${s}desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20" ref={typesRef}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { val: t(lang, 'stat.free'), desc: t(lang, 'stat.freeDesc'), accent: true },
                { val: t(lang, 'stat.files'), desc: t(lang, 'stat.filesDesc') },
                { val: t(lang, 'stat.unlimited'), desc: t(lang, 'stat.unlimitedDesc') },
                { val: t(lang, 'stat.setup'), desc: t(lang, 'stat.setupDesc') },
              ].map((s, i) => (
                <div key={i} className={"rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center card-hover reveal " + (i < 5 ? "reveal-delay-" + (i + 1) : "")}>
                  <div className={"text-lg font-bold mb-1 " + (s.accent ? 'glow-text' : 'text-zinc-200')}>{s.val}</div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Agent Compatibility */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 text-center reveal">
            <h2 className="text-base sm:text-lg font-bold tracking-tight mb-2">{t(lang, 'agents.title')}</h2>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto mb-8">{t(lang, 'agents.desc')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Claude Code', 'Cursor', 'Cline', 'GPT Agents', 'LangChain', 'CrewAI', 'AutoGen', 'MCP', 'Codex CLI', 'Any HTTP Client'].map((agent) => (
                <span key={agent} className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 pill-lift cursor-default font-medium">{agent}</span>
              ))}
            </div>
          </section>

          {/* Code Preview */}
          <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-20 text-center reveal">
            <h2 className="text-base sm:text-lg font-bold tracking-tight mb-2">{t(lang, 'code.title')}</h2>
            <p className="text-sm text-zinc-500 mb-6">{t(lang, 'code.desc')}</p>
            <div className="text-left">
              <CodeBlock
                lang={lang}
                language="bash"
                code={`# Store a memory
curl -X PUT https://membox.space-z.ai/api/m/YOUR-SLUG/user-preference \
  -H "Authorization: Bearer YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "User prefers TypeScript and dark mode"}'

# Read it back
curl https://membox.space-z.ai/api/m/YOUR-SLUG/user-preference \
  -H "Authorization: Bearer YOUR-TOKEN"`}
              />
            </div>
          </section>

          <div className="reveal"><GLMInviteCTA lang={lang} /></div>
        </main>
        <CreditFooter lang={lang} />
        <Toaster richColors position="bottom-right" />
      </div>
    )
  }

  /* ════════════════════════════════════════════════
     VIEW: LOGIN / SIGN UP
     ════════════════════════════════════════════════ */
  if (view === 'login') {
    return (
      <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100" dir={isRTL(lang) ? 'rtl' : 'ltr'}>
        {nav}
        <main className="flex-1 flex items-center justify-center p-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] blur-3xl" />
          <div className="relative w-full max-w-sm fade-in-up">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              {/* Tab switcher */}
              <div className="flex border-b border-white/[0.06]">
                <button
                  onClick={() => setLoginTab('login')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${loginTab === 'login' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  <LogIn className="h-4 w-4" />
                  {t(lang, 'login.tab')}
                  {loginTab === 'login' && <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />}
                </button>
                <button
                  onClick={() => setLoginTab('signup')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors relative ${loginTab === 'signup' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  <UserPlus className="h-4 w-4" />
                  {t(lang, 'signup.tab')}
                  {loginTab === 'signup' && <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />}
                </button>
              </div>

              <div className="p-8">
                {loginTab === 'login' ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 border border-emerald-500/10">
                        <LogIn className="h-5 w-5 text-emerald-400" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{t(lang, 'login.welcome')}</h2>
                      <p className="text-xs text-zinc-500 mt-1">{t(lang, 'login.subtitle')}</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-zinc-500">{t(lang, 'login.username')}</Label>
                        <Input
                          placeholder={t(lang, 'login.usernamePh')}
                          value={loginUsernameInput}
                          onChange={(e) => setLoginUsernameInput(e.target.value)}
                          className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-10 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">{t(lang, 'login.token')}</Label>
                        <Input
                          placeholder={t(lang, 'login.tokenPh')}
                          value={loginTokenInput}
                          onChange={(e) => setLoginTokenInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-10 rounded-xl font-mono text-xs"
                        />
                      </div>
                      <Button onClick={handleLogin} disabled={loginLoading || !loginUsernameInput.trim() || !loginTokenInput.trim()} className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-medium h-11 rounded-xl mt-2">
                        {loginLoading ? t(lang, 'login.loggingIn') : t(lang, 'login.btn')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 border border-emerald-500/10">
                        <UserPlus className="h-5 w-5 text-emerald-400" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{t(lang, 'signup.create')}</h2>
                      <p className="text-xs text-zinc-500 mt-1">{t(lang, 'signup.subtitle')}</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-zinc-500">{t(lang, 'signup.username')}</Label>
                        <Input
                          placeholder={t(lang, 'signup.usernamePh')}
                          value={userIdInput}
                          onChange={(e) => setUserIdInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                          className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 h-10 rounded-xl"
                        />
                      </div>
                      <Button onClick={handleRegister} disabled={registerLoading || !userIdInput.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium h-11 rounded-xl">
                        {registerLoading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <>{t(lang, 'signup.btn')} <ChevronRight className="h-4 w-4 ml-1" /></>}
                      </Button>
                      <p className="text-[11px] text-zinc-600 leading-relaxed text-center">{(() => { const h = t(lang, 'signup.hint'); const hl = t(lang, 'signup.hintHighlight'); const idx = h.indexOf(hl); if (idx === -1) return h; return <>{h.slice(0, idx)}<span className="text-amber-400/80">{hl}</span>{h.slice(idx + hl.length)}</>; })()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        <CreditFooter lang={lang} />
        <Toaster richColors position="bottom-right" />
      </div>
    )
  }

  /* ════════════════════════════════════════════════
     VIEW: LOGIN TOKEN INTRO (mandatory after registration)
     ════════════════════════════════════════════════ */
  if (view === 'login-token') {
    return (
      <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100" dir={isRTL(lang) ? 'rtl' : 'ltr'}>
        {nav}
        <main className="flex-1 flex items-center justify-center p-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/[0.03] blur-3xl" />
          <div className="relative w-full max-w-lg fade-in-up">
            <LoginTokenModalContent
              userId={userId}
              token={savedLoginToken}
              onAcknowledge={() => { setView('dashboard'); toast.success(t(lang, 'err.welcome')) }}
              lang={lang}
            />
          </div>
        </main>
        <CreditFooter lang={lang} />
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
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100" dir={isRTL(lang) ? 'rtl' : 'ltr'}>
      {nav}
      <main className="flex-1">
        {!activeBox ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Create */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-8 fade-in">
              <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
                <Plus className="h-4 w-4 text-emerald-400" /> {t(lang, 'dash.createTitle')}
              </h2>
              <p className="text-xs text-zinc-500 mb-4">{t(lang, 'dash.createDesc')}</p>
              <div className="flex gap-3">
                <Input
                  placeholder={t(lang, 'dash.createPh')}
                  value={boxName} onChange={(e) => setBoxName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBox()}
                  className="bg-white/[0.04] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 rounded-xl"
                />
                <Button onClick={handleCreateBox} disabled={!boxName.trim() || createBoxLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium whitespace-nowrap">
                  {createBoxLoading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> {t(lang, 'dash.createBtn')}</>}
                </Button>
              </div>
            </div>

            <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{t(lang, 'dash.yourBoxes')} ({boxes.length})</h3>

            {loading ? (
              <div className="text-center py-16 text-zinc-600 text-sm">{t(lang, 'dash.loading')}</div>
            ) : boxes.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.06]">
                <Box className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-600 text-sm">{t(lang, 'dash.noBoxes')}</p>
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
                      <div className="flex justify-between"><span className="text-zinc-600">{t(lang, 'dash.slug')}</span><code className="text-emerald-400/70 font-mono">{box.slug}</code></div>
                      <div className="flex justify-between"><span className="text-zinc-600">{t(lang, 'dash.files')}</span><span className="text-zinc-500">{box.fileCount || 0}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-600">{t(lang, 'dash.size')}</span><span className="text-zinc-500">{formatBytes(box.totalSize || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-600">{t(lang, 'dash.created')}</span><span className="text-zinc-500">{new Date(box.createdAt).toLocaleDateString()}</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-1 text-xs text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                      {t(lang, 'dash.viewDetails')} <ChevronRight className="h-3 w-3" />
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
              <ChevronRight className="h-4 w-4 rotate-180" /> {t(lang, 'detail.back')}
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
                      <Label className="text-[10px] text-zinc-600 uppercase tracking-widest">{t(lang, 'detail.endpoint')}</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-[11px] text-emerald-400/80 font-mono bg-black/30 px-2 py-1 rounded-lg flex-1 truncate">{getBaseUrl()}/api/m/{activeBox.slug}/...</code>
                        <CopyBtn text={`${getBaseUrl()}/api/m/${activeBox.slug}/`} lang={lang} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-zinc-600 uppercase tracking-widest">{t(lang, 'detail.token')}</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-[11px] text-amber-400/80 font-mono bg-black/30 px-2 py-1 rounded-lg flex-1 truncate">
                          {showToken[activeBox.id] ? activeBox.token : '••••••••••••••' + activeBox.token.slice(-6)}
                        </code>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowToken((p) => ({ ...p, [activeBox.id]: !p[activeBox.id] }))}><Eye className="h-3 w-3 text-zinc-600" /></Button>
                        <CopyBtn text={activeBox.token} lang={lang} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-zinc-600 uppercase tracking-widest">{t(lang, 'detail.slug')}</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-[11px] text-zinc-500 font-mono bg-black/30 px-2 py-1 rounded-lg flex-1 truncate">{activeBox.slug}</code>
                        <CopyBtn text={activeBox.slug} lang={lang} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Upload className="h-4 w-4 text-emerald-400" /> {t(lang, 'detail.uploadTitle')}</h3>
                  <p className="text-[11px] text-zinc-600 mb-3">{t(lang, 'detail.uploadDesc')}</p>
                  <Input placeholder={t(lang, 'detail.folderPh')} value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="bg-black/30 border-white/[0.06] text-zinc-100 placeholder:text-zinc-700 text-xs h-8 rounded-lg mb-3" />
                  <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragOver ? 'border-emerald-400/50 bg-emerald-500/[0.03]' : 'border-white/[0.08] hover:border-white/[0.12]'}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2"><div className="h-7 w-7 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /><span className="text-[11px] text-zinc-500">{t(lang, 'detail.uploading')}</span></div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload className={`h-5 w-5 ${dragOver ? 'text-emerald-400' : 'text-zinc-600'}`} />
                        <p className="text-[11px] text-zinc-500"><span className="text-emerald-400 font-medium">{t(lang, 'detail.clickOrDrop')}</span> {t(lang, 'detail.orDrag')}</p>
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

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className="text-xl font-bold text-emerald-400">{boxDetail?.fileCount || 0}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{t(lang, 'detail.items')}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className="text-xl font-bold text-emerald-400">{formatBytes(boxDetail?.totalSize || 0)}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{t(lang, 'detail.totalSize')}</div>
                  </div>
                </div>

                <Button variant="destructive" className="w-full rounded-xl" onClick={() => handleDeleteBox(activeBox.slug)}>
                  <Trash2 className="h-4 w-4 mr-2" /> {t(lang, 'detail.deleteBox')}
                </Button>
              </div>

              {/* Right: File Browser + Code */}
              <div className="lg:col-span-2 space-y-5">
                {/* File Browser - full width */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><FolderOpen className="h-4 w-4 text-emerald-400" /> {t(lang, 'detail.fileBrowser')}</h3>
                  <FileBrowser slug={activeBox.slug} token={activeBox.token} onRefresh={() => handleViewBox(activeBox)} lang={lang} />
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-1"><Terminal className="h-4 w-4 text-emerald-400" /> {t(lang, 'detail.apiUsage')}</h3>
                  <p className="text-xs text-zinc-500 mb-4">{t(lang, 'detail.apiDesc')}</p>
                  <Tabs defaultValue="curl" className="w-full">
                    <TabsList className="bg-black/30 border-white/[0.06] w-full justify-start rounded-xl">
                      <TabsTrigger value="curl" className="text-xs rounded-lg">curl</TabsTrigger>
                      <TabsTrigger value="python" className="text-xs rounded-lg">Python</TabsTrigger>
                      <TabsTrigger value="node" className="text-xs rounded-lg">Node.js</TabsTrigger>
                      <TabsTrigger value="mcp" className="text-xs rounded-lg">MCP / Agent</TabsTrigger>
                    </TabsList>
                    <TabsContent value="curl" className="mt-4"><CodeBlock code={snippets?.curl || ''} language="bash" lang={lang} /></TabsContent>
                    <TabsContent value="python" className="mt-4"><CodeBlock code={snippets?.python || ''} language="python" lang={lang} /></TabsContent>
                    <TabsContent value="node" className="mt-4"><CodeBlock code={snippets?.node || ''} language="javascript" lang={lang} /></TabsContent>
                    <TabsContent value="mcp" className="mt-4"><CodeBlock code={snippets?.mcp || ''} language="text" lang={lang} /></TabsContent>
                  </Tabs>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4"><Key className="h-4 w-4 text-emerald-400" /> {t(lang, 'detail.apiRef')}</h3>
                  <div className="space-y-3">
                    {[
                      { method: 'GET', path: '/api/m/{slug}', desc: t(lang, 'api.getSlug'), color: 'text-emerald-400' },
                      { method: 'GET', path: '/api/m/{slug}/{path}', desc: t(lang, 'api.getPath'), color: 'text-emerald-400' },
                      { method: 'PUT', path: '/api/m/{slug}/{path}', desc: t(lang, 'api.putPath'), color: 'text-amber-400' },
                      { method: 'POST', path: '/api/m/{slug}/{path}', desc: t(lang, 'api.postPath'), color: 'text-sky-400' },
                      { method: 'POST', path: '/api/m/{slug}/upload', desc: t(lang, 'api.postUpload'), color: 'text-violet-400' },
                      { method: 'GET', path: '/api/m/{slug}/files/{path}', desc: t(lang, 'api.getFiles'), color: 'text-emerald-400' },
                      { method: 'DELETE', path: '/api/m/{slug}/{path}', desc: t(lang, 'api.deletePath'), color: 'text-red-400' },
                    ].map((ep) => (
                      <div key={ep.method + ep.path} className="flex gap-3 items-start">
                        <span className={`text-[11px] font-mono font-bold ${ep.color} min-w-[40px] pt-0.5`}>{ep.method}</span>
                        <div><code className="text-[11px] font-mono text-zinc-400">{ep.path}</code><p className="text-[11px] text-zinc-600 mt-0.5">{ep.desc}</p></div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-white/[0.04] space-y-2">
                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        <span className="text-zinc-400 font-medium">{t(lang, 'api.auth')}</span> <code className="text-zinc-400">Authorization: Bearer {'<token>'}</code> or <code className="text-zinc-400">X-MemBox-Token</code> header. Browser downloads: <code className="text-zinc-400">?token={'<token>'}</code> query param.
                      </p>
                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        <span className="text-zinc-400 font-medium">{t(lang, 'api.uploadTypes')}</span> .pdf .doc .docx .xls .xlsx .ppt .pptx .csv .json .yaml .xml .sql .png .jpg .gif .webp .svg .mp3 .mp4 .wav .zip .tar .gz .parquet .onnx .py .js .ts .go .rs and 100+ more.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <CreditFooter lang={lang} />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
