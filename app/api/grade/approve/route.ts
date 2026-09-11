import { NextRequest, NextResponse } from "next/server";
import { initSchema, saveBatchResults, updateStudentSubmissionGrading } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * POST /api/grade/approve
 * Teacher approves final grading results after reviewing dual-agent consensus.
 * Only this endpoint persists results to the database.
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['teacher', 'admin']);
  if (auth.response) return auth.response;

  try {
    await initSchema();
    const body = await req.json();
    const {
      batchId,
      totalQuestions,
      masterKey,
      threshold,
      students,
      submissionUpdates,
    } = body;

    if (!batchId || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "batchId and students array are required" },
        { status: 400 }
      );
    }

    // Save batch results to PostgreSQL
    await saveBatchResults({
      id: batchId,
      totalQuestions: totalQuestions || 25,
      masterKey: masterKey || {},
      threshold: threshold || 85,
      students: students.map((s: any) => ({
        studentId: s.studentId,
        fileName: s.fileName,
        score: s.score,
        status: 'reviewed',
        results: s.results,
        gradedAt: s.gradedAt || new Date().toISOString(),
      })),
    });

    // Also sync individual submission records if provided
    if (submissionUpdates && Array.isArray(submissionUpdates)) {
      for (const update of submissionUpdates) {
        if (update.submissionId) {
          await updateStudentSubmissionGrading(
            update.submissionId,
            batchId,
            update.score,
            update.results
          );
        }
      }
    }

    console.log(`[GradeApprove] Teacher approved batch ${batchId} with ${students.length} students`);

    return NextResponse.json({
      success: true,
      message: `Batch approved and saved: ${students.length} student(s)`,
      batchId,
    });
  } catch (error: any) {
    console.error("Error approving grading results:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to approve grading results" },
      { status: 500 }
    );
  }
}
