import { PrismaClient } from '@prisma/client'

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

// Serverless environments (e.g. Vercel) get a fresh filesystem per instance,
// so the SQLite schema is applied lazily on first use instead of at deploy time.
async function bootstrapSchema(): Promise<void> {
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
  for (const statement of ddl) {
    await db.$executeRawUnsafe(statement)
  }
}

export function ensureSchema(): Promise<void> {
  globalForPrisma.prismaBootstrap ??= bootstrapSchema().catch(err => {
    globalForPrisma.prismaBootstrap = undefined
    throw err
  })
  return globalForPrisma.prismaBootstrap
}
