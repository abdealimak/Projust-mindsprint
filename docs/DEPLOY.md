# Deploying Projust (Vercel)

Projust is a standard Next.js 14 app. It deploys to Vercel as-is: AI jobs that keep running after
a request (import, concept map, course, quiz) are kept alive with `waitUntil`, and those routes
allow up to 5 minutes (`maxDuration = 300`).

## 1. Before you deploy

- **Database:** run the SQL files in `supabase/migrations/` (002, 003, 004) once in the Supabase
  SQL editor, if you haven't.
- **Secrets:** create `.env.production` from `.env.example` (it is gitignored by `.env*`). Use fresh
  values for:
  - `TOKEN_ENCRYPTION_KEY`: `openssl rand -base64 32` (the example value is public; production refuses it)
  - `SESSION_SECRET`: `openssl rand -base64 48`
  - `NEXT_PUBLIC_SITE_URL`: your Vercel URL, e.g. `https://projust.vercel.app`
- **AI cost control:** set `SHARED_AI_ALLOWED_EMAILS` to your own email (or `none`). Everyone else
  then adds their own key in **Settings → AI**, so strangers can't spend your credits.
- **Firebase:** Authentication → Settings → Authorized domains → add your Vercel domain. In Google
  Cloud, restrict the Firebase browser API key to that domain.
- **Demo mode:** keep `ALLOW_DEMO_MODE=true` if judges should be able to look around without
  signing in; it never calls an AI.

## 2. Deploy

```bash
npx vercel login            # opens the browser, once
npx vercel link             # create/link the project, once
bash scripts/vercel-env.sh .env.production   # uploads values without printing them
npx vercel --prod           # build and deploy
```

## 3. After deploy

1. Open the site, sign in with GitHub or Google.
2. Dashboard → **AI for live runs** → Settings → AI: choose a provider and model, paste your key,
   **Test connection**, **Save**.
3. Import a small public repo and run Concepts → Course → Quiz → Certificate.

## What is public and what is secret

| Public (sent to browsers, fine) | Secret (server only) |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL` | `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `LLM_*_API_KEY`, `GITHUB_*_SECRET`, `GITHUB_SERVER_TOKEN` |

Users' own AI keys are stored only in an encrypted, httpOnly cookie in their browser (AES-256-GCM
with `TOKEN_ENCRYPTION_KEY`, bound to their user id). They are never logged, never returned to the
page and never written to the database.

## Limits to know

- Vercel stops a function after `maxDuration` (300 s). A very large repo's concept map may need
  more; keep demo repos small (the importer already caps size and file count).
- `AI_SERVER_*` (the self-hosted laptop server) is for local use only; the upload script skips it.
