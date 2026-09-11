// Shared types for AutoGrade

export type QuestionResult = {
  id: number;
  detected: string | null;
  correct: string;
  status: 'correct' | 'incorrect' | 'ambiguous';
  confidence?: number;
};

export type StudentGradingResult = {
  studentId: string;          // Extracted from filename (e.g., "STU001.jpg" → "STU001")
  fileName: string;           // Original filename
  imageBase64: string;        // Scanned sheet for moderation view
  results: QuestionResult[];  // Per-question grading
  score: number;              // Percentage (correct / total * 100)
  status: 'marked' | 'reviewed';
  gradedAt: string;           // ISO timestamp
};

export type BatchSession = {
  id: string;                         // UUID
  totalQuestions: number;
  masterKey: Record<number, string>;
  threshold: number;
  students: StudentGradingResult[];
  createdAt: string;
};

// ─── Dual-Agent Consensus Types ──────────────────────────────────────

import type { ConsensusStatus } from '@/lib/agents/agent-types';

/** Extended question result with consensus metadata from dual agents */
export type ConsensusQuestionResultView = QuestionResult & {
  consensusStatus: ConsensusStatus;
  agentADetected: string | null;
  agentBDetected: string | null;
};

/** Student grading result enriched with dual-agent consensus data */
export type DualAgentStudentResult = StudentGradingResult & {
  consensusResults?: ConsensusQuestionResultView[];
  agreementRate?: number;
  singleAgentFallback?: boolean;
  approvalStatus: ApprovalStatus;
};

/** Approval status for teacher review gate */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'manual_review';
