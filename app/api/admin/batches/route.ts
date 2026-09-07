import { getSessionFromRequest } from "@/lib/auth";
import { initSchema, getBatchSessions, getAdminStats } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await initSchema();
    const [sessions, stats] = await Promise.all([
      getBatchSessions(50),
      getAdminStats(),
    ]);

    return NextResponse.json({ sessions, stats });
  } catch (error) {
    console.error("Error fetching admin batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch data" },
      { status: 500 }
    );
  }
}
