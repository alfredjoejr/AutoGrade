import { initSchema, verifyAdminCredentials } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Ensure schema + default admin exist
    await initSchema();

    const user = await verifyAdminCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken(user.id, user.username, user.displayName);

    // Set cookie and respond
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, displayName: user.displayName },
    });

    response.cookies.set(SESSION_COOKIE.name, token, SESSION_COOKIE.options);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
