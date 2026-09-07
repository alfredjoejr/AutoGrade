import { GoogleGenAI } from "@google/genai";

/**
 * Ordered fallback model chain for Gemini Vision tasks.
 * If the primary model experiences high demand (503) or rate limits (429),
 * requests automatically and transparently failover to subsequent models.
 */
export const VISION_MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;

export type VisionModelName = (typeof VISION_MODEL_CHAIN)[number];

export interface VisionGenerateOptions {
  apiKey: string;
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  temperature?: number;
  responseMimeType?: string;
}

export interface VisionGenerateResult {
  text: string;
  modelUsed: VisionModelName;
}

/**
 * Executes a vision OCR request with automatic multi-model failover.
 * Catches 503 (High demand / UNAVAILABLE), 429 (Rate limit / Quota), and network timeouts,
 * cascading seamlessly to the next model in the chain without failing the user's request.
 */
export async function generateVisionContentWithFallback(
  options: VisionGenerateOptions
): Promise<VisionGenerateResult> {
  const {
    apiKey,
    prompt,
    imageBase64,
    mimeType = "image/jpeg",
    temperature = 0.1,
    responseMimeType = "application/json",
  } = options;

  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey });
  const failureHistory: Array<{ model: string; error: string; code?: number }> = [];

  for (let i = 0; i < VISION_MODEL_CHAIN.length; i++) {
    const currentModel = VISION_MODEL_CHAIN[i];
    try {
      console.log(
        `[VisionAI] Invoking OCR (Attempt ${i + 1}/${VISION_MODEL_CHAIN.length}) using model: ${currentModel}`
      );

      const response = await ai.models.generateContent({
        model: currentModel,
        contents: [
          prompt,
          { inlineData: { data: imageBase64, mimeType } }
        ],
        config: {
          responseMimeType,
          temperature,
        }
      });

      const text = response.text || "";
      if (i > 0) {
        console.log(
          `[VisionAI] Fallback SUCCESS: Request completed via secondary model: ${currentModel}`
        );
      } else {
        console.log(`[VisionAI] Request completed successfully with primary model: ${currentModel}`);
      }

      return { text, modelUsed: currentModel };
    } catch (err: any) {
      const statusCode =
        err?.status ||
        err?.code ||
        err?.error?.code ||
        (err?.message?.includes("503") ? 503 : undefined) ||
        (err?.message?.includes("429") ? 429 : undefined);

      const errorMsg = err?.message || String(err);
      failureHistory.push({ model: currentModel, error: errorMsg, code: statusCode });

      console.warn(
        `[VisionAI] Model "${currentModel}" failed (Status: ${statusCode || "unknown"}). Reason: ${errorMsg}`
      );

      // If there are more models in the chain, log fallback notice and delay slightly
      if (i < VISION_MODEL_CHAIN.length - 1) {
        const nextModel = VISION_MODEL_CHAIN[i + 1];
        console.warn(`[VisionAI] Failing over to next fallback model: "${nextModel}"...`);
        // Brief pause to prevent rapid-fire cascading
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  // If every model in the chain exhausted
  const breakdown = failureHistory
    .map((h) => `${h.model} [${h.code || "ERR"}]: ${h.error}`)
    .join(" | ");
  
  throw new Error(
    `All models in the vision fallback chain failed (${VISION_MODEL_CHAIN.join(" -> ")}). Details: ${breakdown}`
  );
}
