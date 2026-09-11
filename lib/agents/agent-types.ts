// lib/agents/agent-types.ts
// Type definitions for the dual-agent consensus grading system

import type { VisionModelName } from '@/lib/vision-ai';

/** Configuration for a single AI agent */
export interface AgentConfig {
  id: 'agent-a' | 'agent-b';
  label: string;
  model: VisionModelName;
  temperature: number;
}

/** Result from a single agent's extraction or grading */
export interface AgentResult<T = any> {
  agentId: 'agent-a' | 'agent-b';
  label: string;
  model: string;
  temperature: number;
  data: T;
  rawText: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

/** Per-question consensus status */
export type ConsensusStatus = 'agreed' | 'disagreed' | 'partial';

/** Per-question consensus comparison result */
export interface ConsensusQuestionResult {
  questionId: number;
  agentAAnswer: string | null;
  agentAConfidence: number;
  agentBAnswer: string | null;
  agentBConfidence: number;
  consensusStatus: ConsensusStatus;
  /** The recommended final answer (agreed value, or higher-confidence agent's answer) */
  recommendedAnswer: string | null;
  /** Average confidence across agents */
  avgConfidence: number;
}

/** Summary statistics for a consensus comparison */
export interface ConsensusSummary {
  totalQuestions: number;
  agreedCount: number;
  disagreedCount: number;
  partialCount: number;
  /** Percentage of questions where both agents fully agree */
  agreementRate: number;
  /** True if agreement rate >= 95% and no critical disagreements */
  autoApprovable: boolean;
}

/** Full dual-agent result for master key extraction */
export interface DualAgentKeyResult {
  agentA: AgentResult<{ detectedTotalQuestions: number; answers: Array<{ id: number; answer: string | null; confidence: number }> }>;
  agentB: AgentResult<{ detectedTotalQuestions: number; answers: Array<{ id: number; answer: string | null; confidence: number }> }>;
  consensus: ConsensusQuestionResult[];
  summary: ConsensusSummary;
  /** Merged final answers (using recommended from consensus) */
  mergedAnswers: Array<{ id: number; answer: string | null; confidence: number }>;
  /** Whether only one agent succeeded (fallback mode) */
  singleAgentFallback: boolean;
}

/** Full dual-agent result for student grading */
export interface DualAgentGradeResult {
  agentA: AgentResult<{ results: Array<{ id: number; detected: string | null; confidence: number }> }>;
  agentB: AgentResult<{ results: Array<{ id: number; detected: string | null; confidence: number }> }>;
  consensus: ConsensusQuestionResult[];
  summary: ConsensusSummary;
  /** Final graded results after consensus merge */
  finalResults: Array<{
    id: number;
    detected: string | null;
    correct: string;
    status: 'correct' | 'incorrect' | 'ambiguous';
    confidence: number;
    consensusStatus: ConsensusStatus;
    agentADetected: string | null;
    agentBDetected: string | null;
  }>;
  singleAgentFallback: boolean;
}

/** Approval status for a grading or extraction result */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'manual_review';

/** Teacher override for a specific question during approval */
export interface TeacherOverride {
  questionId: number;
  overrideAnswer: string;
  reason?: string;
}

/** Default agent configurations */
export const AGENT_CONFIGS: [AgentConfig, AgentConfig] = [
  {
    id: 'agent-a',
    label: 'Agent Alpha',
    model: 'gemini-2.5-flash',
    temperature: 0.1,
  },
  {
    id: 'agent-b',
    label: 'Agent Beta',
    model: 'gemini-3.5-flash',
    temperature: 0.2,
  },
];
