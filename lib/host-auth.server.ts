import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "circle_social_host";
const ISSUER = "circle-social";
const AUDIENCE = "circle-social-host";
const DURATION = 60 * 60 * 12;

function config() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return email && password && secret && secret.length >= 32 ? { email, password, secret } : null;
}

export function hostAuthConfigured() { return config() !== null; }

function equal(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export function hostCredentialsValid(email: string, password: string) {
  const settings = config();
  if (!settings) return false;
  const emailMatches = equal(email.trim().toLowerCase(), settings.email);
  const passwordMatches = equal(password, settings.password);
  return emailMatches && passwordMatches;
}

function signingKey(settings: NonNullable<ReturnType<typeof config>>) {
  // Changing the host credentials also signs out every existing host session.
  return createHmac("sha256", settings.secret).update(`${settings.email}\0${settings.password}`).digest();
}

export async function createHostSession() {
  const settings = config();
  if (!settings) throw new Error("Host login is not configured");
  const token = await new SignJWT({ role: "host" }).setProtectedHeader({ alg: "HS256" })
    .setSubject(settings.email).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setIssuedAt().setExpirationTime(`${DURATION}s`).sign(signingKey(settings));
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: DURATION, priority: "high",
  });
}

export async function isHostAuthenticated() {
  const settings = config();
  if (!settings) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 4096) return false;
  try {
    const { payload } = await jwtVerify(token, signingKey(settings), {
      algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE,
    });
    return payload.role === "host" && payload.sub === settings.email;
  } catch { return false; }
}

export async function requireHost() {
  if (!await isHostAuthenticated()) redirect("/login");
}

export async function deleteHostSession() { (await cookies()).delete(COOKIE); }
