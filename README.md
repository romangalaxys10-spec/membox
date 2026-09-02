<div align="center">

<img src="https://img.shields.io/badge/Built%20With-Z.AI%20GLM%205%20Turbo-amber?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PHBhdGggZD0iTTIyIDJMMTIgN2wxMCA1LTEwIDV6Ii8+PC9zdmc+" alt="GLM 5 Turbo"/>

<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
<img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma"/>
<img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>

<a href="https://codetrendy.com/?utm_source=github.com&utm_medium=badge" target="_blank" rel="nofollow noopener noreferrer">
  <img src="https://codetrendy.com/api/badge?style=classic" alt="Profiled on CodeTrendy" height="54" />
</a>

<a href="https://sitepatent.com/?utm_source=github.com&utm_medium=badge" target="_blank" rel="nofollow noopener noreferrer">
  <img src="https://sitepatent.com/api/badge?style=classic" alt="Profiled on SitePatent" height="54" />
</a>

<a href="https://mediapronet.com/?utm_source=github.com&utm_medium=badge" target="_blank" rel="nofollow noopener noreferrer">
  <img src="https://mediapronet.com/api/badge?style=classic" alt="Profiled on MEDIAPRONET" height="54" />
</a>

<br/>
<br/>

<a href="https://membox.space-z.ai">
  <img src="https://img.shields.io/badge/Live Demo-membox.space--z.ai-emerald?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiLz48bGluZSB4MT0iMTIiIHkxPSIyIiB4Mj0iMTIiIHkyPSIyMiIvPjwvc3ZnPg==" alt="Live Demo"/>
</a>

<a href="https://membox-preview.vercel.app">
  <img src="https://img.shields.io/badge/Vercel Preview-membox--preview.vercel.app-black?style=for-the-badge&logo=vercel" alt="Vercel Preview"/>
</a>

<h1>MemBox</h1>

<p>
  <strong>Free, instant, persistent memory for AI agents.</strong><br/>
  Create a MemBox. Get an API endpoint + token. Let your AI tools remember anything.
</p>

</div>

## What is MemBox?

**MemBox is a free, persistent memory API for AI agents.** It gives AI coding assistants and autonomous agents — Claude Code, Cursor, Cline, GPT agents, LangChain, CrewAI, or any LLM-powered tool — long-term memory that survives across sessions. Create a MemBox, get a private API endpoint + token, and your agents can store, read, append, and search memories (text, JSON, documents, PDFs, codebases) over a simple REST API. No SDK, no database to run, no credit card — 100% free.

**Keywords:** AI agent memory · persistent memory for AI agents · long-term memory API · LLM memory store · Claude Code memory · Cursor agent memory · RAG file storage · free alternative to Mem0 and Zep · agent context persistence · MCP memory server

### Table of Contents

- [The Story](#the-story) · [Features](#-features) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Use With AI Agents](#-use-with-ai-agents) · [GitHub Brain Storage](#-github-brain-storage-alternative-storage-backend) · [FAQ](#-faq) · [How MemBox Compares](#-how-membox-compares) · [Tech Stack](#-tech-stack) · [Author](#-author) · [License](#-license)

---

## The Story

**MemBox was built in a single sitting by [Roman](https://rommark.dev) using [Z.AI's GLM 5 Turbo](https://z.ai/subscribe?ic=R0K78RJKNW)** — a frontier AI model so capable it turned a napkin idea into a production-ready SaaS in hours.

The concept was simple: *AI agents like Claude, GPT, and Cursor have no persistent memory. Every session starts from zero. What if there was a free, zero-config API where any agent could read and write memories — text, JSON, documents, entire codebases — and find them again next session?*

Roman gave that prompt to GLM 5 Turbo. The model didn't just write code — it **architected the entire system**: REST API design, file storage with path-traversal protection, multipart upload for 100+ file types, token auth, user accounts, drag-and-drop UI, and an Apple-inspired dark interface. Every layer, from Prisma schema to the pixel-perfect code snippet tabs, was generated and iterated through conversation with GLM 5 Turbo.

**No team. No investors. No meetings. One developer + one AI model = a complete product.**

That's the promise of GLM 5 Turbo — and MemBox is living proof.

> **👉 Want to build like this?** [Get GLM 5 Turbo with 10% OFF](https://z.ai/subscribe?ic=R0K78RJKNW) — full support for Claude Code, Cline, and 20+ coding tools, starting at just $18/month.

---

## ✨ Features

- **Instant Setup** — Pick a username, get your login token, create a MemBox. Under 5 seconds.
- **REST API** — Simple `PUT/GET/POST/DELETE`. Works with curl, Python, Node.js, any HTTP client.
- **File Upload (RAG-ready)** — PDF, Word, Excel, PowerPoint, images, audio, video, code, Parquet, ONNX — 100+ file types, up to 500 MB each.
- **Token Auth** — Each box gets a unique secret token. Only your tools can access it.
- **Path-Based Storage** — Organize in folders: `project/context`, `docs/reports`, `agent/state`.
- **1 MB Free Storage** — Every free MemBox includes 1 MB of storage. Need more? [Self-host](#-self-host) on your own infrastructure (free, MIT) or contact **rommark@gmx.com** for hosting provider recommendations.
- **Login System** — Username + login token for account recovery. Save it offline once.
- **Beautiful UI** — Dark theme, frosted glass, Apple/Dell-inspired design with drag-and-drop uploads.
- **Code Snippets** — One-click copy for curl, Python, Node.js, and MCP integration.

---

## 📦 Quick Start

### Try the Live Demo

→ **[membox.space-z.ai](https://membox.space-z.ai)**

1. Enter a username to register
2. **Save your login token offline** (shown once!)
3. Create a MemBox
4. Copy the API endpoint + token into your agent

Also available as a **[Vercel preview](https://membox-preview.vercel.app)** — fully functional, but stored data is ephemeral (serverless SQLite), so don't rely on it for real memories.

### Self-Host

```bash
git clone https://github.com/romangalaxys10-spec/membox.git
cd membox
npm install
npx prisma db push
npm run dev
```

Open `http://localhost:3000` and you're live.

---

## 💻 API Reference

Every MemBox gets a unique slug and token. All endpoints require auth via:

```
Authorization: Bearer <token>
```
or

```
X-MemBox-Token: <token>
```

Browser downloads also support `?token=<token>` query param.

### Store a Memory

```bash
curl -X PUT "https://membox.space-z.ai/api/m/{slug}/my-key" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "User prefers TypeScript and functional style"}'
```

### Read a Memory

```bash
curl "https://membox.space-z.ai/api/m/{slug}/my-key" \
  -H "Authorization: Bearer <token>"
```

### List All Items

```bash
curl "https://membox.space-z.ai/api/m/{slug}" \
  -H "Authorization: Bearer <token>"
```

### Upload Files

```bash
curl -X POST "https://membox.space-z.ai/api/m/{slug}/upload" \
  -H "Authorization: Bearer <token>" \
  -F "files=@document.pdf" \
  -F "files=@data.xlsx" \
  -F "folder=uploads"
```

### Download a File

```bash
curl -O -J "https://membox.space-z.ai/api/m/{slug}/files/uploads/document.pdf" \
  -H "Authorization: Bearer <token>"
```

### Append to a Memory

```bash
curl -X POST "https://membox.space-z.ai/api/m/{slug}/my-key" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Additional context to append"}'
```

### Delete a Memory or File

```bash
curl -X DELETE "https://membox.space-z.ai/api/m/{slug}/my-key" \
  -H "Authorization: Bearer <token>"
```

### Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/m/{slug}` | List all stored memories and files |
| `GET` | `/api/m/{slug}/{path}` | Read a text/JSON memory by path |
| `PUT` | `/api/m/{slug}/{path}` | Write (upsert) a text memory |
| `POST` | `/api/m/{slug}/{path}` | Append to an existing text memory |
| `POST` | `/api/m/{slug}/upload` | Upload files (multipart, max 500 MB/file) |
| `GET` | `/api/m/{slug}/files/{path}` | Download a file (raw bytes + MIME type) |
| `DELETE` | `/api/m/{slug}/{path}` | Delete a memory, file, or directory |

---

## 🤖 Use With AI Agents

### Claude Code / Cline

Add to your Claude Code or Cline settings:

```json
{
  "allowedTools": [{
    "name": "mcp__membox__read",
    "description": "Read agent memory from MemBox"
  }]
}
```

Then use the API directly in your prompts or CLAUDE.md:

```markdown
## Memory
Your persistent memory is at: https://membox.space-z.ai/api/m/{slug}/
Token: {your_token}

Before starting, read your context:
GET /api/m/{slug}/agent-context

After finishing, save your progress:
PUT /api/m/{slug}/agent-context
```

### Python Agent

```python
import requests

BASE = "https://membox.space-z.ai"
SLUG = "your-slug"
HEADERS = {"Authorization": "Bearer your-token"}

# Store context
requests.put(f"{BASE}/api/m/{SLUG}/context",
    headers=HEADERS, 
    json={"content": "Working on React + TypeScript project"})

# Read context
resp = requests.get(f"{BASE}/api/m/{SLUG}/context", headers=HEADERS)
print(resp.json())

# Upload a document
with open("requirements.pdf", "rb") as f:
    requests.post(f"{BASE}/api/m/{SLUG}/upload",
        headers=HEADERS,
        files={"files": ("requirements.pdf", f, "application/pdf")},
        data={"folder": "docs"})
```

### Node.js Agent

```javascript
const H = { Authorization: "Bearer your-token" };
const SLUG = "your-slug";
const BASE = "https://membox.space-z.ai";

// Store memory
await fetch(`${BASE}/api/m/${SLUG}/state`, {
  method: "PUT",
  headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({ content: "user prefers functional style" }),
});

// Read memory
const res = await fetch(`${BASE}/api/m/${SLUG}/state`, { headers: H });
const data = await res.json();
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix](https://www.radix-ui.com/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Database | [Prisma 7](https://www.prisma.io/) + SQLite |
| Storage | Path-based filesystem |
| Auth | Per-box token auth + user login tokens |
| AI Model | [Z.AI GLM 5 Turbo](https://z.ai/subscribe?ic=R0K78RJKNW) |

---

## 🌐 Supported File Types

**Documents:** PDF, DOC, DOCX, ODT, RTF, TXT, MD, EPUB

**Spreadsheets:** XLS, XLSX, ODS, CSV, TSV

**Presentations:** PPT, PPTX, ODP

**Data:** JSON, YAML, XML, SQL, Parquet, ONNX

**Images:** PNG, JPG, JPEG, GIF, WebP, SVG, BMP, TIFF, ICO

**Audio:** MP3, WAV, OGG, FLAC, AAC, M4A, WMA

**Video:** MP4, WebM, MKV, AVI, MOV, FLV, WMV

**Code:** PY, JS, TS, JSX, TSX, GO, RS, JAVA, C, CPP, RB, PHP, SWIFT

**Archives:** ZIP, TAR, GZ, 7Z, RAR, BZ2, XZ

...and 100+ more.

---

## 🧠 GitHub Brain Storage (Alternative Storage Backend)

MemBox ships with a **pluggable storage backend**. By default memories live on the local filesystem + SQLite — great for a VPS, but a problem on ephemeral serverless hosts (Vercel, Netlify) where the disk is wiped between deployments and instance restarts.

The **GitHub Brain Storage** backend solves this by using a **private GitHub repository as the durable storage layer**. MemBox on Vercel becomes a thin front-end; all data lives in your repo:

```
membox-brain/  (private repo)
├ boxes/
│  └ <box-slug>/
│     └ ...your memory files, folder structure preserved
└ db/
   ├ custom.db        # SQLite checkpoint (users, boxes, tokens, shares, TTLs)
   └ custom.db-wal    # WAL journal sidecar (uploaded with the checkpoint)
```

**How it works**

- **Memory writes** — every `PUT`/`POST`/upload is committed straight to the repo via the GitHub Contents API, with a descriptive commit message per change (`membox(<slug>): write <path>`). You get full git history: every memory change is diffable and revertible.
- **Account/box database** — after each user registration or box creation, MemBox checkpoints the SQLite database (plus its WAL journal) into `db/` in the repo. The upload is awaited in-request (serverless freezes background timers) with in-flight dedup.
- **Cold-start restore** — when a fresh serverless instance starts with an empty disk, it restores the database and reads memory files from the repo before serving its first request. Local files act only as a write-through cache.
- **Deletes** — propagate to the repo as deletion commits.

**Setup (env vars)**

| Variable | Required | Description |
|---|---|---|
| `GITHUB_STORAGE_REPO` | yes (for this backend) | Private repo in `owner/name` form, e.g. `yourname/membox-brain` |
| `GITHUB_STORAGE_TOKEN` | yes | GitHub token with repo contents read/write scope. **Set only as a secret env var — never commit it.** |
| `GITHUB_STORAGE_BRANCH` | no | Defaults to `main` |

If these are absent, MemBox transparently falls back to local filesystem storage (default self-host behavior).

**Properties & limits**

- ✅ Durable on serverless — survives instance recycling, deploys and restarts
- ✅ Full version history of every memory (git log / git revert as a free audit trail)
- ✅ Private by default — the repo is yours; tokens never leave server-side env vars
- ⚠️ **Not a vector database** — search is substring-based. Semantic/RAG search needs an embedding layer on top (roadmap).
- ⚠️ GitHub Contents API limits: ~5,000 requests/hour per token; files up to ~25 MB per commit are practical. Rate limit headers are honored per-box.
- ⚠️ Checkpoints are last-writer-wins: two instances committing a DB checkpoint in the same instant can race (acceptable for personal/light team use).

### Bring Your Own Repo (per-user pairing)

Users can go one step further and **pair their own private GitHub repo** — their boxes then store memories in *their* repo instead of the server's storage. MemBox never keeps the data; the user keeps full ownership, history and revocation control (delete the token on GitHub and access ends).

In the dashboard, the **GitHub Brain** card walks the user through:

1. [Create a fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with **Repository access → All repositories**, **Contents → Read and write**, and **Administration → Read and write** (MemBox creates your private brain repo for you). Copy the token (starts with `github_pat_`).
2. In the card, enter just a **repo name** (e.g. `my-membox-brain`) and paste the token — that's all. MemBox detects your GitHub username from the token, **creates the private repo if it doesn't exist**, and scaffolds the folder structure.
3. Done. The token is stored **AES-256-GCM encrypted** (`APP_SECRET` env var required on the server); the raw token is never logged or returned. Pairing state is kept as an encrypted file in the storage repo so every server instance sees it instantly.

Inside your repo, MemBox maintains a tidy layout — one folder per box, named after your box:

```
my-membox-brain/
└ membox/
   ├ README.md                  # auto-generated explainer
   ├ my-coding-agent-a1b2c3/    # one folder per MemBox (box name + short id)
   │  └ ...memory files
   └ writer-bot-9f8e7d/
      └ ...memory files
```

Every memory write is a git commit — browse or roll back your AI's memory history anytime.

Once paired, that user's memory writes, reads, uploads, deletes, listings and even search run against their repo. Unpairing from the card (or revoking the token on GitHub) stops all access.

**SSRF hardening** (`src/lib/github-store.ts`): requests are pinned to `https://api.github.com` via `new URL()` + allowlist checks, the repo slug must match `owner/name`, storage paths reject `..` segments, and redirects are refused.

## 📍 Architecture

```
MemBox/
├ src/
│  ├ app/
│  │  ├ page.tsx              # Single-page app (landing, login, intro, dashboard)
│  │  ├ layout.tsx            # Root layout with metadata
│  │  └ api/
│  │     ├ auth/
│  │     │  ├ register/route.ts  # POST - Create new user + login token
│  │     │  ├ login/route.ts     # POST - Verify username + login token
│  │     │  └ check/route.ts     # GET  - Check if username exists
│  │     ├ boxes/
│  │     │  ├ route.ts          # GET (list) + POST (create)
│  │     │  └ [slug]/route.ts   # GET (detail) + DELETE
│  │     └ m/
│  │        ├ [slug]/
│  │        │  ├ route.ts           # GET - List all items
│  │        │  ├ [...path]/route.ts # GET/PUT/POST/DELETE memories
│  │        │  ├ upload/route.ts    # POST - Multipart file upload
│  │        │  └ files/
│  │        │     └ [...path]/route.ts # GET - Download raw file
│  ├ lib/
│  │  ├ db.ts       # Prisma client singleton
│  │  ├ storage.ts  # File system: read/write/list/delete
│  │  ├ token.ts   # Generate slugs + tokens
│  │  └ utils.ts   # General utilities
│  ├ components/ui/  # shadcn/ui components
│  └ globals.css     # Tailwind + custom animations
├ prisma/
│  └ schema.prisma  # User + MemBox models
└ public/
└ next.config.ts
└ tailwind.config.ts
└ tsconfig.json
└ package.json
└ LICENSE (MIT)
└ README.md
```

---

## 🌟 Built With Z.AI GLM 5 Turbo

MemBox is a testament to what's possible when a skilled developer pairs with a truly capable AI model.

**Roman** — a full-stack developer and AI enthusiast ([rommark.dev](https://rommark.dev)) — conceived MemBox as a free alternative to paid agent memory services. Using [Z.AI's GLM 5 Turbo](https://z.ai/subscribe?ic=R0K78RJKNW) as his pair programmer, the entire project was designed, coded, and shipped in a single session.

GLM 5 Turbo didn't just autocomplete code. It:

- **Architected the REST API** — clean, intuitive, fully RESTful
- **Designed the data model** — Prisma schema with proper relations
- **Wrote the file storage engine** — with path-traversal protection and MIME detection
- **Built the entire UI** — a polished, Apple-inspired dark interface in a single `page.tsx`
- **Handled edge cases** — auth, error handling, race conditions, security
- **Iterated on design** — frosted glass, gradients, micro-animations, responsive layout

If you're a developer who wants to build at this speed, [try GLM 5 Turbo](https://z.ai/subscribe?ic=R0K78RJKNW) with 10% OFF using [this link](https://z.ai/subscribe?ic=R0K78RJKNW).

---

## ❓ FAQ

**What is persistent memory for AI agents?**
It's storage that lets an AI agent keep context — decisions, preferences, project state, documents — between sessions, instead of starting from zero every time. MemBox provides exactly this as a hosted REST API.

**Is MemBox really free?**
Every free MemBox includes 1 MB of storage. Need more? Either self-host MemBox on your own infrastructure (free under the MIT license) or contact **rommark@gmx.com** for hosting provider recommendations.

**How is MemBox different from a vector database?**
Vector DBs store embeddings for semantic search. MemBox stores *agent state*: exact memories, files, and documents addressable by path — like a tiny private cloud drive your agent can read and write. Use both together: MemBox for state, a vector DB for fuzzy retrieval.

**Which AI agents work with MemBox?**
Anything that can make HTTP calls: Claude Code, Cursor, Cline, Codex CLI, OpenClaw, LangChain, CrewAI, AutoGen, custom Python/Node agents, and MCP-compatible clients.

**Do I need an SDK?**
No. Plain REST — `PUT` to store, `GET` to read, `POST` to append, `DELETE` to remove. Copy-paste snippets for curl, Python, and Node.js are in the live UI.

**Can agents store files, not just text?**
Yes — up to 500 MB per file across 100+ types (PDF, DOCX, XLSX, images, audio, video, Parquet, ONNX, code files). Great for RAG pipelines that need source documents.

**Is my data private?**
Every box is protected by a unique secret token. Only holders of the token can read or write that box.

**Can I self-host MemBox?**
Yes — it's a single Next.js app with SQLite via Prisma. Clone, `npm install`, `npx prisma db push`, run. Full instructions in [Quick Start](#-quick-start).

---

## 📊 How MemBox Compares

| | **MemBox** | Mem0 | Zep | Redis | Plain vector DB |
|---|---|---|---|---|---|
| Price | **Free (1 MB included)** | Paid tiers | Paid tiers | Self-host cost | Self-host cost |
| Setup | **None — get a URL + token** | SDK + backend | SDK + backend | Run a server | Run a server + embedder |
| Stores files (PDF, video…) | ✅ 100+ types | Limited | Limited | ❌ | ❌ |
| Exact key/value agent state | ✅ | ❌ | ❌ | ✅ | ❌ |
| REST-only, no SDK | ✅ | ❌ | ❌ | ❌ | ❌ |
| MIT self-host | ✅ | Partial | ❌ | ❌ | Varies |

---

## 👤 Author

**Roman** — Full-Stack Developer & AI Builder

- Portfolio: [rommark.dev](https://rommark.dev)
- Telegram: [@VibeCodePrompterSystem](https://t.me/VibeCodePrompterSystem)
- LinkedIn: [roman-m](https://www.linkedin.com/in/r%D0%BEman-m-793b3310/)
- LLM Tech Blog: [claw.rommark.dev](https://claw.rommark.dev)

---

## 📦 License

[MIT](LICENSE) — Use it, fork it, deploy it, sell it. Just keep the attribution.

---

<div align="center">

**Built with [Z.AI GLM 5 Turbo](https://z.ai/subscribe?ic=R0K78RJKNW) \u2022 Developed by [Roman](https://rommark.dev)**

</div>
