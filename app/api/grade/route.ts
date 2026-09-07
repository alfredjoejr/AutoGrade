import { NextRequest, NextResponse } from "next/server";
import { initSchema, getRecentCorrections } from "@/lib/db";
import { generateVisionContentWithFallback } from "@/lib/vision-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, masterKey, totalQuestions = 25, threshold = 75 } = body;

    if (!imageBase64 || !masterKey) {
      return NextResponse.json({ error: "Missing image or master key" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    await initSchema();

    // Query recent educator moderation corrections for Tier 1 In-Context Learning
    const recentCorrections = await getRecentCorrections('student_moderation', 6);
    const fewShotSection = recentCorrections.length > 0
      ? `\n6. DYNAMIC FEW-SHOT CORRECTIONS (Verified ground truth from previous teacher moderation):\n` +
        recentCorrections.map(c => `   - Question ${c.questionId}: Verified student mark is "${c.teacherCorrected}". Previous AI detected: "${c.aiDetected || 'none'}".`).join('\n') + '\n'
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

    const { text: rawText, modelUsed } = await generateVisionContentWithFallback({
      apiKey,
      prompt,
      imageBase64,
      mimeType: mimeType || "image/jpeg",
      temperature: 0.1,
      responseMimeType: "application/json",
    });

    const cleanedText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const aiResults = JSON.parse(cleanedText || "[]");

    // Process results against master key and threshold
    const finalResults = aiResults.map((result: any) => {
      const qId = typeof result.id === "number" ? result.id : parseInt(String(result.id).replace(/\D/g, ""), 10);
      const correct = masterKey[qId] || masterKey[String(qId)] || "A";
      
      // Normalize confidence to 0-100 percentage:
      // If the model returned 0.0 - 1.0 (e.g., 1 or 0.95), convert to 0 - 100 percentage
      const rawConf = typeof result.confidence === "number" ? result.confidence : parseFloat(result.confidence) || 0;
      const confidence = rawConf <= 1 && rawConf > 0 ? Math.round(rawConf * 100) : Math.round(rawConf);

      const detectedStr = result.detected ? String(result.detected).trim().toUpperCase() : null;
      const correctStr = String(correct).trim().toUpperCase();

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
        detected: result.detected,
        correct: correct,
        status: status,
        confidence: confidence
      };
    });

    return NextResponse.json({ results: finalResults, modelUsed });
  } catch (error) {
    console.error("Error grading image:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
