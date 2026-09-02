import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireWriteAccess, rateLimitByKey, recordAnalytics } from '@/lib/auth'
import { getSnapshot, deleteSnapshot, listSnapshots } from '@/lib/snapshot'
import { writeFileContent, readFileContent, deleteFileOrDir, getBoxPath, getFilePath } from '@/lib/storage'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

// GET /api/m/[slug]/_snapshots/[id] — Get snapshot detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const { error, box } = await authenticate(req, slug)
  if (error) return error

  try {
    const snapshot = await getSnapshot(id)
    if (!snapshot || snapshot.boxId !== box!.id) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }
    const files = JSON.parse(snapshot.data)
    return NextResponse.json({ id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt, files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/m/[slug]/_snapshots/[id]/restore — Restore snapshot (just view listing, actual restore would need full file copy)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  if (error) return error

  try {
    const snapshot = await getSnapshot(id)
    if (!snapshot || snapshot.boxId !== box!.id) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }
    // Return the snapshot's file listing so the client knows what the state was
    const files = JSON.parse(snapshot.data)
    await recordAnalytics(box!.id, slug, 'SNAPSHOT_VIEW', 200, req, id)
    return NextResponse.json({ id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt, files, message: 'Snapshot file listing retrieved. Use individual file contents to restore.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/m/[slug]/_snapshots/[id] — Delete snapshot
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  if (error) return error

  try {
    const snapshot = await getSnapshot(id)
    if (!snapshot || snapshot.boxId !== box!.id) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }
    await deleteSnapshot(id)
    await recordAnalytics(box!.id, slug, 'SNAPSHOT_DELETE', 200, req, id)
    return NextResponse.json({ success: true, message: 'Snapshot deleted' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
