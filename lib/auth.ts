import crypto from 'crypto';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'admin_session';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SECRET environment variable is not set');
  }
  return secret;
}

type SessionPayload = {
  userId: number;
  username: string;
  displayName: string;
  exp: number; // expiry timestamp in ms
};

/** Create a signed session token */
export function createSessionToken(
  userId: number,
  username: string,
  displayName: string
): string {
  const payload: SessionPayload = {
    userId,
    username,
    displayName,
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

    // Check expiry
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Extract session from incoming request cookies */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
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
