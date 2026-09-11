import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from './db';

const COOKIE_NAME = 'auth_session';
const LEGACY_COOKIE_NAME = 'admin_session';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET || 'autograde-default-secret-key-2026';
  return secret;
}

export type SessionPayload = {
  userId: number;
  username: string;
  displayName: string;
  role: UserRole;
  exp: number; // expiry timestamp in ms
};

/** Create a signed session token */
export function createSessionToken(
  userId: number,
  username: string,
  displayName: string,
  role: UserRole = 'teacher'
): string {
  const payload: SessionPayload = {
    userId,
    username,
    displayName,
    role,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/** Verify a signed session token — returns decoded payload or null */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', getSecret())
      .update(payloadB64)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    // Decode payload
    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    // Default role if legacy token
    if (!payload.role) {
      payload.role = payload.username === 'admin' ? 'admin' : 'teacher';
    }

    // Check expiry
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Extract session from incoming request cookies (checks auth_session and legacy admin_session) */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get(LEGACY_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Check if current session has one of the allowed roles */
export function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): { session: SessionPayload; response?: undefined } | { session?: undefined; response: NextResponse } {
  const session = getSessionFromRequest(req);

  if (!session) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized. Please sign in with appropriate credentials." },
        { status: 401 }
      ),
    };
  }

  // Admins always have access to teacher functions
  const effectiveRoles = [...allowedRoles];
  if (allowedRoles.includes('teacher') && !effectiveRoles.includes('admin')) {
    effectiveRoles.push('admin');
  }

  if (!effectiveRoles.includes(session.role)) {
    return {
      response: NextResponse.json(
        { error: `Forbidden. Role '${session.role}' is not authorized for this action.` },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/** Cookie name and options for setting/clearing */
export const SESSION_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TOKEN_EXPIRY_MS / 1000, // seconds
  },
};

