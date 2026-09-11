import { NextRequest, NextResponse } from "next/server";
import { gradeQueue } from "@/lib/queue";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (session && session.role === 'student') {
      return NextResponse.json(
        { error: "Forbidden: Only educators and teachers are authorized to run grading jobs." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType, masterKey, totalQuestions = 25, threshold = 75, batchTotal } = body;

    // Hard limit: Max 10 documents per batch run
    if (batchTotal && batchTotal > 10) {
      return NextResponse.json(
        { error: "Batch limit exceeded: A maximum of 10 documents can be processed per batch." },
        { status: 400 }
      );
    }

    if (!imageBase64 || !masterKey) {
      return NextResponse.json({ error: "Missing image or master key" }, { status: 400 });
    }

    // Add job to the BullMQ queue
    const job = await gradeQueue.add('grade-student-sheet', {
      imageBase64,
      mimeType,
      masterKey,
      totalQuestions,
      threshold
    });

    return NextResponse.json({ 
      success: true, 
      jobId: job.id,
      message: "Job enqueued successfully" 
    });
  } catch (error) {
    console.error("Error enqueueing grade job:", error);
    return NextResponse.json({ error: "Failed to enqueue job" }, { status: 500 });
  }
}
