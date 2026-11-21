import { recordUsage, withUsage, withUsageSync } from '@/lib/ai/usage';
import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { generateJSON } from '@/lib/brain/llm';
import { createClient } from '@/lib/supabase/server';
import { llmModel } from '@/lib/ai/provider';
import { claudeTextStreamResponse, isClaudeConfigured } from '@/lib/ai/claude';
import { ASK_SYSTEM_PROMPT } from '@/lib/ai/prompts/ask';
import { ROUTER_SYSTEM_PROMPT } from '@/lib/ai/prompts/router';
import { FileRouterSchema } from '@/lib/ai/schemas';
import { parseCitations, formatNumberedFile } from '@/lib/ai/citations';
import { getCurrentUser } from '@/lib/auth/user';
import { demoTutorAnswer, isDemoProject } from '@/lib/brain/demo';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: projectId } = params;

  try {
    const { question, threadId, level = 'intermediate' } = await request.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const userId = user.uid;

    // Demo users get a canned, grounded answer for the sample project (never an AI call)
    if (user.demo) {
      if (!isDemoProject(projectId)) {
        return NextResponse.json({ error: 'Sample data is available for alexchen-dev/shop-api only.' }, { status: 404 });
      }
      return demoTextStream(demoTutorAnswer(question));
    }

    const supabase = createClient();

    // 1. Enforce Daily Usage Limit
    const today = new Date().toISOString().split('T')[0];
    const freeLimit = parseInt(process.env.FREE_DAILY_ASK_LIMIT || '20', 10);

    const { data: usageRow } = await supabase
      .from('usage_daily')
      .select('ask_count')
      .eq('user_id', userId)
      .eq('day', today)
      .maybeSingle();

    const currentCount = usageRow?.ask_count || 0;
    if (currentCount >= freeLimit) {
      return NextResponse.json(
        { error: `Daily question limit reached (${freeLimit}/${freeLimit} questions). Try again tomorrow or upgrade.` },
        { status: 429 }
      );
    }

    // 2. Fetch Project Summary & Metadata
    const { data: project } = await supabase
      .from('projects')
      .select('id, repo_full_name, summary')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 3. Candidate Generation (File Router + FTS)
    const { data: allFiles } = await supabase
      .from('project_files')
      .select('path, language, line_count, priority')
      .eq('project_id', projectId);

    const fileList = allFiles || [];
    const validFileMap = new Map<string, number>(fileList.map((f) => [f.path, f.line_count]));

    // Fast LLM File Router
    const fileTreeSnippet = fileList.map((f) => `${f.path} (${f.language})`).slice(0, 150).join('\n');
    let candidatePaths: string[] = [];

    try {
      const routeResult = await withUsage({ projectId, step: 'tutor' }, () => generateJSON({
        schema: FileRouterSchema,
        system: ROUTER_SYSTEM_PROMPT,
        prompt: `Question: ${question}\n\nProject Summary: ${JSON.stringify(project.summary)}\n\nFile Tree:\n${fileTreeSnippet}`,
        fast: true,
        retries: 1,
        maxOutputTokens: 800,
      }));
      candidatePaths = routeResult.files.map((f) => f.path);
    } catch {
      // Fallback to highest priority files
      candidatePaths = fileList.slice(0, 8).map((f) => f.path);
    }

    // Keyword Search (Secondary)
    const terms = question.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).slice(0, 3).join(' | ');
    if (terms) {
      const { data: searchMatches } = await supabase
        .from('project_files')
        .select('path')
        .eq('project_id', projectId)
        .textSearch('tsv', terms, { config: 'simple' })
        .limit(6);

      if (searchMatches) {
        for (const m of searchMatches) {
          if (!candidatePaths.includes(m.path)) {
            candidatePaths.push(m.path);
          }
        }
      }
    }

    // Always ensure README is included if question is general
    if (fileList.some((f) => f.path.toLowerCase().includes('readme')) && !candidatePaths.some((p) => p.toLowerCase().includes('readme'))) {
      const readme = fileList.find((f) => f.path.toLowerCase().includes('readme'));
      if (readme) candidatePaths.unshift(readme.path);
    }

    // 4. Load full contents within Token Budget
    const maxBudgetChars = (parseInt(process.env.ASK_CONTEXT_TOKEN_BUDGET || '60000', 10)) * 4;
    const { data: fullContents } = await supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', projectId)
      .in('path', candidatePaths.slice(0, 10));

    let accumulatedChars = 0;
    const contextSnippets: string[] = [];

    for (const file of fullContents || []) {
      const formatted = formatNumberedFile(file.path, file.content);
      if (accumulatedChars + formatted.length <= maxBudgetChars) {
        contextSnippets.push(formatted);
        accumulatedChars += formatted.length;
      }
    }

    // 5. Ensure Chat Thread exists
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const { data: newThread } = await supabase
        .from('chat_threads')
        .insert({
          project_id: projectId,
          user_id: userId,
          title: question.slice(0, 40),
        })
        .select('id')
        .single();
      activeThreadId = newThread?.id;
    }

    // Save User Message
    if (activeThreadId) {
      await supabase.from('chat_messages').insert({
        thread_id: activeThreadId,
        role: 'user',
        content: question,
      });
    }

    // Increment Usage
    await supabase.from('usage_daily').upsert({
      user_id: userId,
      day: today,
      ask_count: currentCount + 1,
    });

    // 6. Stream Answer with LLM
    const userPrompt = `USER LEVEL: ${level}

PROJECT ARCHITECTURAL SUMMARY:
${JSON.stringify(project.summary, null, 2)}

NUMBERED CODEBASE FILES:
${contextSnippets.join('\n\n')}

QUESTION:
${question}`;

    const saveAnswer = async (text: string) => {
      // Parse & validate citations
      const citations = parseCitations(text, validFileMap);
      if (activeThreadId) {
        await supabase.from('chat_messages').insert({
          thread_id: activeThreadId,
          role: 'assistant',
          content: text,
          citations,
        });
      }
    };

    if (isClaudeConfigured) {
      return withUsageSync({ projectId, step: 'tutor' }, () => claudeTextStreamResponse({
        system: ASK_SYSTEM_PROMPT,
        prompt: userPrompt,
        headers: { 'x-thread-id': activeThreadId || '' },
        onFinish: saveAnswer,
      }));
    }

    const result = streamText({
      model: llmModel,
      system: ASK_SYSTEM_PROMPT,
      prompt: userPrompt,
      onFinish: ({ text, usage, response }) => {
        recordUsage(response?.modelId || 'fallback', { input_tokens: usage?.inputTokens, output_tokens: usage?.outputTokens, cache_read_input_tokens: usage?.inputTokenDetails?.cacheReadTokens }, 'tutor');
        return saveAnswer(text);
      },
    });

    return result.toTextStreamResponse({
      headers: {
        'x-thread-id': activeThreadId || '',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing question';
    console.error('Ask route error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Stream a fixed answer in small chunks so the demo tutor looks like the live one. */
function demoTextStream(text: string): Response {
  const encoder = new TextEncoder();
  const chunks = text.match(/\S+\s*/g) || [text];
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'x-thread-id': '' } });
}
