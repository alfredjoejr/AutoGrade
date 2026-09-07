import { getSessionFromRequest } from "@/lib/auth";
import { initSchema, getBatchById } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await initSchema();
    const { id } = await params;
    const data = await getBatchById(id);

    if (!data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching batch detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch details" },
      { status: 500 }
    );
  }
}
