import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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

    const ai = new GoogleGenAI({ apiKey });

    const maxLetters = String.fromCharCode(64 + Math.min(optionsPerQuestion, 8)); // e.g. 'D' for 4, 'E' for 5
    const prompt = `
      You are an expert OCR assistant specialized in multiple-choice master answer key extraction.
      I am providing an image/scan of a master answer key sheet marked by an educator.
      Expected question count: ${totalQuestions}.
      Allowed answer choices: Options A through ${maxLetters} (${optionsPerQuestion} choices per question).

      Instructions:
      1. Examine the image carefully and identify each question number from 1 to ${totalQuestions}.
      2. For each question, extract the marked answer (bubbled in, circled, ticked, or highlighted).
      3. If a question mark is ambiguous or blank, mark answer as null and assign low confidence.
      4. Assign a confidence score between 0 and 100 for each detected question mark.

      Return ONLY a valid JSON object strictly matching this schema:
      {
        "detectedTotalQuestions": number,
        "answers": [
          {
            "id": number,
            "answer": string | null,
            "confidence": number
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const rawText = response.text || "{}";
    // Clean any potential markdown wrapping if present
    const cleanedText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const result = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      detectedTotalQuestions: result.detectedTotalQuestions || totalQuestions,
      answers: result.answers || []
    });

  } catch (error: any) {
    console.error("Error extracting master answer key:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to extract master answer key from image" },
      { status: 500 }
    );
  }
}
