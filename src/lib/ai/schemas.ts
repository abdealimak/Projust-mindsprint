import { z } from 'zod';

export const ProjectSummarySchema = z.object({
  oneLiner: z.string().describe('What the project does in one punchy sentence'),
  projectType: z.string().describe('e.g. "Full-stack e-commerce web app"'),
  techStack: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })),
  architecture: z.string().describe('3-6 sentence plain-English architectural overview'),
  entryPoints: z.array(z.object({
    path: z.string(),
    why: z.string(),
  })),
  keyFlows: z.array(z.object({
    name: z.string(),
    description: z.string(),
    files: z.array(z.string()),
  })),
  notableFiles: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
  })),
  complexity: z.enum(['beginner', 'intermediate', 'advanced']),
  suggestedQuestions: z.array(z.string()).max(6).describe('Starter questions for the tutor'),
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const FileRouterSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    reason: z.string(),
  })).max(10),
});

export type FileRouterResult = z.infer<typeof FileRouterSchema>;
