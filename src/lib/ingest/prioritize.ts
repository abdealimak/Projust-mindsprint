export interface ScoredFile {
  path: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  priority: number;
  content: string;
}

export function calculatePriority(path: string, sizeBytes: number): number {
  const p = path.toLowerCase();
  let score = 0;

  // Tests
  if (
    p.includes('.test.') ||
    p.includes('.spec.') ||
    p.includes('__tests__')
  ) {
    score += 20;
  }
  // README
  else if (p.includes('readme.md') || p.includes('readme')) {
    score += 100;
  }
  // Package manifests
  else if (
    p.endsWith('package.json') ||
    p.endsWith('requirements.txt') ||
    p.endsWith('pyproject.toml') ||
    p.endsWith('pom.xml') ||
    p.endsWith('go.mod') ||
    p.endsWith('cargo.toml') ||
    p.endsWith('gemfile')
  ) {
    score += 90;
  }
  // Entry points
  else if (
    p.includes('main.') ||
    p.includes('index.') ||
    p.includes('app.') ||
    p.includes('server.')
  ) {
    score += 80;
  }
  // Routes, controllers, api, pages
  else if (
    p.includes('/api/') ||
    p.includes('/routes/') ||
    p.includes('/controllers/') ||
    p.includes('/pages/') ||
    p.includes('/app/')
  ) {
    score += 70;
  }
  // Models, schema, db, migrations
  else if (
    p.includes('/models/') ||
    p.includes('/schema') ||
    p.includes('/db/') ||
    p.includes('/migrations/') ||
    p.endsWith('.sql') ||
    p.endsWith('.prisma')
  ) {
    score += 70;
  }
  // Auth, middleware, configuration
  else if (
    p.includes('auth') ||
    p.includes('middleware') ||
    p.includes('config')
  ) {
    score += 65;
  }
  // Services, lib, core, utils
  else if (
    p.includes('/services/') ||
    p.includes('/lib/') ||
    p.includes('/core/') ||
    p.includes('/utils/')
  ) {
    score += 40;
  }
  // Tests
  else if (
    p.includes('test') ||
    p.includes('spec') ||
    p.includes('__tests__')
  ) {
    score += 20;
  }
  else {
    score += 10;
  }

  // Bonus for shallow directory depth (max 10 points)
  const depth = path.split('/').length;
  score += Math.max(0, 10 - depth * 2);

  // Bonus for smaller, punchier files (< 10KB)
  if (sizeBytes < 10 * 1024) {
    score += 5;
  }

  return score;
}

export function prioritizeFiles(files: ScoredFile[], maxFiles = 400): ScoredFile[] {
  // Sort descending by priority, then by path
  return [...files]
    .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path))
    .slice(0, maxFiles);
}
