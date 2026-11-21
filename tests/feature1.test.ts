import assert from 'assert';
import crypto from 'crypto';
import { encryptToken, decryptToken } from '../src/lib/crypto.ts';
import { shouldKeepFile, redactSecrets, detectLanguage } from '../src/lib/ingest/filterFiles.ts';
import { calculatePriority, prioritizeFiles } from '../src/lib/ingest/prioritize.ts';
import { parseCitations, formatNumberedFile } from '../src/lib/ai/citations.ts';

// 1. Test Crypto Roundtrip
console.log('Testing Token Encryption & Decryption...');
const testKey = crypto.randomBytes(32).toString('base64');
process.env.TOKEN_ENCRYPTION_KEY = testKey;
const sampleToken = 'gho_secret_token_1234567890abcdef';
const encrypted = encryptToken(sampleToken);
const decrypted = decryptToken(encrypted);
assert.strictEqual(decrypted, sampleToken, 'Decrypted token must match original');
console.log('✅ Crypto roundtrip test passed');

// 2. Test File Filtering
console.log('Testing File Filtering...');
assert.strictEqual(shouldKeepFile('node_modules/react/index.js', 1000).keep, false, 'Should ignore node_modules');
assert.strictEqual(shouldKeepFile('.git/config', 500).keep, false, 'Should ignore .git');
assert.strictEqual(shouldKeepFile('.env.production', 200).keep, false, 'Should ignore .env files');
assert.strictEqual(shouldKeepFile('package-lock.json', 50000).keep, false, 'Should ignore lockfiles');
assert.strictEqual(shouldKeepFile('assets/logo.png', 5000).keep, false, 'Should ignore images');
assert.strictEqual(shouldKeepFile('huge_file.json', 200 * 1024, 100).keep, false, 'Should ignore files > maxKb');
assert.strictEqual(shouldKeepFile('src/lib/utils.ts', 2000, 100).keep, true, 'Should keep typescript source');
assert.strictEqual(shouldKeepFile('README.md', 1500, 100).keep, true, 'Should keep README');
console.log('✅ File filtering test passed');

// 3. Test Secret Redaction
console.log('Testing Secret Redaction...');
const secretText = 'const apiKey = "sk-1234567890abcdef1234567890abcdef";';
const redacted = redactSecrets(secretText);
assert.ok(!redacted.includes('sk-1234567890abcdef1234567890abcdef'), 'Should redact OpenAI keys');
assert.ok(redacted.includes('[REDACTED]'), 'Should contain [REDACTED]');
console.log('✅ Secret redaction test passed');

// 4. Test Priority Scoring
console.log('Testing Priority Scoring...');
const readmeScore = calculatePriority('README.md', 1000);
const packageJsonScore = calculatePriority('package.json', 1000);
const routeScore = calculatePriority('src/app/api/route.ts', 1500);
const testScore = calculatePriority('src/app/page.test.ts', 1500);

assert.ok(readmeScore > routeScore, 'README should have higher priority than route');
assert.ok(packageJsonScore > routeScore, 'Manifest should have higher priority than route');
assert.ok(routeScore > testScore, 'Route should have higher priority than test');

const files = [
  { path: 'test.ts', language: 'TypeScript', sizeBytes: 500, lineCount: 20, priority: 20, content: '' },
  { path: 'README.md', language: 'Markdown', sizeBytes: 1000, lineCount: 40, priority: 100, content: '' },
  { path: 'app.ts', language: 'TypeScript', sizeBytes: 800, lineCount: 30, priority: 80, content: '' },
];
const sorted = prioritizeFiles(files, 2);
assert.strictEqual(sorted.length, 2, 'Should limit to maxFiles');
assert.strictEqual(sorted[0].path, 'README.md', 'Top file should be README');
console.log('✅ Priority scoring test passed');

// 5. Test Citation Parsing & Validation
console.log('Testing Citation Parsing & Validation...');
const sampleAnswer = 'The database schema is defined in [[src/db/schema.ts:12-45]], while auth is in [[src/auth.ts:10]].';
const fileMap = new Map<string, number>([
  ['src/db/schema.ts', 100],
  ['src/auth.ts', 50],
]);
const citations = parseCitations(sampleAnswer, fileMap);
assert.strictEqual(citations.length, 2, 'Should parse exactly 2 citations');
assert.strictEqual(citations[0].path, 'src/db/schema.ts');
assert.strictEqual(citations[0].startLine, 12);
assert.strictEqual(citations[0].endLine, 45);
assert.strictEqual(citations[1].path, 'src/auth.ts');
assert.strictEqual(citations[1].startLine, 10);
assert.strictEqual(citations[1].endLine, 10);

// Out of bounds citation test
const invalidAnswer = 'Check [[src/auth.ts:200-250]]'; // only 50 lines exist
const invalidCitations = parseCitations(invalidAnswer, fileMap);
assert.strictEqual(invalidCitations.length, 0, 'Should drop out of bounds citations');
console.log('✅ Citation parsing & validation test passed');

console.log('\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');
