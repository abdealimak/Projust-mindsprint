# Learning API contract

Types: `src/types/learning.ts`. All routes need a signed-in user (session or demo) and only touch
the caller's own projects. Errors: `{ error: string }` with 400/401/404/409/500.
Long work (concepts, course, quiz generation) runs in the background: POST starts it and returns
at once, then the UI polls the GET every 2–3 s while `status === 'generating'`.

| Method | Route | Body | Returns |
|---|---|---|---|
| GET | `/api/projects/[id]/learning` | – | `LearningSummary` |
| GET | `/api/projects/[id]/concepts` | – | `ConceptsResponse` |
| POST | `/api/projects/[id]/concepts` | `{ regenerate?: boolean }` | `ConceptsResponse` (status `generating`) |
| GET | `/api/projects/[id]/course` | – | `{ course: Course \| null }` |
| POST | `/api/projects/[id]/course` | `{ level?: 'beginner'\|'intermediate'\|'advanced', regenerate?: boolean }` | `{ course: Course }`. 409 if concepts not ready |
| POST | `/api/projects/[id]/course/lessons/[lessonId]` | `{ done: boolean }` | `{ completed_lesson_ids: string[] }` |
| GET | `/api/projects/[id]/quiz` | – | `{ attempts: QuizAttempt[] }` (newest first) |
| POST | `/api/projects/[id]/quiz` | – | `{ attempt: QuizAttempt }` new attempt (status `generating`). 409 if concepts not ready or an attempt is unfinished |
| GET | `/api/quiz/[attemptId]` | – | `{ attempt: QuizAttempt }` |
| POST | `/api/quiz/[attemptId]/answer` | `{ questionId, answer }` | `{ graded: GradedAnswer }` (grading takes 2–10 s; show a pending state) |
| POST | `/api/quiz/[attemptId]/submit` | – | `{ attempt: QuizAttempt }` with scores, average, unlocked, certificate_code |
| GET | `/api/certificates` | – | `{ certificates: LearningCertificate[] }` |
| GET | `/api/certificates/[code]` (public) | – | `{ certificate: LearningCertificate }` |

Order of the flow on a project page: project `ready` → Concepts (generate) → Course (generate,
read lessons) → Quiz (start attempt, answer every question, submit) → if unlocked, Certificate.
An attempt must have every question answered before submit (409 otherwise).
For `mcq` questions, `answer` is the chosen option's index as a string (`"0"`–`"3"`); other types send free text.

Demo users (`demo:*`) get deterministic sample data from these routes, with `sample: true` on
certificates, so the flow can be shown without an LLM key.

Data-layer helpers for server components (in `src/lib/data`):
`getCourses()`, `getCertificates()`, `getCertificateByCode(code)`, `getPublicProfile(username)`,
`getLearningSummaries()`.
