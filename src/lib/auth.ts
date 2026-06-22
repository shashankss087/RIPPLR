import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

/**
 * Lightweight, dependency-free auth: scrypt password hashing and an
 * HMAC-signed session cookie. Real verification + tenant scoping happen
 * server-side (Node runtime); the edge middleware only does a coarse
 * cookie-presence gate.
 */

export const SESSION_COOKIE = "ripplr_session";
const SECRET = process.env.SESSION_SECRET || "ripplr-dev-secret-change-me";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---- password hashing ----
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---- session token (base64url(payload).hmac) ----
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(userId: string): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }));
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!uid || typeof exp !== "number" || exp < Date.now()) return null;
    return uid as string;
  } catch {
    return null;
  }
}

// ---- session helpers (server components / route handlers) ----
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  brandId: string | null;
  brandName: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const uid = verifyToken(token);
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid }, include: { brand: true } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
    brandName: user.brand?.name ?? null,
  };
}

/**
 * Tenant scope. Returns the brandId a request is limited to (null = see all,
 * for RIPPLR admins). Throws if there is no session at all.
 */
export async function getScope(): Promise<{ user: SessionUser; brandId: string | null }> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return { user, brandId: user.role === "BRAND" ? user.brandId : null };
}

export function setSessionCookie(userId: string) {
  cookies().set(SESSION_COOKIE, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
