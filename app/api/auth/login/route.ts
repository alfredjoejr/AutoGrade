import { initSchema, verifyUserCredentials, UserRole } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, quickRole } = body;

    // Ensure database schema and default accounts exist
    await initSchema();

    // Support quick role-switch for demo/evaluation if requested
    if (quickRole && ['teacher', 'student', 'admin'].includes(quickRole)) {
      const defaultUsers: Record<UserRole, { id: number; username: string; displayName: string }> = {
        teacher: { id: 2, username: 'teacher', displayName: 'Teacher Sarah' },
        student: { id: 3, username: 'student', displayName: 'Student Alex' },
        admin: { id: 1, username: 'admin', displayName: 'Administrator' },
      };

      const selected = defaultUsers[quickRole as UserRole];
      const token = createSessionToken(selected.id, selected.username, selected.displayName, quickRole as UserRole);

      const response = NextResponse.json({
        success: true,
        user: { ...selected, role: quickRole },
      });

      response.cookies.set(SESSION_COOKIE.name, token, SESSION_COOKIE.options);
      return response;
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await verifyUserCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id, user.username, user.displayName, user.role);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE.name, token, SESSION_COOKIE.options);
    return response;
  } catch (error) {
    console.error("Auth login error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
