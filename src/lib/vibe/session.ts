// Lightweight cookie-based demo session (no real OTP — sandbox only).
// In production this would be NextAuth.js v4 with phone+PIN credentials
// and a Twilio/MessageBird OTP provider, httpOnly JWT cookies.
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "vibe_session";
// 30 days
const MAX_AGE = 60 * 60 * 24 * 30;

export async function getCurrentUser() {
  const store = await cookies();
  let sid = store.get(SESSION_COOKIE)?.value;

  // Mobile App Support: check Authorization header or x-vibe-session header
  if (!sid) {
    try {
      const { headers } = await import("next/headers");
      const hdrs = await headers();
      const auth = hdrs.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        sid = auth.substring(7);
      } else {
        sid = hdrs.get("x-vibe-session") || undefined;
      }
    } catch {
      /* ignore */
    }
  }

  if (!sid) return null;
  const user = await db.user.findUnique({
    where: { id: sid },
    include: { profile: true },
  });
  return user;
}

export async function setCurrentUser(userId: string) {
  const store = await cookies();
  // SameSite=None + Secure=true is required for the session cookie to be sent
  // when the app is embedded in a cross-site iframe (e.g. the chat.z.ai preview
  // panel). The gateway terminates TLS, so the browser sees HTTPS and accepts
  // the Secure cookie. This must be set on the login/register/logout responses.
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/// Simple "PIN hash" — NOT secure, demo only. Production: bcrypt/argon2.
export function hashPin(pin: string): string {
  // Reversible obfuscation is fine for the sandbox demo.
  return Buffer.from(`vibe::${pin}`).toString("base64");
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}
