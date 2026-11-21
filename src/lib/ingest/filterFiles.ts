const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  'vendor',
  'venv',
  '.venv',
  '__pycache__',
  'target',
  '.idea',
  '.vscode',
  '.turbo',
  '.cache',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'cargo.lock',
  'composer.lock',
  'gemfile.lock',
  '.ds_store',
  'thumbs.db',
]);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg', 'bmp', 'tiff',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'wav', 'ogg', 'mp4', 'webm', 'mov', 'avi',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dll', 'so', 'dylib', 'bin', 'iso', 'dmg',
  'map', 'min.js', 'min.css',
]);

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript (React)',
  js: 'JavaScript',
  jsx: 'JavaScript (React)',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  cc: 'C++',
  cs: 'C#',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  toml: 'TOML',
  sh: 'Shell',
  bash: 'Shell',
  dockerfile: 'Dockerfile',
  prisma: 'Prisma',
};

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|password|auth[_-]?token|private[_-]?key|access[_-]?token)\s*[:=]\s*["']?([A-Za-z0-9_\-.~+/=]{16,})["']?/gi,
  /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g, // GitHub tokens
  /sk-[A-Za-z0-9]{32,}/g, // OpenAI keys
  /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
];

export function redactSecrets(content: string): string {
  let redacted = content;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match, captured) => {
      if (captured) {
        return match.replace(captured, '[REDACTED]');
      }
      return '[REDACTED]';
    });
  }
  return redacted;
}

export function shouldKeepFile(path: string, sizeBytes: number, maxKb: number = 100): { keep: boolean; reason?: string } {
  const parts = path.split('/');
  const fileName = (parts[parts.length - 1] || '').toLowerCase();

  // Check directories
  for (const dir of parts.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(dir.toLowerCase())) {
      return { keep: false, reason: `Ignored directory: ${dir}` };
    }
  }

  // Check dot env files
  if (fileName.startsWith('.env')) {
    return { keep: false, reason: 'Environment secrets file' };
  }

  // Check ignored files
  if (IGNORED_FILES.has(fileName)) {
    return { keep: false, reason: `Ignored lock/cache file: ${fileName}` };
  }

  // Check binary extensions
  const dotIndex = fileName.lastIndexOf('.');
  const ext = dotIndex !== -1 ? fileName.slice(dotIndex + 1) : '';
  if (BINARY_EXTENSIONS.has(ext)) {
    return { keep: false, reason: `Binary or generated asset: .${ext}` };
  }

  // Size limit
  if (sizeBytes > maxKb * 1024) {
    return { keep: false, reason: `Exceeds max file size (${Math.round(sizeBytes / 1024)}KB > ${maxKb}KB)` };
  }

  return { keep: true };
}

export function detectLanguage(path: string): string {
  const fileName = path.split('/').pop()?.toLowerCase() || '';
  if (fileName === 'dockerfile') return 'Dockerfile';
  if (fileName === 'makefile') return 'Makefile';

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = fileName.slice(dotIndex + 1);
    if (EXTENSION_LANGUAGE_MAP[ext]) {
      return EXTENSION_LANGUAGE_MAP[ext];
    }
  }

  return 'Plain Text';
}
