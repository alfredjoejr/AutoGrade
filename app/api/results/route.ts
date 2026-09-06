import { initSchema, saveBatchResults, getBatchSessions } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, totalQuestions, masterKey, threshold, students } = body;

    if (!id || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "Missing batch id or students array" },
        { status: 400 }
      );
    }

    // Ensure schema exists
    await initSchema();

    // Save the batch
    await saveBatchResults({
      id,
      totalQuestions,
      masterKey,
      threshold,
      students: students.map((s: any) => ({
        studentId: s.studentId,
        fileName: s.fileName,
        score: s.score,
        status: s.status,
        results: s.results,
        gradedAt: s.gradedAt,
      })),
    });

    return NextResponse.json({ success: true, batchId: id });
  } catch (error) {
    console.error("Error saving batch results:", error);
    return NextResponse.json(
      { error: "Failed to save batch results" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await initSchema();
    const sessions = await getBatchSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching batch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch sessions" },
      { status: 500 }
    );
  }
}
