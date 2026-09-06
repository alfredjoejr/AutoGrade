import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// We use the Gemini API key provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, masterKey, totalQuestions, threshold } = body;

    if (!imageBase64 || !masterKey) {
      return NextResponse.json({ error: "Missing image or master key" }, { status: 400 });
    }

    const prompt = `
      You are an expert OCR and grading assistant.
      I am providing an image of a multiple choice answer sheet.
      There are ${totalQuestions} questions in total.
      The master key is: ${JSON.stringify(masterKey)}
      
      For each question from 1 to ${totalQuestions}, identify the bubbled or marked answer.
      If multiple are marked, if it's scribbled out, or if you are unsure, flag it by returning a low confidence score or returning multiple detected letters (e.g., 'A,B').
      If blank, return null for detected.
      
      Output exactly as a JSON array of objects with the following schema:
      [
        {
          "id": number (the question number),
          "detected": string | null (the detected answer 'A', 'B', 'C', 'D', or null if blank, or 'A,B' if multiple),
          "confidence": number (0 to 100, your confidence in reading the mark)
        }
      ]
      
      Return ONLY a valid JSON array without any markdown formatting wrappers.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        prompt,
        { inlineData: { data: imageBase64, mimeType: mimeType } }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const text = response.text || "[]";
    const aiResults = JSON.parse(text);

    // Process results against master key and threshold
    const finalResults = aiResults.map((result: any) => {
      const correct = masterKey[result.id] || "A";
      let status = 'incorrect';
      
      if (result.confidence < threshold || result.detected?.includes(',') || result.detected === null) {
        status = 'ambiguous';
      } else if (result.detected === correct) {
        status = 'correct';
      }

      return {
        id: result.id,
        detected: result.detected,
        correct: correct,
        status: status,
        confidence: result.confidence
      };
    });

    return NextResponse.json({ results: finalResults });
  } catch (error) {
    console.error("Error grading image:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
