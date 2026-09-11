import { SESSION_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(SESSION_COOKIE.name);
  response.cookies.delete('admin_session');
  return response;
}
