import { NextRequest, NextResponse } from 'next/server'
import { authenticate, rateLimitByKey, recordAnalytics, requireWriteAccess } from '@/lib/auth'
import { createSnapshot, listSnapshots, deleteSnapshot, getSnapshot } from '@/lib/snapshot'
import { getBoxPath, getFilePath, writeFileContent, readFileContent, ensureBoxDir } from '@/lib/storage'
import { promises as fs } from 'fs'
import path from 'path'
import { db } from '@/lib/db'

// POST /api/m/[slug]/_snapshots — Create a snapshot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error: rlError } = rateLimitByKey(slug)
  if (rlError) return rlError

  const { error, box } = await requireWriteAccess(req, slug)
  if (error) return error

  try {
    const body = await req.json().catch(() => ({}))
    const snapshot = await createSnapshot(box!.id, slug, body.label)
    await recordAnalytics(box!.id, slug, 'SNAPSHOT_CREATE', 200, req)
    return NextResponse.json(snapshot)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/m/[slug]/_snapshots — List snapshots
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { error, box } = await authenticate(req, slug)
  if (error) return error

  try {
    const snapshots = await listSnapshots(box!.id)
    // Don't return the full data blob in listing
    const list = snapshots.map(s => ({ id: s.id, label: s.label, createdAt: s.createdAt }))
    await recordAnalytics(box!.id, slug, 'SNAPSHOT_LIST', 200, req)
    return NextResponse.json({ snapshots: list })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
