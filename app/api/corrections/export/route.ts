import { NextRequest, NextResponse } from 'next/server';
import { initSchema, getTuningDatasetJSONL } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await initSchema();
    const jsonlData = await getTuningDatasetJSONL();

    const response = new NextResponse(jsonlData, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-jsonlines; charset=utf-8',
        'Content-Disposition': 'attachment; filename="autograde_tuning_dataset.jsonl"',
      },
    });

    return response;
  } catch (err: any) {
    console.error('Error exporting tuning dataset:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to export tuning dataset' },
      { status: 500 }
    );
  }
}
