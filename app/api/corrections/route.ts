import { NextRequest, NextResponse } from 'next/server';
import { initSchema, logTeacherCorrection, getTuningStats } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      batchId, 
      studentId, 
      questionId, 
      source = 'student_moderation', 
      aiDetected, 
      teacherCorrected, 
      confidence, 
      notes 
    } = body;

    if (!questionId || !teacherCorrected) {
      return NextResponse.json(
        { error: 'questionId and teacherCorrected are required' },
        { status: 400 }
      );
    }

    await initSchema();

    const id = await logTeacherCorrection({
      batchId,
      studentId,
      questionId: Number(questionId),
      source: source === 'master_key' ? 'master_key' : 'student_moderation',
      aiDetected: aiDetected ? String(aiDetected) : null,
      teacherCorrected: String(teacherCorrected).toUpperCase(),
      confidence: typeof confidence === 'number' ? confidence : null,
      notes: notes ? String(notes) : null,
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Error logging correction:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to log correction' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await initSchema();
    const stats = await getTuningStats();
    return NextResponse.json({ success: true, ...stats });
  } catch (err: any) {
    console.error('Error fetching tuning stats:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch tuning stats' },
      { status: 500 }
    );
  }
}
