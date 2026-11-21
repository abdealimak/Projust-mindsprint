import zlib from 'zlib';
import tar from 'tar-stream';
import { generateObject } from 'ai';
import { Octokit } from '@octokit/rest';
import { createClient } from '@/lib/supabase/server';
import { shouldKeepFile, detectLanguage, redactSecrets } from './filterFiles';
import { calculatePriority, prioritizeFiles, ScoredFile } from './prioritize';
import { checkOwnership } from './ownership';
import { llmFastModel } from '@/lib/ai/provider';
import { SUMMARY_SYSTEM_PROMPT } from '@/lib/ai/prompts/summary';
import { ProjectSummarySchema, ProjectSummary } from '@/lib/ai/schemas';

interface PipelineOptions {
  projectId: string;
  octokit: Octokit;
  owner: string;
  repo: string;
  username?: string | null;
}

export async function runIngestionPipeline({
  projectId,
  octokit,
  owner,
  repo,
  username,
}: PipelineOptions) {
  const supabase = createClient();

  const updateStatus = async (status: string, detail: string) => {
    try {
      await supabase
        .from('projects')
        .update({ status, status_detail: detail, updated_at: new Date().toISOString() })
        .eq('id', projectId);
    } catch (err) {
      console.error('Failed to update project status:', err);
    }
  };

  try {
    // 1. Fetch metadata
    await updateStatus('ingesting', 'Fetching repository metadata & commit history...');
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch || 'main';

    const { data: branchData } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: defaultBranch,
    });
    const commitSha = branchData.commit.sha;

    // 2. Download source tarball
    await updateStatus('ingesting', 'Downloading repository archive...');
    const maxMb = parseInt(process.env.MAX_REPO_ARCHIVE_MB || '25', 10);
    const maxFileKb = parseInt(process.env.MAX_FILE_KB || '100', 10);
    const maxFiles = parseInt(process.env.MAX_FILES_PER_PROJECT || '400', 10);

    const rawFiles: ScoredFile[] = [];

    try {
      const archiveRes = await octokit.repos.downloadTarballArchive({
        owner,
        repo,
        ref: commitSha,
      });

      const buffer = Buffer.from(archiveRes.data as ArrayBuffer);
      if (buffer.length > maxMb * 1024 * 1024) {
        throw new Error(`Repository archive exceeds maximum limit of ${maxMb}MB`);
      }

      await new Promise<void>((resolve, reject) => {
        const extract = tar.extract();

        extract.on('entry', (header, stream, next) => {
          // GitHub tarballs prefix root folder (e.g. owner-repo-sha/path)
          const rawPath = header.name;
          const cleanPath = rawPath.substring(rawPath.indexOf('/') + 1);

          if (header.type === 'file' && cleanPath) {
            const chunks: Buffer[] = [];
            stream.on('data', (c: unknown) => {
              if (Buffer.isBuffer(c)) {
                chunks.push(c);
              } else if (typeof c === 'string') {
                chunks.push(Buffer.from(c, 'utf8'));
              } else if (c instanceof Uint8Array) {
                chunks.push(Buffer.from(c));
              }
            });
            stream.on('end', () => {
              const fileBuf = Buffer.concat(chunks);
              // Check null bytes (binary indicator)
              let hasNullByte = false;
              for (let i = 0; i < Math.min(fileBuf.length, 1024); i++) {
                if (fileBuf[i] === 0) {
                  hasNullByte = true;
                  break;
                }
              }

              if (!hasNullByte) {
                const { keep } = shouldKeepFile(cleanPath, fileBuf.length, maxFileKb);
                if (keep) {
                  const content = redactSecrets(fileBuf.toString('utf8'));
                  const lineCount = content.split('\n').length;
                  const language = detectLanguage(cleanPath);
                  const priority = calculatePriority(cleanPath, fileBuf.length);

                  rawFiles.push({
                    path: cleanPath,
                    language,
                    sizeBytes: fileBuf.length,
                    lineCount,
                    priority,
                    content,
                  });
                }
              }
              next();
            });
            stream.resume();
          } else {
            stream.resume();
            next();
          }
        });

        extract.on('finish', resolve);
        extract.on('error', reject);

        const gunzip = zlib.createGunzip();
        gunzip.on('error', reject);

        gunzip.pipe(extract);
        gunzip.end(buffer);
      });
    } catch (tarErr) {
      console.warn('Tarball download failed, attempting tree fallback:', tarErr);
      // Fallback: Git Trees API for key files
      const { data: treeData } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: 'true',
      });

      for (const item of (treeData.tree || []).slice(0, 150)) {
        if (item.type === 'blob' && item.path) {
          const { keep } = shouldKeepFile(item.path, item.size || 0, maxFileKb);
          if (keep && item.sha) {
            try {
              const { data: blobData } = await octokit.git.getBlob({
                owner,
                repo,
                file_sha: item.sha,
              });
              const content = redactSecrets(
                Buffer.from(blobData.content, 'base64').toString('utf8')
              );
              rawFiles.push({
                path: item.path,
                language: detectLanguage(item.path),
                sizeBytes: item.size || content.length,
                lineCount: content.split('\n').length,
                priority: calculatePriority(item.path, item.size || 0),
                content,
              });
            } catch {
              // skip blob error
            }
          }
        }
      }
    }

    // 3. Prioritize & Limit files
    await updateStatus('indexing', `Filtering and prioritizing ${rawFiles.length} files...`);
    const prioritized = prioritizeFiles(rawFiles, maxFiles);

    // 4. Check ownership
    await updateStatus('indexing', 'Evaluating author contribution & ownership metrics...');
    const ownership = await checkOwnership(octokit, owner, repo, username);

    // 5. Store files in project_files
    await updateStatus('indexing', `Indexing ${prioritized.length} files into full-text search...`);
    // Delete existing project files for idempotency
    await supabase.from('project_files').delete().eq('project_id', projectId);

    // Batch insert files in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < prioritized.length; i += chunkSize) {
      const chunk = prioritized.slice(i, i + chunkSize).map((f) => ({
        project_id: projectId,
        path: f.path,
        language: f.language,
        size_bytes: f.sizeBytes,
        line_count: f.lineCount,
        priority: f.priority,
        content: f.content,
      }));
      await supabase.from('project_files').insert(chunk);
    }

    // 6. Generate Project Summary with LLM
    await updateStatus('summarizing', 'Generating architectural overview and key flows...');

    let summary: ProjectSummary;
    try {
      // Build compact context of top-priority files (README, manifests, entrypoints)
      const topFiles = prioritized.slice(0, 8);
      const fileTreeText = prioritized.map((f) => `- ${f.path} (${f.language}, ${f.lineCount} lines)`).join('\n');
      const sampleContents = topFiles
        .map((f) => `### File: ${f.path}\n\`\`\`${f.language}\n${f.content.slice(0, 3000)}\n\`\`\``)
        .join('\n\n');

      const promptText = `Analyze this codebase:\n\nFILE TREE:\n${fileTreeText}\n\nKEY FILE CONTENTS:\n${sampleContents}`;

      const { object } = await generateObject({
        model: llmFastModel,
        system: SUMMARY_SYSTEM_PROMPT,
        prompt: promptText,
        schema: ProjectSummarySchema,
      });

      // Validate that cited entryPoints and notableFiles exist
      const validPaths = new Set(prioritized.map((f) => f.path));
      summary = {
        ...object,
        entryPoints: object.entryPoints.filter((e) => validPaths.has(e.path)),
        notableFiles: object.notableFiles.filter((n) => validPaths.has(n.path)),
      };
    } catch (llmErr) {
      console.warn('LLM summary generation failed or timed out. Falling back to structured heuristic:', llmErr);
      summary = {
        oneLiner: `${repoData.description || `${owner}/${repo}`} repository.`,
        projectType: repoData.language ? `${repoData.language} Application` : 'Software Project',
        techStack: [{ name: repoData.language || 'Code', role: 'Primary Language' }],
        architecture: `The repository contains ${prioritized.length} analyzed source files organized across standard directory conventions.`,
        entryPoints: prioritized.filter((f) => f.priority >= 80).slice(0, 3).map((f) => ({ path: f.path, why: 'Entry point' })),
        keyFlows: [{ name: 'Core Pipeline', description: 'Primary application execution path', files: prioritized.slice(0, 3).map((f) => f.path) }],
        notableFiles: prioritized.slice(0, 5).map((f) => ({ path: f.path, purpose: f.language })),
        complexity: 'intermediate',
        suggestedQuestions: [
          'What is the high-level architecture of this system?',
          'Where are the main database models or data schemas defined?',
          'How does the application handle error handling and failure recovery?',
          'What are the primary external dependencies and entry points?',
        ],
      };
    }

    // 7. Complete & Mark Ready
    await supabase
      .from('projects')
      .update({
        status: 'ready',
        status_detail: 'Ready for architecture exploration and AI viva tutoring.',
        default_branch: defaultBranch,
        commit_sha: commitSha,
        is_private: repoData.private,
        is_fork: ownership.isFork,
        primary_language: repoData.language || 'Unknown',
        ownership_pct: ownership.ownershipPct,
        ownership_status: ownership.ownershipStatus,
        file_count: prioritized.length,
        summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return { ok: true, projectId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Ingestion failed';
    console.error('Ingestion pipeline failed:', err);
    await updateStatus('failed', errorMsg);
    throw err;
  }
}
