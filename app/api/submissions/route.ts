import { NextRequest, NextResponse } from "next/server";
import { initSchema, createStudentSubmission, getStudentSubmissions } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const { studentId, studentName, assignmentTitle, imageBase64, mimeType = "image/jpeg", fileName = "answer_sheet.jpg" } = body;

    if (!studentId || !studentName || !imageBase64) {
      return NextResponse.json(
        { error: "Student ID, Student Name, and Answer Sheet image are required." },
        { status: 400 }
      );
    }

    const submission = await createStudentSubmission({
      studentId,
      studentName,
      assignmentTitle,
      fileName,
      mimeType,
      imageBase64,
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        studentId: submission.student_id,
        studentName: submission.student_name,
        assignmentTitle: submission.assignment_title,
        fileName: submission.file_name,
        status: submission.status,
        createdAt: submission.created_at,
      },
    });
  } catch (error) {
    console.error("Error creating student submission:", error);
    const message = error instanceof Error ? error.message : "Failed to create submission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const studentIdParam = searchParams.get("studentId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const session = getSessionFromRequest(req);

    // If logged in as student, restrict to their own studentId
    let targetStudentId = studentIdParam || undefined;
    if (session && session.role === "student") {
      targetStudentId = session.username || targetStudentId;
    }

    const records = await getStudentSubmissions({
      status: status !== "all" ? status : undefined,
      studentId: targetStudentId,
      limit,
    });

    const submissions = records.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      assignmentTitle: r.assignment_title,
      fileName: r.file_name,
      mimeType: r.mime_type,
      imageBase64: r.image_base64,
      status: r.status,
      batchId: r.batch_id,
      score: r.score !== null && r.score !== undefined ? Number(r.score) : null,
      results: r.results,
      createdAt: r.created_at,
      gradedAt: r.graded_at,
    }));

    return NextResponse.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching student submissions:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch submissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
