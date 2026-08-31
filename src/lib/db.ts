import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db