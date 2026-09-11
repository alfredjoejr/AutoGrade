// lib/agents/agent-runner.ts
// Dual-agent orchestrator — runs two AI agents in parallel with different models/temperatures

import { GoogleGenAI } from '@google/genai';
import type { AgentConfig, AgentResult } from './agent-types';
import { AGENT_CONFIGS } from './agent-types';

export interface DualAgentTaskOptions {
  apiKey: string;
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  responseMimeType?: string;
  /** Override default agent configs if needed */
  agentConfigs?: [AgentConfig, AgentConfig];
}

/**
 * Run a single AI agent with the given configuration.
 * Returns a structured AgentResult regardless of success or failure.
 */
async function runSingleAgent<T = any>(
  config: AgentConfig,
  options: DualAgentTaskOptions
): Promise<AgentResult<T>> {
  const startTime = Date.now();
  const {
    apiKey,
    prompt,
    imageBase64,
    mimeType = 'image/jpeg',
    responseMimeType = 'application/json',
  } = options;

  try {
    console.log(
      `[${config.label}] Starting extraction with model: ${config.model} (temp=${config.temperature})`
    );

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: config.model,
      contents: [
        prompt,
        { inlineData: { data: imageBase64, mimeType } },
      ],
      config: {
        responseMimeType,
        temperature: config.temperature,
      },
    });

    const rawText = response.text || '';
    const cleanedText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const data = JSON.parse(cleanedText || '{}') as T;

    const durationMs = Date.now() - startTime;
    console.log(
      `[${config.label}] Completed successfully in ${durationMs}ms via ${config.model}`
    );

    return {
      agentId: config.id,
      label: config.label,
      model: config.model,
      temperature: config.temperature,
      data,
      rawText: cleanedText,
      success: true,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err?.message || String(err);
    console.error(
      `[${config.label}] Failed after ${durationMs}ms: ${errorMsg}`
    );

    return {
      agentId: config.id,
      label: config.label,
      model: config.model,
      temperature: config.temperature,
      data: {} as T,
      rawText: '',
      success: false,
      error: errorMsg,
      durationMs,
    };
  }
}

/**
 * Run two AI agents in parallel using Promise.allSettled.
 * If one fails, the other's result is still returned (single-agent fallback).
 * If both fail, an error is thrown.
 */
export async function runDualAgents<T = any>(
  options: DualAgentTaskOptions
): Promise<{
  agentA: AgentResult<T>;
  agentB: AgentResult<T>;
  bothSucceeded: boolean;
  singleAgentFallback: boolean;
}> {
  const configs = options.agentConfigs || AGENT_CONFIGS;
  const [configA, configB] = configs;

  console.log(
    `[DualAgent] Spawning parallel agents: ${configA.label} (${configA.model}) + ${configB.label} (${configB.model})`
  );

  const [resultA, resultB] = await Promise.allSettled([
    runSingleAgent<T>(configA, options),
    runSingleAgent<T>(configB, options),
  ]);

  const agentA: AgentResult<T> =
    resultA.status === 'fulfilled'
      ? resultA.value
      : {
          agentId: configA.id,
          label: configA.label,
          model: configA.model,
          temperature: configA.temperature,
          data: {} as T,
          rawText: '',
          success: false,
          error: resultA.reason?.message || 'Agent A failed unexpectedly',
          durationMs: 0,
        };

  const agentB: AgentResult<T> =
    resultB.status === 'fulfilled'
      ? resultB.value
      : {
          agentId: configB.id,
          label: configB.label,
          model: configB.model,
          temperature: configB.temperature,
          data: {} as T,
          rawText: '',
          success: false,
          error: resultB.reason?.message || 'Agent B failed unexpectedly',
          durationMs: 0,
        };

  const bothSucceeded = agentA.success && agentB.success;
  const singleAgentFallback = !bothSucceeded && (agentA.success || agentB.success);

  if (!agentA.success && !agentB.success) {
    throw new Error(
      `Both agents failed. Agent A: ${agentA.error} | Agent B: ${agentB.error}`
    );
  }

  if (singleAgentFallback) {
    const surviving = agentA.success ? configA.label : configB.label;
    console.warn(
      `[DualAgent] WARNING: Single-agent fallback mode — only ${surviving} succeeded`
    );
  } else {
    console.log(
      `[DualAgent] Both agents completed successfully. Ready for consensus.`
    );
  }

  return { agentA, agentB, bothSucceeded, singleAgentFallback };
}
