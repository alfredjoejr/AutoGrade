// lib/agents/consensus-engine.ts
// Compares results from two AI agents and produces a consensus with per-question analysis

import type {
  ConsensusQuestionResult,
  ConsensusSummary,
  ConsensusStatus,
} from './agent-types';

/** Normalize answer string for comparison */
function normalizeAnswer(answer: string | null | undefined): string | null {
  if (answer === null || answer === undefined || answer === '') return null;
  return String(answer).trim().toUpperCase();
}

/**
 * Compare two agents' master key extraction results question by question.
 * Each agent returns an array of { id, answer, confidence }.
 */
export function compareKeyExtractions(
  agentAAnswers: Array<{ id: number; answer: string | null; confidence: number }>,
  agentBAnswers: Array<{ id: number; answer: string | null; confidence: number }>
): { consensus: ConsensusQuestionResult[]; summary: ConsensusSummary } {
  // Build lookup maps
  const mapA = new Map(agentAAnswers.map((a) => [a.id, a]));
  const mapB = new Map(agentBAnswers.map((b) => [b.id, b]));

  // Union all question IDs
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
  const sortedIds = Array.from(allIds).sort((a, b) => a - b);

  const consensus: ConsensusQuestionResult[] = sortedIds.map((qId) => {
    const a = mapA.get(qId);
    const b = mapB.get(qId);

    const aAnswer = normalizeAnswer(a?.answer);
    const bAnswer = normalizeAnswer(b?.answer);
    const aConf = a?.confidence ?? 0;
    const bConf = b?.confidence ?? 0;

    let status: ConsensusStatus;
    let recommended: string | null;

    if (aAnswer === bAnswer) {
      // Both agree on the answer
      const confDiff = Math.abs(aConf - bConf);
      status = confDiff > 20 ? 'partial' : 'agreed';
      recommended = aAnswer;
    } else if (aAnswer === null && bAnswer !== null) {
      // Agent A returned null, B found something — take B with caution
      status = 'disagreed';
      recommended = bAnswer;
    } else if (bAnswer === null && aAnswer !== null) {
      // Agent B returned null, A found something — take A with caution
      status = 'disagreed';
      recommended = aAnswer;
    } else {
      // Different answers — recommend the higher confidence one
      status = 'disagreed';
      recommended = aConf >= bConf ? aAnswer : bAnswer;
    }

    return {
      questionId: qId,
      agentAAnswer: aAnswer,
      agentAConfidence: aConf,
      agentBAnswer: bAnswer,
      agentBConfidence: bConf,
      consensusStatus: status,
      recommendedAnswer: recommended,
      avgConfidence: Math.round((aConf + bConf) / 2),
    };
  });

  const summary = buildSummary(consensus);
  return { consensus, summary };
}

/**
 * Compare two agents' student grading results question by question.
 * Each agent returns an array of { id, detected, confidence }.
 */
export function compareGradingResults(
  agentAResults: Array<{ id: number; detected: string | null; confidence: number }>,
  agentBResults: Array<{ id: number; detected: string | null; confidence: number }>
): { consensus: ConsensusQuestionResult[]; summary: ConsensusSummary } {
  // Reuse the same comparison logic — detected maps to answer
  const aAsAnswers = agentAResults.map((r) => ({
    id: r.id,
    answer: r.detected,
    confidence: r.confidence,
  }));
  const bAsAnswers = agentBResults.map((r) => ({
    id: r.id,
    answer: r.detected,
    confidence: r.confidence,
  }));

  return compareKeyExtractions(aAsAnswers, bAsAnswers);
}

/**
 * Build summary statistics from consensus results.
 */
function buildSummary(consensus: ConsensusQuestionResult[]): ConsensusSummary {
  const total = consensus.length;
  const agreedCount = consensus.filter((c) => c.consensusStatus === 'agreed').length;
  const disagreedCount = consensus.filter((c) => c.consensusStatus === 'disagreed').length;
  const partialCount = consensus.filter((c) => c.consensusStatus === 'partial').length;
  const agreementRate = total > 0 ? Math.round((agreedCount / total) * 100) : 0;

  return {
    totalQuestions: total,
    agreedCount,
    disagreedCount,
    partialCount,
    agreementRate,
    autoApprovable: agreementRate >= 95 && disagreedCount === 0,
  };
}

/**
 * Merge consensus results into a final answer array,
 * applying any teacher overrides.
 */
export function mergeWithOverrides(
  consensus: ConsensusQuestionResult[],
  overrides?: Array<{ questionId: number; overrideAnswer: string }>
): Array<{ id: number; answer: string | null; confidence: number }> {
  const overrideMap = new Map(
    (overrides || []).map((o) => [o.questionId, o.overrideAnswer])
  );

  return consensus.map((c) => {
    const override = overrideMap.get(c.questionId);
    return {
      id: c.questionId,
      answer: override ? override.toUpperCase() : c.recommendedAnswer,
      confidence: override ? 100 : c.avgConfidence,
    };
  });
}
