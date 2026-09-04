import { promises as fs } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { githubStorageEnabled } from './github-store'

const REMOTE_DB_PATH = 'db/custom.db'
const REMOTE_MARKER_PATH = 'db/checkpoint.json'

// The DB file lives on an ephemeral disk and can go stale while a serverless
// instance stays warm. `db` is therefore a Proxy around the *current* client:
// when a newer checkpoint is detected, we download the DB to a fresh file,
// open a new PrismaClient on it, and swap the holder atomically. In-flight
// queries on the old client finish against the old (still-present) file.
const holder: { client: PrismaClient; localPath: string; appliedAt: string } = {
  client: new PrismaClient(),
  localPath: '',
  appliedAt: new Date(0).toISOString(),
}
// keep a reference so the initial env-based client is never GC'd mid-query
void holder.client

let seq = 0

function defaultLocalPath(): string {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('file:') ? path.resolve(url.slice('file:'.length)) : ''
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}
holder.localPath = defaultLocalPath()

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop, recv) {
    const v = Reflect.get(holder.client as object, prop, holder.client)
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(holder.client) : v
  },
}) as PrismaClient

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaBootstrap: Promise<void> | undefined
  refreshLock: Promise<void> | undefined
  lastMarkerCheck: number
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

const SCHEMA_DDL = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL UNIQUE, "loginToken" TEXT NOT NULL UNIQUE, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "MemBox" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "token" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Snapshot" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "label" TEXT, "data" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Snapshot_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Webhook" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "url" TEXT NOT NULL, "events" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Webhook_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "ShareToken" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "token" TEXT NOT NULL UNIQUE, "permission" TEXT NOT NULL DEFAULT 'read', "label" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" DATETIME, CONSTRAINT "ShareToken_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "TtlEntry" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "filePath" TEXT NOT NULL, "ttlSeconds" INTEGER NOT NULL, "expiresAt" DATETIME NOT NULL, CONSTRAINT "TtlEntry_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "AnalyticsEvent" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "slug" TEXT NOT NULL, "method" TEXT NOT NULL, "path" TEXT, "statusCode" INTEGER NOT NULL, "ip" TEXT, "userAgent" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AnalyticsEvent_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TtlEntry_boxId_filePath_key" ON "TtlEntry"("boxId", "filePath")`,
  `ALTER TABLE "User" ADD COLUMN "githubRepo" TEXT`,
  `ALTER TABLE "User" ADD COLUMN "githubTokenEnc" TEXT`,
]

async function applySchema(client: PrismaClient): Promise<void> {
  for (const statement of SCHEMA_DDL) {
    try {
      await client.$executeRawUnsafe(statement)
    } catch (err) {
      if (!(err instanceof Error) || !/duplicate column|already exists/i.test(err.message)) throw err
    }
  }
}

// ── GitHub storage client (checkpoint/restore only) ─────────────────────
// Self-contained on purpose: the security scanner requires the SSRF guards
// (fixed https host + allowlist, constant paths, no user input, redirects
// refused) to live in the same scope as the fetch calls. Only the two
// module-level REMOTE_* path constants are ever requested.
const GH_HOST = 'api.github.com'
const GH_REPO = process.env.GITHUB_STORAGE_REPO || ''
const GH_TOKEN = process.env.GITHUB_STORAGE_TOKEN || ''
const GH_BRANCH = process.env.GITHUB_STORAGE_BRANCH || 'main'
const GH_REPO_OK = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(GH_REPO)

function ghUrl(dbPath: string): URL {
  const p = dbPath.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  const url = new URL(`https://${GH_HOST}/repos/${GH_REPO}/contents/${p}`)
  url.searchParams.set('ref', GH_BRANCH)
  if (url.protocol !== 'https:' || url.hostname !== GH_HOST) throw new Error('Blocked non-allowlisted endpoint')
  return url
}

async function ghDbGet(dbPath: string): Promise<Buffer | null> {
  if (!GH_REPO_OK) return null
  const res = await fetch(ghUrl(dbPath), {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github.raw', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'error', cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub get failed (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

async function ghDbPut(dbPath: string, content: Buffer, message: string): Promise<void> {
  if (!GH_REPO_OK) throw new Error('storage not configured')
  for (let attempt = 0; ; attempt++) {
    const head = await fetch(ghUrl(dbPath), {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', cache: 'no-store',
    })
    if (!head.ok && head.status !== 404) throw new Error(`GitHub head failed (${head.status})`)
    const sha = head.status === 404 ? undefined : ((await head.json()).sha as string)
    const res = await fetch(ghUrl(dbPath), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', cache: 'no-store',
      body: JSON.stringify({ message, branch: GH_BRANCH, sha, content: content.toString('base64') }),
    })
    if (res.ok) return
    if ((res.status === 409 || res.status === 422) && attempt < 3) {
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)))
      continue
    }
    throw new Error(`GitHub put failed (${res.status})`)
  }
}

async function downloadDbTo(target: string): Promise<void> {
  assertSafeDbTarget(target)
  await fs.mkdir(path.dirname(target), { recursive: true })
  const buf = await ghDbGet(REMOTE_DB_PATH)
  if (!buf) throw new Error('no remote db')
  await fs.writeFile(target, buf)
  // A stale local WAL could corrupt the restored DB — remove it first, then
  // only adopt the remote journal when one actually exists.
  try { await fs.rm(target + '-wal', { force: true }) } catch { /* ignore */ }
  try { await fs.rm(target + '-shm', { force: true }) } catch { /* ignore */ }
  const wal = await ghDbGet(REMOTE_DB_PATH + '-wal')
  if (wal) await fs.writeFile(target + '-wal', wal)
}

async function readRemoteMarker(): Promise<string | null> {
  try {
    const raw = await ghDbGet(REMOTE_MARKER_PATH)
    if (!raw) return null
    return (JSON.parse(raw.toString('utf-8')) as { at?: string }).at || null
  } catch { return null }
}

// Serverless cold start: restore the DB from the repo if local disk is empty,
// then apply the schema.
async function bootstrapSchema(): Promise<void> {
  const local = holder.localPath || defaultLocalPath()
  holder.localPath = local
  if (githubStorageEnabled) {
    try {
      const exists = await fs.access(local).then(() => true, () => false)
      if (!exists) {
        await downloadDbTo(local)
        const marker = await readRemoteMarker()
        if (marker) holder.appliedAt = marker
      } else {
        const marker = await readRemoteMarker()
        if (marker) holder.appliedAt = marker
      }
    } catch { /* restore is best-effort */ }
  }
  await applySchema(holder.client)
}

export function ensureSchema(): Promise<void> {
  globalForPrisma.prismaBootstrap ??= bootstrapSchema().catch(err => {
    globalForPrisma.prismaBootstrap = undefined
    throw err
  })
  return globalForPrisma.prismaBootstrap
}

// Check (throttled) whether a newer DB checkpoint exists and hot-swap the
// client when this instance's copy is stale. Call at the top of request
// handling paths. Best-effort: on any failure the current client keeps serving.
async function refreshIfStale(): Promise<void> {
  if (!githubStorageEnabled) return
  const now = Date.now()
  globalForPrisma.lastMarkerCheck ??= 0
  if (now - globalForPrisma.lastMarkerCheck < 8000) return
  globalForPrisma.lastMarkerCheck = now

  const marker = await readRemoteMarker()
  if (!marker || marker <= holder.appliedAt) return

  seq += 1
  const target = path.join(path.dirname(holder.localPath), `membox-${seq}.db`)
  await downloadDbTo(target)
  const client = new PrismaClient({ datasources: { db: { url: `file:${target}` } } })
  await applySchema(client)
  holder.client = client
  holder.localPath = target
  holder.appliedAt = marker
}

export async function ensureFreshDb(): Promise<void> {
  await ensureSchema()
  if (globalForPrisma.refreshLock) return globalForPrisma.refreshLock
  globalForPrisma.refreshLock = refreshIfStale().catch(() => { /* best-effort */ }).finally(() => {
    globalForPrisma.refreshLock = undefined
  })
  return globalForPrisma.refreshLock
}

// Checkpoint the SQLite file into the repo (called after mutations).
// Freshness gate via the marker prevents stale instances from clobbering.
const globalForDb = globalThis as unknown as { dbCheckpoint: Promise<void> | null }
let pendingCheckpointAt: string | null = null

async function uploadCheckpoint(atIso: string): Promise<void> {
  try {
    const remoteAt = await readRemoteMarker()
    if (remoteAt && remoteAt > atIso) return // newer checkpoint exists — do not clobber
    const local = holder.localPath
    if (!local) return
    // WAL mode: upload the journal with the main file (never -shm; it is
    // machine-local and breaks recovery elsewhere).
    await ghDbPut(REMOTE_DB_PATH, await fs.readFile(local), 'membox: sqlite checkpoint')
    try {
      await ghDbPut(REMOTE_DB_PATH + '-wal', await fs.readFile(local + '-wal'), 'membox: sqlite checkpoint wal')
    } catch { /* journal absent — fine */ }
    await ghDbPut(REMOTE_MARKER_PATH, Buffer.from(JSON.stringify({ at: atIso }), 'utf-8'), 'membox: checkpoint marker')
    holder.appliedAt = atIso
  } catch {
    /* checkpoint is best-effort */
  }
}

function scheduleCheckpoint(): Promise<void> {
  pendingCheckpointAt ??= new Date().toISOString()
  const at = pendingCheckpointAt
  globalForDb.dbCheckpoint ??= uploadCheckpoint(at).finally(() => {
    globalForDb.dbCheckpoint = null
    if (pendingCheckpointAt === at) pendingCheckpointAt = null
  })
  return globalForDb.dbCheckpoint
}

// Call (and await) after any mutation (user/box creation) to persist the DB.
export async function persistDb(): Promise<void> {
  if (!githubStorageEnabled) return
  await scheduleCheckpoint()
}
