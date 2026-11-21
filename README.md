# Projust — Developer Project Understanding Verification Platform

**Projust** verifies that developers actually understand the projects they built (especially AI-assisted codebases) through repository ingestion, personalized courses with quizzes, and dynamic recruiter-verifiable credentials.

---

## 1. Feature 1: Repository Ingestion, Indexing, and Codebase Grounded AI Tutor

A logged-in user can:
1. **Connect their GitHub account** and browse their repositories.
2. **Import any repository** or paste a public GitHub repository URL (`https://github.com/owner/repo`).
3. Have Projust **stream, filter, index, and summarize** the codebase AST and calculate author commit ownership.
4. **Ask anything about the codebase** in a streaming AI Tutor chat with citations like `[[path/to/file.ts:12-30]]` that interactively open a side-by-side code viewer and highlight the exact cited lines.

---

## 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Environment Variables
```env
# LLM (OpenAI-compatible; default OpenRouter)
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your-openrouter-or-openai-key
LLM_MODEL=deepseek/deepseek-chat
LLM_FAST_MODEL=deepseek/deepseek-chat

# GitHub repo-access OAuth app (separate from login app)
GITHUB_REPO_CLIENT_ID=your-github-repo-client-id
GITHUB_REPO_CLIENT_SECRET=your-github-repo-client-secret
GITHUB_SERVER_TOKEN=optional-personal-access-token-for-higher-rate-limits

# Security (32-byte base64 encryption key for storing GitHub tokens via AES-256-GCM)
TOKEN_ENCRYPTION_KEY=dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleS0xMjM0NQ==

# Ingestion Limits
MAX_REPO_ARCHIVE_MB=25
MAX_FILES_PER_PROJECT=400
MAX_FILE_KB=100
ASK_CONTEXT_TOKEN_BUDGET=60000
FREE_DAILY_ASK_LIMIT=20

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projust-XXXXX.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=projust-XXXXX
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projust-XXXXX.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Supabase (Database & Postgres FTS)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 3. Database Migrations

Run `supabase/migrations/002_feature1.sql` in your Supabase SQL editor:
- `github_connections`: Encrypted AES-256-GCM repository access tokens.
- `projects`: Stores repo metadata, ownership percentages, status, and structured LLM `summary` JSON.
- `project_files`: Ingested source files with language, line counts, priority score, and generated `tsv` tsvector index for full-text search.
- `chat_threads` & `chat_messages`: Conversation history and structured `citations` JSON.
- `usage_daily`: Enforces the free tier daily ask limit.

---

## 4. GitHub OAuth App Setup (Repo Access)

1. Go to **GitHub Settings → Developer Settings → OAuth Apps → New OAuth App**.
2. **Application Name**: `Projust Repo Access`
3. **Homepage URL**: `http://localhost:3000`
4. **Authorization Callback URL**: `http://localhost:3000/api/github/callback`
5. Copy your **Client ID** into `GITHUB_REPO_CLIENT_ID` and generate a **Client Secret** for `GITHUB_REPO_CLIENT_SECRET`.

---

## 5. Testing & Verification

Run the automated Feature 1 test suite (crypto roundtrip, file filtering, secret redaction, priority scoring, citation parsing & bounds validation):
```bash
node --experimental-strip-types tests/feature1.test.ts
```

Run production build check:
```bash
npx next build
```

Seed demo project for instant preview:
```bash
node --experimental-strip-types scripts/seed-demo.ts
```

---

## 6. Assumptions, Limits & Roadmap (Features 2 & 3)

- **Vector Database**: As specified, embeddings are not added in this step. Retrieval is powered by the fast LLM File Router (`generateObject`) combined with Postgres full-text search (`tsvector` over `project_files`). A stub is provided in `src/lib/ai/embeddings.ts` for hybrid search in a future release.
- **Repository Caps**: Archives are capped at 25MB and 400 files by default to ensure fast in-memory tarball processing without memory bloat.
- **Data Foundation**: Ingested files, author commit ownership status (`verified`, `partial`, `not_owner`), and architectural summaries (`entryPoints`, `keyFlows`, `complexity`) are indexed and ready to be directly consumed by **Feature 2** (Concept Map & Personalized Course) and **Feature 3** (AI Viva Interview).
