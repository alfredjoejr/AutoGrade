import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function startWorker() {
  const { Worker } = await import('bullmq');
  const { redisConnection } = await import('./lib/queue');
  const { initSchema, getRecentCorrections } = await import('./lib/db');
  const { runDualAgents } = await import('./lib/agents/agent-runner');
  const { compareGradingResults } = await import('./lib/agents/consensus-engine');

  console.log("Starting BullMQ Grade Worker (Dual-Agent Mode)...");

const worker = new Worker('GradeQueue', async (job) => {
  console.log(`Processing job ${job.id}`);
  
  const { imageBase64, mimeType, masterKey, totalQuestions, threshold } = job.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  await initSchema();

  const recentCorrections = await getRecentCorrections('student_moderation', 6);
  const fewShotSection = recentCorrections.length > 0
    ? `\n6. DYNAMIC FEW-SHOT CORRECTIONS (Verified ground truth from previous teacher moderation):\n` +
      recentCorrections.map(c => `   - Question ${c.questionId}: Verified student mark is "${c.teacherCorrected}". Previous AI detected: "${c.aiDetected || 'none'}."`).join('\n') + '\n'
    : '';

  const prompt = `
    You are an expert OCR and grading vision assistant.
    I am providing an image of a student multiple choice answer sheet.
    There are ${totalQuestions} questions in total (Q1 to Q${totalQuestions}).
    The master key is: ${JSON.stringify(masterKey)}
    
    CRITICAL EXTRACTION GUIDELINES:
    1. Match each question strictly by its PRINTED question number label (e.g. "1.", "2.", ... "${totalQuestions}.").
    2. If a printed line number is duplicated on the sheet (e.g. two rows labeled 19), consolidate them into that question; do not let duplicate rows shift subsequent questions.
    3. Marks can be: checkmarks (✓), bubbled/shaded boxes or circles, letters inside checkboxes (e.g. [A]), or circled letters.
    4. If multiple options are marked on a question without a clear scratch-out, return multiple letters (e.g., 'A,C') or return the primary mark with lower confidence (e.g., 60-70) so it is flagged for manual teacher moderation.
    5. If blank, return null for detected with confidence 0.
    6. Confidence score must be an INTEGER between 0 and 100 (e.g. 95-100 for clear unambiguous mark, 60-75 for ambiguous/multi-mark, 0 for blank). Do not use decimal 0.0-1.0.
    ${fewShotSection}
    Output exactly as a JSON array of objects with the following schema:
    [
      {
        "id": number,
        "detected": string | null,
        "confidence": number
      }
    ]
    
    Return ONLY a valid JSON array without any markdown formatting wrappers.
  `;

  // ─── Dual-Agent Execution ──────────────────────────────────────
  type GradeData = Array<{ id: number; detected: string | null; confidence: number }>;

  const { agentA, agentB, singleAgentFallback } = await runDualAgents<GradeData>({
    apiKey,
    prompt,
    imageBase64,
    mimeType: mimeType || "image/jpeg",
    responseMimeType: "application/json",
  });

  // Normalize: the agents may return the array directly or wrapped in an object
  const agentAResults: GradeData = Array.isArray(agentA.data)
    ? agentA.data
    : (agentA.data as any)?.results || [];
  const agentBResults: GradeData = Array.isArray(agentB.data)
    ? agentB.data
    : (agentB.data as any)?.results || [];

  // Run consensus comparison
  const { consensus, summary } = singleAgentFallback
    ? {
        consensus: (agentA.success ? agentAResults : agentBResults).map((r: any) => ({
          questionId: r.id,
          agentAAnswer: agentA.success ? (r.detected ? String(r.detected).trim().toUpperCase() : null) : null,
          agentAConfidence: agentA.success ? r.confidence : 0,
          agentBAnswer: agentB.success ? (r.detected ? String(r.detected).trim().toUpperCase() : null) : null,
          agentBConfidence: agentB.success ? r.confidence : 0,
          consensusStatus: 'agreed' as const,
          recommendedAnswer: r.detected ? String(r.detected).trim().toUpperCase() : null,
          avgConfidence: r.confidence,
        })),
        summary: {
          totalQuestions: (agentA.success ? agentAResults : agentBResults).length,
          agreedCount: (agentA.success ? agentAResults : agentBResults).length,
          disagreedCount: 0,
          partialCount: 0,
          agreementRate: 100,
          autoApprovable: true,
        },
      }
    : compareGradingResults(agentAResults, agentBResults);

  // Build final graded results using consensus recommendations
  const finalResults = consensus.map((c: any) => {
    const qId = c.questionId;
    const correct = masterKey[qId] || masterKey[String(qId)] || "A";
    const detectedStr = c.recommendedAnswer;
    const correctStr = String(correct).trim().toUpperCase();
    const confidence = c.avgConfidence;

    let status: 'correct' | 'incorrect' | 'ambiguous' = 'incorrect';
    const isMultiMark = detectedStr && detectedStr.includes(',');
    const isBlank = detectedStr === null || detectedStr === '';

    if (isBlank || isMultiMark || confidence < threshold) {
      status = 'ambiguous';
    } else if (detectedStr === correctStr) {
      status = 'correct';
    }

    return {
      id: qId,
      detected: c.recommendedAnswer,
      correct: correct,
      status: status,
      confidence: confidence,
      consensusStatus: c.consensusStatus,
      agentADetected: c.agentAAnswer,
      agentBDetected: c.agentBAnswer,
    };
  });

  const modelsUsed = [
    agentA.success ? agentA.model : null,
    agentB.success ? agentB.model : null,
  ].filter(Boolean).join(' + ');

  console.log(`Job ${job.id} completed via dual-agent: ${modelsUsed} | Agreement: ${summary.agreementRate}%`);
  
  return {
    results: finalResults,
    modelUsed: modelsUsed,
    dualAgent: true,
    singleAgentFallback,
    agentA: {
      model: agentA.model,
      label: agentA.label,
      success: agentA.success,
      error: agentA.error,
      durationMs: agentA.durationMs,
    },
    agentB: {
      model: agentB.model,
      label: agentB.label,
      success: agentB.success,
      error: agentB.error,
      durationMs: agentB.durationMs,
    },
    consensus,
    summary,
  };

}, { connection: redisConnection });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
}

startWorker().catch(console.error);
