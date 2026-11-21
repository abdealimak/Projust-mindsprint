# Prompt for Claude Code on the Windows laptop (Projust AI server)

Paste everything below the line into Claude Code on the Windows machine. Run it from an empty folder such as `C:\projust-ai`.

---

You are setting up this Windows laptop as the **AI server for Projust**, a Next.js app (developed on a Mac) that verifies developers understand their own GitHub repos. The web app already ingests a repo, stores its files in Supabase, and calls an OpenAI-compatible LLM for summaries and a code tutor. This machine must now do the heavy AI work, mostly **generating personalized courses and quizzes from a codebase** and **grading answers**, and expose it over the network to the web app.

## Hardware and constraints

- Windows 10/11, 16 GB RAM, NVIDIA GTX 1060 (Pascal, compute 6.1). First check VRAM with `nvidia-smi` (it is either 3 GB or 6 GB) and the driver version. Tell me what you found before choosing models.
- Pascal has no tensor cores and weak FP16, so use quantized GGUF models through **Ollama** (CUDA). Do not use vLLM, TensorRT-LLM or anything that needs a newer GPU.
- Keep the whole model in VRAM where possible. Model picks:
  - 6 GB VRAM: main model `qwen2.5-coder:7b` (Q4_K_M, about 4.7 GB) with `num_ctx` 8192. Also try `qwen3:8b` or `llama3.1:8b` and keep whichever gives the best valid JSON in the benchmark below.
  - 3 GB VRAM: `qwen2.5-coder:3b` as the main model, partial CPU offload is acceptable.
  - Fast model for routing and short grading: `qwen2.5-coder:1.5b` or `qwen2.5:3b`.
  - Embeddings: `nomic-embed-text`.
- Only one big generation runs at a time (the GPU can't fit two). Everything long must go through a job queue.

## What to build

### 1. Ollama

- Install Ollama for Windows, pull the models above, and confirm GPU use (`ollama ps` shows 100% GPU for the main model).
- Set system env vars: `OLLAMA_HOST=127.0.0.1:11434` (Ollama stays private, only our gateway talks to it), `OLLAMA_KEEP_ALIVE=30m`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=2`, `OLLAMA_FLASH_ATTENTION=1`.
- Create Modelfiles `projust-main` and `projust-fast` that pin `num_ctx`, `temperature 0.3` and a short system line, so the web app can just ask for `projust-main`.

### 2. `projust-ai` gateway (Python 3.11+, FastAPI, uvicorn)

A single service on port **8787** in front of Ollama. Use a venv, `pydantic` v2 models for every request and response, `httpx` to talk to Ollama, and SQLite for the job table. Structure:

```
projust-ai/
  app/main.py            FastAPI app, auth middleware, routers
  app/config.py          settings from .env
  app/llm.py             Ollama client, JSON-schema structured output, retries
  app/jobs.py            SQLite job queue + a single background worker
  app/routers/openai.py  OpenAI-compatible passthrough
  app/routers/course.py  concepts, course, quiz, grading
  app/prompts/*.md       one prompt file per task
  app/schemas.py         pydantic models (the contract below)
  tests/                 pytest, including a fixture repo
  .env.example  requirements.txt  README.md  run.ps1  install-service.ps1
```

**Auth:** every route except `GET /health` requires `Authorization: Bearer <PROJUST_AI_KEY>`. Generate a long random key, put it in `.env`, and print it once at the end for me to copy into the Mac's `.env.local`. Add CORS only for `http://localhost:3000` and the deployed site URL from `.env`.

**Structured output:** use Ollama's `format` parameter with the pydantic JSON schema. Validate the reply. If it fails, retry up to 2 times and feed the validation error back to the model. All file paths a model returns must exist in the input file list, otherwise drop them.

**Big repos vs small context:** never send the whole repo. Take the files the web app sends (already ranked by `priority`), chunk to fit `num_ctx`, run a map step (per-chunk concept notes) and a reduce step (merge into one concept list). Send with each file its path and line numbers so citations like `path/to/file.ts:12-30` stay correct.

### 3. API contract (the web app will be coded against exactly this)

Shared types:

```
Aspect = "concept_understanding" | "code_comprehension" | "debugging"
       | "architecture_design" | "security_best_practices" | "ai_collaboration"
FileIn  = { path: str, language: str|null, content: str, priority: int }
Cite    = { path: str, startLine: int, endLine: int }
Job     = { id: str, kind: str, status: "queued"|"running"|"done"|"failed",
            progress: float (0..1), step: str, result: object|null, error: str|null,
            created_at: str, finished_at: str|null }
```

Routes:

- `GET /health` returns `{ ok, gpu: {name, vram_total_mb, vram_used_mb}, models: [...], queue_depth }`.
- `POST /v1/chat/completions`, `POST /v1/embeddings`, `GET /v1/models`: an OpenAI-compatible passthrough to Ollama's `/v1`, **streaming included** (SSE must stream token by token, not buffer). With this the existing app works by setting `LLM_BASE_URL=http://<host>:8787/v1`, `LLM_MODEL=projust-main`, `LLM_FAST_MODEL=projust-fast`. Test it with the official `openai` Python client, both `stream=True` and a `response_format` JSON schema request.
- `POST /course/concepts` (job) takes `{ project_id, repo_full_name, summary: object|null, files: FileIn[] }` and returns `{ concepts: [{ id, name, category, description, difficulty: "intro"|"core"|"advanced", files: Cite[], depends_on: [concept_id] }] }`. That is 8 to 20 concepts that this specific code uses (for example "JWT refresh flow in src/auth/refresh.ts", not "what is JavaScript"), with a dependency graph and no cycles.
- `POST /course/generate` (job) takes `{ project_id, concepts, files: FileIn[], learner: { level: "beginner"|"intermediate"|"advanced", weak_aspects: Aspect[] } }` and returns `{ title, modules: [{ id, title, concept_ids, lessons: [{ id, title, minutes, body_md, code_refs: Cite[], check_questions: [str] }] }] }`. Lessons teach the learner's own code: they quote the real lines, explain why it is written that way, list the trade-offs and say what breaks if it is changed. Generate it module by module and save progress to the job, so a crash doesn't lose everything.
- `POST /quiz/generate` (job) takes `{ project_id, concept_ids, files: FileIn[], count: int (default 12), attempt: int }` and returns `{ questions: [{ id, aspect: Aspect, type: "mcq"|"free_text"|"find_the_bug"|"what_if", prompt_md, code: { path, startLine, endLine, snippet }|null, options: [str]|null, answer_key, rubric: [{ point: str, weight: int }] }] }`. Cover all six aspects at least twice each. For `find_the_bug`, mutate a real snippet with one realistic bug and keep the original in `answer_key`. A higher `attempt` must produce different questions (use the attempt number as a seed and avoid questions from earlier attempts).
- `POST /quiz/grade` (sync, fast model, runs on the main model if the fast one is too weak) takes `{ question, answer: str }` and returns `{ score: 0..100, rubric_hits: [{ point, hit: bool }], feedback_md, study_tip }`. It is strict but fair, and an empty or off-topic answer scores 0.
- `POST /score/aspects` (sync) takes `{ graded: [{ aspect, score }] }` and returns `{ scores: { [Aspect]: 0..100 }, average, unlocked: bool }`. **Unlock rule: average ≥ 60 and no aspect below 40.** This is plain code, no LLM, and it gets unit tests.
- `GET /jobs/{id}` returns `Job`. `DELETE /jobs/{id}` cancels a job.

The worker runs jobs one at a time, updates `progress` and `step` (for example "Mapping chunk 3 of 9"), keeps results for 7 days, and on restart moves `running` jobs back to `queued`.

### 4. Reachability from the Mac and from the deployed site

- Use **Tailscale** as the default: install it, join my tailnet, and give the laptop a stable name. The Mac then uses `http://<laptop>.<tailnet>.ts.net:8787`. Bind uvicorn to `0.0.0.0:8787` and add a Windows Firewall inbound rule for 8787 limited to the Tailscale interface or range (`100.64.0.0/10`).
- If the web app is deployed (Vercel) it can't reach the tailnet. In that case also set up **Cloudflare Tunnel** (`cloudflared`) to an `https://ai.<domain>` hostname that points at `localhost:8787`. Ask me for the domain first and don't do this part without my OK. The bearer key stays mandatory.
- Never expose Ollama's 11434 port to the network.

### 5. Always on

- `run.ps1` activates the venv and starts uvicorn.
- `install-service.ps1` registers the gateway as a Windows service with **NSSM** (auto-start, restart on crash, logs to `logs\`). Ollama already runs at login, so make sure it also starts after a reboot without login (as a service or a scheduled task).
- In Power settings, stop the laptop from sleeping on AC power and keep running with the lid closed. Ask me before changing these.
- Add a logrotate-style cap on log size.

### 6. Prove it works (don't stop until all pass)

1. `pytest` passes: schema validation, the unlock rule, path validation, job queue restart recovery.
2. A benchmark script `bench.py` runs on a small real fixture repo (clone `https://github.com/expressjs/express` and keep at most 40 files) and checks the whole flow concepts → course → quiz → grade. Print for each step the time, tokens/s, whether the JSON was valid on the first try, and peak VRAM. Run it for each candidate main model and keep the best one.
3. From another machine on the tailnet (or with `curl` against the Tailscale IP), `GET /health` works and an authenticated streaming `chat/completions` call streams.
4. Write `README.md`: how to start and stop it, how to rotate the key, the env vars, and the exact values the Mac app needs:

```
AI_SERVER_URL=http://<laptop>.<tailnet>.ts.net:8787
AI_SERVER_KEY=<key>
LLM_BASE_URL=http://<laptop>.<tailnet>.ts.net:8787/v1
LLM_API_KEY=<key>
LLM_MODEL=projust-main
LLM_FAST_MODEL=projust-fast
```

### Rules

- Ask before installing system-wide software you haven't mentioned above, changing power or firewall settings, or setting up the Cloudflare tunnel.
- No secrets in git. Add `.env`, `logs/`, `*.sqlite` and `models/` to `.gitignore`. Init a git repo for `projust-ai` but don't push anywhere unless I say so.
- When done, give me: the GPU and VRAM, the chosen models and their benchmark numbers, the URL, the env block above filled in (with the key), and anything that failed.
