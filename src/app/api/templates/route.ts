import { NextResponse } from 'next/server'

const TEMPLATES = [
  {
    name: 'Claude Code',
    description: 'Pre-configured paths for Claude Code agent sessions',
    paths: ['context/', 'state/', 'workspace/', 'workspace/code/', 'workspace/output/'],
  },
  {
    name: 'Cline',
    description: 'Optimized structure for Cline AI coding assistant',
    paths: ['context/', 'task/', 'workspace/', 'history/'],
  },
  {
    name: 'RAG Pipeline',
    description: 'Organized for Retrieval-Augmented Generation workflows',
    paths: ['documents/', 'embeddings/', 'chunks/', 'metadata/'],
  },
  {
    name: 'Multi-Agent',
    description: 'Shared memory pool for multiple collaborating agents',
    paths: ['shared/', 'agent-1/', 'agent-2/', 'agent-3/', 'coordinator/'],
  },
  {
    name: 'Project Memory',
    description: 'General project knowledge base structure',
    paths: ['requirements/', 'design/', 'meetings/', 'decisions/', 'archive/'],
  },
]

// GET /api/templates — List available templates
export async function GET() {
  return NextResponse.json({ templates: TEMPLATES })
}
