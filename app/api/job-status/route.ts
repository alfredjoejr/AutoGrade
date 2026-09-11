import { NextRequest, NextResponse } from "next/server";
import { gradeQueue } from "@/lib/queue";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const job = await gradeQueue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();
    const progress = job.progress;
    
    let result = null;
    let error = null;

    if (state === 'completed') {
      result = job.returnvalue;
    } else if (state === 'failed') {
      error = job.failedReason;
    }

    return NextResponse.json({
      jobId,
      state,
      progress,
      result,
      error
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
