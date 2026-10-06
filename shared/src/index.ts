import { z } from 'zod';

export const STAGES = ['scout', 'forensics', 'judge', 'synthesizer'] as const;
export const DIMENSIONS = ['systemsRigor', 'algorithmicDepth', 'testingVerification', 'collaborationHygiene'] as const;
export const WEIGHTS = { systemsRigor: .30, algorithmicDepth: .25, testingVerification: .25, collaborationHygiene: .20 };
export const RULE_VERSION = 'forensics-v1';
export const RUBRIC_VERSION = 'jev-v1';
export const PROMPT_VERSION = 'judge-v1';
export const Repository = z.string().trim().transform(value => value.replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '').replace(/\.git$/, '')).pipe(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/).refine(s => !s.endsWith('/.') && !s.endsWith('/..'), 'Invalid repository'));
export const AuditInput = z.object({
  workflow: z.enum(['hackathon', 'recruiting']), cohortId: z.uuid(),
  repositories: z.array(Repository).min(1).max(5).refine(v => new Set(v.map(r => r.toLowerCase())).size === v.length, 'Duplicate repositories'),
  candidateName: z.string().trim().min(1).max(200), githubUsername: z.string().regex(/^[A-Za-z0-9-]{1,39}$/).optional(),
  sprint: z.object({ start: z.iso.datetime({offset: true}), end: z.iso.datetime({offset: true}) }).refine(v => Date.parse(v.start) < Date.parse(v.end), 'Sprint end must follow start').optional(),
  team: z.array(z.string().trim().min(1).max(100)).max(30).default([]), jobDescription: z.string().max(12000).optional(),
}).strict().refine(v => v.workflow !== 'hackathon' || v.repositories.length === 1, 'Hackathon submissions use one repository');
export type AuditSubmission = z.infer<typeof AuditInput>;
export const EvidenceSchema = z.object({
  id: z.string(), repository: z.string(), sha: z.string().regex(/^[a-f0-9]{40,64}$/),
  kind: z.enum(['code', 'commit', 'metadata', 'ci', 'review', 'dataset', 'comparison']),
  path: z.string(), content: z.string(), hash: z.string(), sourceUrl: z.url(), retrievedAt: z.string(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;
export const CitationSchema = z.object({ evidenceId: z.string(), startLine: z.number().int().positive().optional(), endLine: z.number().int().positive().optional(), excerpt: z.string().min(1).max(1600) }).strict();
export const DimensionSchema = z.object({ level: z.number().int().min(0).max(4).nullable(), rationale: z.string().max(3000), citations: z.array(CitationSchema).max(10) }).strict();
export const JudgeOutput = z.object({ dimensions: z.object(Object.fromEntries(DIMENSIONS.map(k => [k, DimensionSchema])) as Record<typeof DIMENSIONS[number], typeof DimensionSchema>), summary: z.string().max(4000), roleFit: z.object({ rationale: z.string().max(3000), citations: z.array(CitationSchema).max(10) }).nullable() }).strict();
export type Judgment = z.infer<typeof JudgeOutput>;
export type Finding = { pillar: string; status: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN'; observations: string[]; evidenceIds: string[]; coverage: string; ruleVersion: string };
export type Coverage = { complete: boolean; limitations: string[]; filesAnalyzed: number; commitsAnalyzed: number; excludedFiles: number };
export type Snapshot = { repository: string; sha: string; evidence: Evidence[]; coverage: Coverage; commits: {sha: string; author: string; email: string; authorDate: string; commitDate: string; additions: number; deletions: number; meaningfulAdditions: number; meaningfulDeletions: number}[]; blame: Record<string, number>; metadata: Record<string, any> };
