import { NextRequest, NextResponse } from "next/server";
import { initSchema, saveCachedMasterKey } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * POST /api/extract-key/approve
 * Teacher approves the final master key after reviewing dual-agent consensus.
 * Only this endpoint saves to the master_key_cache.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (session && session.role === 'student') {
      return NextResponse.json(
        { error: "Forbidden: Only educators can approve master keys." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { imageHash, totalQuestions, optionsPerQuestion = 4, answers } = body;

    if (!imageHash || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "imageHash and answers array are required" },
        { status: 400 }
      );
    }

    await initSchema();

    // Save the teacher-approved master key to cache
    await saveCachedMasterKey(imageHash, totalQuestions || answers.length, optionsPerQuestion, answers);

    console.log(`[MasterKey] Teacher approved and cached master key (${answers.length} questions, hash=${imageHash.slice(0, 12)}...)`);

    return NextResponse.json({
      success: true,
      message: "Master key approved and cached successfully",
      totalQuestions: totalQuestions || answers.length,
    });
  } catch (error: any) {
    console.error("Error approving master key:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to approve master key" },
      { status: 500 }
    );
  }
}
