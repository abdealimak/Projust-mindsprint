// Sample content for the landing page. All of it is fake demo data.
import type { AspectScores } from "./scoring";

/** The file the hero "reads". Line numbers matter: concepts point at them. */
export const HERO_FILE = {
  path: "src/auth/session.ts",
  lines: [
    `import { NextResponse } from "next/server";`,
    `import { verifyJwt } from "@/lib/jwt";`,
    ``,
    `export async function middleware(req: Request) {`,
    `  const token = req.headers.get("authorization");`,
    `  if (!token) return NextResponse.redirect("/login");`,
    `  return NextResponse.next();`,
    `}`,
    ``,
    `export function saveSession(jwt: string) {`,
    `  // stored for the dashboard to read later`,
    `  localStorage.setItem("token", jwt);`,
    `}`,
    ``,
    `const hits = new Map<string, number>();`,
    `export function rateLimit(ip: string) {`,
    `  const n = (hits.get(ip) ?? 0) + 1;`,
    `  hits.set(ip, n);`,
    `  return n <= 20;`,
    `}`,
  ],
};

export type HeroConcept = {
  id: string;
  name: string;
  from: number; // 1-based line numbers
  to: number;
  strength: "Strong" | "Solid" | "Growing";
};

export const HERO_CONCEPTS: HeroConcept[] = [
  { id: "mw", name: "Route middleware", from: 4, to: 8, strength: "Strong" },
  { id: "jwt", name: "Token storage", from: 10, to: 13, strength: "Growing" },
  { id: "rl", name: "Rate limiting", from: 15, to: 20, strength: "Solid" },
];

export const SAMPLE_SCORES: AspectScores = {
  concept: 78,
  code: 84,
  debug: 66,
  arch: 71,
  security: 58,
  ai: 81,
};

export type DemoCert = {
  code: string;
  name: string;
  project: string;
  stack: string[];
  level: "Course-verified" | "Interview-verified";
  ownership: string;
  scores: AspectScores;
  versions: { v: number; date: string; note: string }[];
  concepts: string[];
};

export const DEMO_CERTS: DemoCert[] = [
  {
    code: "PJ-2026-A7X9K2",
    name: "Aarav Mehta",
    project: "campus-pay",
    stack: ["Next.js", "Supabase", "Stripe"],
    level: "Course-verified",
    ownership: "Repo ownership verified, 82% of commits",
    scores: SAMPLE_SCORES,
    versions: [
      { v: 1, date: "2 Nov 2026", note: "Unlocked at average 62" },
      { v: 2, date: "9 Nov 2026", note: "Security module done, +9" },
      { v: 3, date: "18 Nov 2026", note: "Debugging retake, +6" },
    ],
    concepts: ["Route middleware", "JWT storage", "Webhooks", "Row-level security", "Rate limiting"],
  },
  {
    code: "PJ-2026-Q4M8T1",
    name: "Diya Sharma",
    project: "hostel-mess-planner",
    stack: ["React", "Express", "PostgreSQL"],
    level: "Interview-verified",
    ownership: "Repo ownership verified, 96% of commits",
    scores: { concept: 86, code: 90, debug: 79, arch: 74, security: 70, ai: 88 },
    versions: [
      { v: 1, date: "14 Oct 2026", note: "Unlocked at average 68" },
      { v: 2, date: "30 Oct 2026", note: "Interview passed, reviewer signed off" },
    ],
    concepts: ["REST design", "SQL joins", "Session cookies", "Input validation", "Caching"],
  },
];

export function findCert(code: string) {
  return DEMO_CERTS.find((c) => c.code === code);
}

/** Margin notes: the questions Projust will ask about each concept. */
export const HERO_NOTES: { concept: string; line: number; q: string; aspect: string }[] = [
  { concept: "mw", line: 5, q: "What if the header is just “Bearer” with no token?", aspect: "Debugging" },
  { concept: "jwt", line: 12, q: "Why localStorage and not an httpOnly cookie?", aspect: "Security" },
  { concept: "rl", line: 17, q: "What happens to these counts when the server restarts?", aspect: "Architecture" },
];

/** Recent certificates for the live ticker. */
export const TICKER = [
  { code: "PJ-2026-A7X9K2", who: "Aarav M.", project: "campus-pay", level: "Course-verified", avg: 73 },
  { code: "PJ-2026-Q4M8T1", who: "Diya S.", project: "hostel-mess-planner", level: "Interview-verified", avg: 81 },
  { code: "PJ-2026-H3D7W9", who: "Kabir R.", project: "attendance-bot", level: "Course-verified", avg: 66 },
  { code: "PJ-2026-T8N2C5", who: "Meera I.", project: "fest-ticketing", level: "Course-verified", avg: 70 },
  { code: "PJ-2026-L5P1R8", who: "Rohan K.", project: "library-api", level: "Interview-verified", avg: 77 },
  { code: "PJ-2026-B9V4E3", who: "Sana A.", project: "placement-tracker", level: "Course-verified", avg: 64 },
  { code: "PJ-2026-F2J6Y0", who: "Ishaan P.", project: "canteen-queue", level: "Course-verified", avg: 69 },
];
