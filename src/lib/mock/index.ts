import {
  Profile,
  Project,
  AspectScores,
  CourseProgress,
  ActivityItem,
  Certificate,
  CommonProjectCourse,
} from '@/types';

export const mockProfile: Profile = {
  id: 'usr_demo_4982a',
  username: 'alexchen',
  full_name: 'Alex Chen',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  email: 'alex.chen@example.com',
  headline: 'Full-stack builder · Next.js & Distributed Systems',
  bio: 'Building developer tools that verify code comprehension. Passionate about software architecture, type-safety, and honest AI collaboration.',
  github_username: 'alexchen-dev',
  github_connected: false, // Set false to demonstrate the Connect GitHub banner & identity linking
  linkedin_url: 'https://linkedin.com/in/alexchen-dev',
  created_at: '2026-01-15T10:00:00Z',
};

const sampleProjects: Project[] = [
  {
    id: 'proj_1',
    user_id: 'usr_demo_4982a',
    repo_url: 'https://github.com/alexchen-dev/shop-api',
    repo_full_name: 'alexchen-dev/shop-api',
    commit_sha: 'a8b34c1',
    ownership_pct: 86,
    is_fork: false,
    status: 'in_progress',
    summary: 'High-throughput Node.js checkout service with idempotency keys and Stripe webhooks.',
    concepts_count: 18,
    created_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 'proj_2',
    user_id: 'usr_demo_4982a',
    repo_url: 'https://github.com/alexchen-dev/todo-app',
    repo_full_name: 'alexchen-dev/todo-app',
    commit_sha: '7f9901d',
    ownership_pct: 95,
    is_fork: false,
    status: 'ready',
    summary: 'Collaborative real-time task manager with WebSockets and optimistic UI mutations.',
    concepts_count: 14,
    created_at: '2026-02-14T09:15:00Z',
  },
  {
    id: 'proj_3',
    user_id: 'usr_demo_4982a',
    repo_url: 'https://github.com/alexchen-dev/auth-gateway',
    repo_full_name: 'alexchen-dev/auth-gateway',
    commit_sha: '4d112e8',
    ownership_pct: 78,
    is_fork: false,
    status: 'analyzing',
    summary: 'OAuth 2.0 and JWT token inspection service with Redis sliding-window rate limiting.',
    concepts_count: 12,
    created_at: '2026-02-19T18:40:00Z',
  },
  {
    id: 'proj_4',
    user_id: 'usr_demo_4982a',
    repo_url: 'https://github.com/alexchen-dev/event-bus',
    repo_full_name: 'alexchen-dev/event-bus',
    commit_sha: '99e312a',
    ownership_pct: 91,
    is_fork: false,
    status: 'completed',
    summary: 'Lightweight publish-subscribe message broker with partition consumer groups.',
    concepts_count: 22,
    created_at: '2026-01-20T11:00:00Z',
  },
];

/**
 * Demo mode lists only the project that has full sample data behind it (files, concepts, course,
 * quiz, certificate; see DEMO_PROJECT_ID in lib/brain/demo.ts). The others above have no detail
 * data yet and would open to "Project not found".
 */
export const mockProjects: Project[] = sampleProjects.filter((p) => p.id === 'proj_1');

export const mockScores: AspectScores = {
  concept_understanding: 88,
  code_comprehension: 84,
  debugging: 76,
  architecture_design: 82,
  security_best_practices: 79,
  ai_collaboration: 92,
};

export const mockCourses: CourseProgress[] = [
  {
    id: 'crs_1',
    project_id: 'proj_1',
    project_name: 'shop-api',
    course_title: 'Payments & Idempotency in High-Concurrence Systems',
    current_subtopic: 'Handling Stripe Webhook Signature Verification & Replays',
    completed_subtopics: 5,
    total_subtopics: 8,
    progress_percent: 62,
    last_activity: '2026-02-21T08:30:00Z',
  },
  {
    id: 'crs_2',
    project_id: 'proj_2',
    project_name: 'todo-app',
    course_title: 'Realtime Consistency & Optimistic UI Rollbacks',
    current_subtopic: 'Conflict Resolution on Simultaneous Edits',
    completed_subtopics: 2,
    total_subtopics: 6,
    progress_percent: 33,
    last_activity: '2026-02-20T16:10:00Z',
  },
];

export const mockActivity: ActivityItem[] = [
  {
    id: 'act_1',
    type: 'quiz',
    title: 'Quiz completed',
    description: 'You scored 82 on Authentication basics quiz in shop-api',
    project_name: 'shop-api',
    timestamp: '2026-02-21T08:30:00Z',
    score: 82,
    chips: [
      { label: 'Security', score: 85 },
      { label: 'Comprehension', score: 80 },
      { label: 'Debugging', score: 81 },
    ],
  },
  {
    id: 'act_2',
    type: 'certificate',
    title: 'Certificate updated',
    description: 'Your certificate PJ-2026-A7X9K2 was updated (Debugging +6)',
    project_name: 'shop-api',
    timestamp: '2026-02-20T19:45:00Z',
    cert_id: 'PJ-2026-A7X9K2',
  },
  {
    id: 'act_3',
    type: 'project',
    title: 'Analysis completed',
    description: 'Project todo-app analysis completed: 14 concepts found',
    project_name: 'todo-app',
    timestamp: '2026-02-20T14:15:00Z',
  },
  {
    id: 'act_4',
    type: 'course',
    title: 'New course available',
    description: 'New course available: Payments & webhooks for shop-api',
    project_name: 'shop-api',
    timestamp: '2026-02-19T11:20:00Z',
  },
  {
    id: 'act_5',
    type: 'certificate',
    title: 'Milestone reached',
    description: 'You reached the certificate threshold for shop-api',
    project_name: 'shop-api',
    timestamp: '2026-02-18T16:50:00Z',
    cert_id: 'PJ-2026-A7X9K2',
  },
];

export const mockCertificates: Certificate[] = [
  {
    id: 'cert_1',
    cert_code: 'PJ-2026-A7X9K2',
    project_name: 'shop-api',
    project_id: 'proj_1',
    repo_full_name: 'alexchen-dev/shop-api',
    recipient_name: 'Alex Chen',
    recipient_username: 'alexchen',
    level: 'Course-verified',
    issued_at: '2026-02-18T16:50:00Z',
    updated_at: '2026-02-20T19:45:00Z',
    scores: {
      concept_understanding: 88,
      code_comprehension: 84,
      debugging: 76,
      architecture_design: 82,
      security_best_practices: 79,
      ai_collaboration: 92,
    },
    overall_score: 84,
    ownership_pct: 86,
    concepts_mastered: [
      { name: 'Idempotency Keys', category: 'Architecture', strength: 'master' },
      { name: 'Webhook Signature Verification', category: 'Security', strength: 'advanced' },
      { name: 'Sliding-Window Rate Limiting', category: 'Distributed Systems', strength: 'proficient' },
      { name: 'Database Connection Pooling', category: 'Performance', strength: 'advanced' },
      { name: 'AI Code Review & Sanity Gates', category: 'AI Collaboration', strength: 'master' },
    ],
    version: 'v1.4',
  },
  {
    id: 'cert_2',
    cert_code: 'PJ-2026-B8Z1R4',
    project_name: 'event-bus',
    project_id: 'proj_4',
    repo_full_name: 'alexchen-dev/event-bus',
    recipient_name: 'Alex Chen',
    recipient_username: 'alexchen',
    level: 'Interview-verified',
    issued_at: '2026-01-28T10:00:00Z',
    updated_at: '2026-02-05T12:00:00Z',
    scores: {
      concept_understanding: 90,
      code_comprehension: 94,
      debugging: 88,
      architecture_design: 91,
      security_best_practices: 84,
      ai_collaboration: 95,
    },
    overall_score: 90,
    ownership_pct: 91,
    concepts_mastered: [
      { name: 'Partition Rebalancing', category: 'Distributed Systems', strength: 'master' },
      { name: 'Zero-Copy Buffer Serialization', category: 'Performance', strength: 'master' },
      { name: 'Consumer Acknowledgement Guarantees', category: 'Architecture', strength: 'advanced' },
    ],
    version: 'v2.1',
  },
];

export const mockCommonProjects: CommonProjectCourse[] = [
  {
    id: 'cpc_1',
    title: 'URL Shortener with Redis Caching & Analytics',
    description: 'Learn base62 hashing, key eviction policies, and atomic hit counters under high load.',
    difficulty: 'Beginner',
    tags: ['Redis', 'Node.js', 'System Design'],
    estimated_hours: 4,
    enrolled_count: 1420,
  },
  {
    id: 'cpc_2',
    title: 'Realtime Chat with WebSockets & Presences',
    description: 'Heartbeat ping-pong, multi-tab sync, distributed pub/sub state, and reconnection handling.',
    difficulty: 'Intermediate',
    tags: ['WebSockets', 'Architecture', 'TypeScript'],
    estimated_hours: 6,
    enrolled_count: 980,
  },
  {
    id: 'cpc_3',
    title: 'Multi-Tenant SaaS with Row-Level Security',
    description: 'Postgres RLS tenant isolation, JWT claims passing, and automated migration safeguards.',
    difficulty: 'Advanced',
    tags: ['PostgreSQL', 'Security', 'Supabase'],
    estimated_hours: 8,
    enrolled_count: 730,
  },
];

export const mockLatestChanges = [
  {
    date: 'Feb 20, 2026',
    title: 'Dynamic certificate version history now tracks aspect jumps',
    description: 'Certificates reflect retakes and ongoing learning progress without invalidating prior credentials.',
  },
  {
    date: 'Feb 16, 2026',
    title: 'Enhanced AI Collaboration scoring rubric',
    description: 'Evaluates discernment when prompting LLMs and spotting hallucinations in generated tests.',
  },
  {
    date: 'Feb 10, 2026',
    title: 'Tab-switch integrity markers enabled in quiz reviews',
    description: 'Provides non-punitive confidence indicators for recruiter and professor review briefings.',
  },
];
