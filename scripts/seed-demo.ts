import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.log('Skipping seed: SUPABASE_SERVICE_ROLE_KEY not configured.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🌱 Seeding demo repository for alexchen...');

  const demoUserId = 'alexchen';
  const repoFullName = 'alexchen/distributed-task-queue';

  // 1. Insert Project
  const { data: project, error: pError } = await supabase
    .from('projects')
    .upsert(
      {
        user_id: demoUserId,
        source: 'github',
        repo_full_name: repoFullName,
        repo_url: 'https://github.com/alexchen/distributed-task-queue',
        description: 'Fault-tolerant distributed task worker engine with Redis & Raft consensus',
        default_branch: 'main',
        commit_sha: 'a8b7c6d5e4f3a2b1',
        is_private: false,
        is_fork: false,
        primary_language: 'Go',
        ownership_pct: 94,
        ownership_status: 'verified',
        status: 'ready',
        status_detail: 'Ready for architecture exploration and AI viva tutoring.',
        file_count: 8,
        summary: {
          oneLiner: 'High-throughput distributed background worker pool with at-least-once message delivery.',
          projectType: 'Distributed Backend System',
          techStack: [
            { name: 'Go', role: 'Worker engine & concurrency runtime' },
            { name: 'Redis', role: 'Delayed job queues & lock manager' },
            { name: 'gRPC', role: 'Inter-node heartbeats & cluster RPC' },
          ],
          architecture: 'The system uses an asynchronous leader-follower topology. Workers claim partitioned job streams from Redis using atomic Lua leases. A separate heartbeat coordinator monitors worker health and redistributes dead-worker leases.',
          entryPoints: [
            { path: 'cmd/server/main.go', why: 'Bootstraps the RPC server and initializes worker pool.' },
            { path: 'pkg/worker/pool.go', why: 'Manages goroutine dispatch and concurrent task pipelines.' },
          ],
          keyFlows: [
            {
              name: 'Task Enqueue & Lease Acquisition',
              description: 'Client enqueues serialized payload; workers contend for lock via Redis SETNX with exponential backoff.',
              files: ['pkg/queue/redis.go', 'pkg/worker/lease.go'],
            },
            {
              name: 'Dead Worker Recovery',
              description: 'Heartbeat failure after 3 missed intervals triggers lease forfeiture and task resurrection.',
              files: ['pkg/cluster/heartbeat.go', 'pkg/worker/pool.go'],
            },
          ],
          notableFiles: [
            { path: 'pkg/worker/pool.go', purpose: 'Worker worker loop and panic recovery' },
            { path: 'pkg/queue/redis.go', purpose: 'Redis client with retry and backoff' },
            { path: 'pkg/cluster/heartbeat.go', purpose: 'Cluster leader election & health check' },
          ],
          complexity: 'advanced',
          suggestedQuestions: [
            'How does this system guarantee at-least-once message delivery during worker crashes?',
            'Where is the Redis lease acquisition logic implemented, and what happens if a node times out?',
            'How are concurrent task limits enforced across goroutines in pool.go?',
            'What trade-offs exist between the Redis queue approach versus a dedicated Kafka broker here?',
          ],
        },
      },
      { onConflict: 'user_id,repo_full_name' }
    )
    .select('id')
    .single();

  if (pError || !project) {
    console.error('Failed to insert demo project:', pError);
    return;
  }

  const projectId = project.id;
  console.log(`✅ Demo project created with ID: ${projectId}`);

  // 2. Insert sample project files
  const sampleFiles = [
    {
      project_id: projectId,
      path: 'cmd/server/main.go',
      language: 'Go',
      size_bytes: 1420,
      line_count: 52,
      priority: 80,
      content: `package main

import (
\t"context"
\t"log"
\t"os"
\t"os/signal"
\t"syscall"

\t"github.com/alexchen/distributed-task-queue/pkg/worker"
)

func main() {
\tlog.Println("Starting distributed task worker cluster...")
\tctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
\tdefer cancel()

\tpool := worker.NewPool(worker.PoolConfig{
\t\tConcurrency: 16,
\t\tQueueName:   "priority-tasks",
\t})

\tif err := pool.Start(ctx); err != nil {
\t\tlog.Fatalf("Fatal worker error: %v", err)
\t}
\tlog.Println("Worker pool stopped gracefully.")
}`,
    },
    {
      project_id: projectId,
      path: 'pkg/worker/pool.go',
      language: 'Go',
      size_bytes: 2840,
      line_count: 85,
      priority: 80,
      content: `package worker

import (
\t"context"
\t"fmt"
\t"sync"
\t"time"
)

type PoolConfig struct {
\tConcurrency int
\tQueueName   string
}

type Pool struct {
\tconfig PoolConfig
\twg     sync.WaitGroup
}

func NewPool(cfg PoolConfig) *Pool {
\treturn &Pool{config: cfg}
}

// Start launches worker goroutines that contend for task leases.
func (p *Pool) Start(ctx context.Context) error {
\tfor i := 0; i < p.config.Concurrency; i++ {
\t\tp.wg.Add(1)
\t\tgo p.runWorker(ctx, i)
\t}
\tp.wg.Wait()
\treturn nil
}

func (p *Pool) runWorker(ctx context.Context, id int) {
\tdefer p.wg.Done()
\tfor {
\t\tselect {
\t\tcase <-ctx.Done():
\t\t\treturn
\t\tdefault:
\t\t\ttime.Sleep(100 * time.Millisecond)
\t\t}
\t}
}`,
    },
  ];

  await supabase.from('project_files').delete().eq('project_id', projectId);
  await supabase.from('project_files').insert(sampleFiles);
  console.log(`✅ Seeded ${sampleFiles.length} demo project files.`);

  console.log('✨ Demo seeding complete!');
}

seed().catch(console.error);
