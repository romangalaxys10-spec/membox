import { promises as fs } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { githubStorageEnabled, ghGetFile, ghPutFile } from './github-store'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaBootstrap: Promise<void> | undefined
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

const REMOTE_DB_PATH = 'db/custom.db'

function localDbPath(): string | null {
  const url = process.env.DATABASE_URL || ''
  if (!url.startsWith('file:')) return null
  return path.resolve(url.slice('file:'.length))
}

// Checkpoint the SQLite file into the repo so box/token records survive
// serverless instance recycling. Awaited by mutation routes (serverless freezes
// background timers after the response) with in-flight dedup.
// Freshness gate: each checkpoint records its mutation timestamp in
// db/checkpoint.json; an instance holding a stale DB copy must not clobber a
// newer checkpoint written by another instance.
const REMOTE_MARKER_PATH = 'db/checkpoint.json'
const globalForDb = globalThis as unknown as { dbCheckpoint: Promise<void> | null }
let pendingCheckpointAt: string | null = null

async function uploadCheckpoint(atIso: string): Promise<void> {
  try {
    const markerRaw = await ghGetFile(REMOTE_MARKER_PATH)
    if (markerRaw) {
      try {
        const remoteAt = (JSON.parse(markerRaw.toString('utf-8')) as { at?: string }).at
        if (remoteAt && remoteAt > atIso) return // a newer checkpoint exists — do not clobber
      } catch { /* malformed marker — overwrite */ }
    }
    const local = localDbPath()
    if (!local) return
    // Prisma runs SQLite in WAL mode: committed rows may live in the -wal
    // journal, so upload it (and -shm) alongside the main file. On restore the
    // journal is written back before any connection opens and SQLite recovers.
    await ghPutFile(REMOTE_DB_PATH, await fs.readFile(local), 'membox: sqlite checkpoint')
    for (const suffix of ['-wal', '-shm']) {
      try {
        await ghPutFile(REMOTE_DB_PATH + suffix, await fs.readFile(local + suffix), `membox: sqlite checkpoint${suffix}`)
      } catch { /* journal sidecar absent — fine */ }
    }
    await ghPutFile(REMOTE_MARKER_PATH, Buffer.from(JSON.stringify({ at: atIso }), 'utf-8'), 'membox: checkpoint marker')
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

// Serverless environments (e.g. Vercel) get a fresh filesystem per instance.
// On first use: restore the DB from the repo if this instance has none, apply
// the schema, and arm checkpoint uploads after mutations.
async function bootstrapSchema(): Promise<void> {
  const local = localDbPath()
  let restored = false
  if (githubStorageEnabled && local) {
    try {
      const exists = await fs.access(local).then(() => true, () => false)
      const buf = exists ? null : await ghGetFile(REMOTE_DB_PATH)
      if (buf) {
        await fs.mkdir(path.dirname(local), { recursive: true })
        await fs.writeFile(local, buf)
        // Restore WAL sidecars (if any) BEFORE the first connection opens
        for (const suffix of ['-wal', '-shm']) {
          try {
            const side = await ghGetFile(REMOTE_DB_PATH + suffix)
            if (side) await fs.writeFile(local + suffix, side)
          } catch { /* absent — fine */ }
        }
        restored = true
      }
    } catch {
      /* restore is best-effort */
    }
  }

  const ddl = [
    `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL UNIQUE, "loginToken" TEXT NOT NULL UNIQUE, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "MemBox" ("id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "token" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "Snapshot" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "label" TEXT, "data" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Snapshot_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Webhook" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "url" TEXT NOT NULL, "events" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Webhook_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "ShareToken" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "token" TEXT NOT NULL UNIQUE, "permission" TEXT NOT NULL DEFAULT 'read', "label" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" DATETIME, CONSTRAINT "ShareToken_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "TtlEntry" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "filePath" TEXT NOT NULL, "ttlSeconds" INTEGER NOT NULL, "expiresAt" DATETIME NOT NULL, CONSTRAINT "TtlEntry_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "AnalyticsEvent" ("id" TEXT NOT NULL PRIMARY KEY, "boxId" TEXT NOT NULL, "slug" TEXT NOT NULL, "method" TEXT NOT NULL, "path" TEXT, "statusCode" INTEGER NOT NULL, "ip" TEXT, "userAgent" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AnalyticsEvent_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MemBox" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TtlEntry_boxId_filePath_key" ON "TtlEntry"("boxId", "filePath")`,
  ]
  // Column additions for older databases (no-op when they already exist)
  const columnAdds = [
    `ALTER TABLE "User" ADD COLUMN "githubRepo" TEXT`,
    `ALTER TABLE "User" ADD COLUMN "githubTokenEnc" TEXT`,
  ]
  for (const statement of [...ddl, ...columnAdds]) {
    try {
      await db.$executeRawUnsafe(statement)
    } catch (err) {
      if (!(err instanceof Error) || !/duplicate column|already exists/i.test(err.message)) throw err
    }
  }

  // Note: no checkpoint upload here — every cold instance re-uploading would
  // stampede and clobber the latest checkpoint. Only mutation routes upload.
}

export function ensureSchema(): Promise<void> {
  globalForPrisma.prismaBootstrap ??= bootstrapSchema().catch(err => {
    globalForPrisma.prismaBootstrap = undefined
    throw err
  })
  return globalForPrisma.prismaBootstrap
}

// Call (and await) after any mutation (user/box creation) to persist the DB.
export async function persistDb(): Promise<void> {
  if (!githubStorageEnabled) return
  await scheduleCheckpoint()
}
