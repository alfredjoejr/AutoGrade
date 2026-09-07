import { NextRequest, NextResponse } from "next/server";
import { initSchema, getRecentCorrections, getCachedMasterKey, saveCachedMasterKey } from "@/lib/db";
import { generateVisionContentWithFallback } from "@/lib/vision-ai";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, totalQuestions = 25, optionsPerQuestion = 4 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing master answer sheet image" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured in environment variables (GEMINI_API_KEY)" },
        { status: 500 }
      );
    }

    await initSchema();

    const imageHash = crypto.createHash('sha256').update(imageBase64).digest('hex');
    const cachedData = await getCachedMasterKey(imageHash);

    if (cachedData) {
      return NextResponse.json({
        success: true,
        modelUsed: "cache",
        detectedTotalQuestions: cachedData.totalQuestions,
        answers: cachedData.answers,
      });
    }

    // Query recent educator corrections for Tier 1 In-Context Learning
    const recentCorrections = await getRecentCorrections('master_key', 6);
    const fewShotSection = recentCorrections.length > 0
      ? `\n5. DYNAMIC FEW-SHOT CORRECTIONS (Verified ground truth from previous teacher moderation):\n` +
        recentCorrections.map(c => `   - Question ${c.questionId}: Educator verified choice is "${c.teacherCorrected}". Previous AI detected: "${c.aiDetected || 'none'}".`).join('\n') + '\n'
      : '';

    const maxLetters = String.fromCharCode(64 + Math.min(optionsPerQuestion, 8)); // e.g. 'D' for 4, 'E' for 5
    const prompt = `
      You are an expert OCR and grading vision assistant specialized in extracting multiple-choice master answer keys from scanned sheets.
      Carefully examine the provided image of an MCQ master answer key sheet.

      Expected question count: ${totalQuestions} questions (Q1 to Q${totalQuestions}).
      Allowed answer choices: Options A through ${maxLetters} (${optionsPerQuestion} choices per question).

      CRITICAL EXTRACTION GUIDELINES:

      1. IDENTIFY BY PRINTED QUESTION NUMBERS (NOT BLIND ROW POSITION):
         - Match each question strictly by its printed number label: "1.", "2.", ... "${totalQuestions}.".
         - Columns: Sheets typically have multiple columns (e.g. Left column Q1-Q13, Right column Q14-Q25).
         - Printing anomalies / duplicate lines: If a printed number is repeated on two consecutive rows (e.g., "19." appears twice), consolidate them into that single question number (Q19). Do NOT let duplicate printed rows shift subsequent question numbers!
         - Ensure you locate and evaluate every question number from 1 to ${totalQuestions} individually:
           * Look at the exact row labeled with that number.
           * For Question 22: Look at row "22." — notice letter 'A' inside box A: [A] A -> choice A.
           * For Question 23: Look at row "23." — inspect box D carefully: notice the blue checkmark inside box D [✓] D -> choice D. Do not output null.
           * Check options A through ${maxLetters} for that question number.
         - Do not skip or return null for any question unless all of its checkboxes are completely blank with no marks at all.

      2. RECOGNIZE ALL MARKING CONVENTIONS:
         - Checkmarks: A blue, black, or pencil tick (✓) inside, through, or overlapping a checkbox indicates that option is chosen.
         - Letters inside checkboxes: A letter written or printed inside a box (e.g. [A]) indicates that option is chosen.
         - Bubbled / shaded / filled boxes or circles.
         - Circled letters or checked options.

      3. MULTIPLE MARKS / AMBIGUOUS ROWS:
         - If a question row has multiple marks (e.g., checkmarks in both A and C):
           * Determine if one is crossed out, scratched, or clearly secondary.
           * If both appear marked without cancellation, prioritize the primary/first marked option (e.g. A), but assign a lower confidence score (65-75%) so the educator is flagged to review it.

      4. CONFIDENCE SCORING:
         - Clear, unambiguous mark: confidence 95-100.
         - Multiple marks or ambiguous choice: confidence 60-75.
         - Truly blank / unmarked question: answer null, confidence 0.
      ${fewShotSection}
      Return ONLY a valid JSON object strictly matching this schema:
      {
        "detectedTotalQuestions": ${totalQuestions},
        "answers": [
          {
            "id": number,
            "answer": string | null,
            "confidence": number
          }
        ]
      }
    `;

    const { text: rawText, modelUsed } = await generateVisionContentWithFallback({
      apiKey,
      prompt,
      imageBase64,
      mimeType: mimeType || "image/jpeg",
      temperature: 0.1,
      responseMimeType: "application/json",
    });

    // Clean any potential markdown wrapping if present
    const cleanedText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const result = JSON.parse(cleanedText || "{}");

    const detectedTotalQuestions = result.detectedTotalQuestions || totalQuestions;
    const answers = result.answers || [];

    await saveCachedMasterKey(imageHash, detectedTotalQuestions, optionsPerQuestion, answers);

    return NextResponse.json({
      success: true,
      modelUsed,
      detectedTotalQuestions,
      answers
    });

  } catch (error: any) {
    console.error("Error extracting master answer key:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to extract master answer key from image" },
      { status: 500 }
    );
  }
}
