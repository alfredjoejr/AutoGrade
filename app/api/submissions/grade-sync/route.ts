import { NextRequest, NextResponse } from "next/server";
import { initSchema, updateStudentSubmissionGrading } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Only teacher or admin can sync grading results
  const auth = requireRole(req, ['teacher', 'admin']);
  if (auth.response) return auth.response;

  try {
    await initSchema();
    const body = await req.json();
    const { submissionId, batchId, score, results } = body;

    if (!submissionId || !batchId || score === undefined || !results) {
      return NextResponse.json(
        { error: "submissionId, batchId, score, and results are required" },
        { status: 400 }
      );
    }

    await updateStudentSubmissionGrading(submissionId, batchId, score, results);

    return NextResponse.json({ success: true, message: "Submission updated with grading results" });
  } catch (error) {
    console.error("Error updating submission grading:", error);
    const message = error instanceof Error ? error.message : "Failed to update submission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
