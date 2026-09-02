import { db } from './db'
import { listBoxFiles, getBoxPath, getFilePath, writeFileContent, readFileContent, ensureBoxDir } from './storage'
import { promises as fs } from 'fs'
import path from 'path'

// Create a snapshot of a box's current state
export async function createSnapshot(boxId: string, slug: string, label?: string) {
  const files = await listBoxFiles(slug)
  const boxPath = getBoxPath(slug)

  // Gather file listing with sizes
  const fileList: { name: string; type: string; size?: number; modified?: string }[] = []
  async function walk(dir: string, prefix: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          fileList.push({ name: relPath, type: 'directory' })
          await walk(fullPath, relPath)
        } else {
          const stat = await fs.stat(fullPath)
          fileList.push({ name: relPath, type: 'file', size: stat.size, modified: stat.mtime.toISOString() })
        }
      }
    } catch { /* skip */ }
  }
  await walk(boxPath, '')

  const data = JSON.stringify(fileList)
  const snapshot = await db.snapshot.create({
    data: { boxId, label: label || `Snapshot ${new Date().toISOString().slice(0, 19)}`, data },
  })

  return { id: snapshot.id, label: snapshot.label, fileCount: fileList.length, createdAt: snapshot.createdAt }
}

// List snapshots for a box
export async function listSnapshots(boxId: string) {
  return db.snapshot.findMany({
    where: { boxId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, createdAt: true, data: true },
  })
}

// Get a specific snapshot
export async function getSnapshot(snapshotId: string) {
  return db.snapshot.findUnique({ where: { id: snapshotId } })
}

// Delete a snapshot
export async function deleteSnapshot(snapshotId: string) {
  return db.snapshot.delete({ where: { id: snapshotId } })
}
