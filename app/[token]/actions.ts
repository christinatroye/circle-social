"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { database, withinLimit } from "@/lib/db.server";
import { sendFreshLink } from "@/lib/email.server";
import { DEVICE_COOKIE, deviceKey, guestForToken, hash, logEvent, newToken, othersInCircle, touch } from "@/lib/guests.server";

type Result = { ok: true } | { ok: false; reason: "gone" | "elsewhere" | "invalid" };

/** The guest behind a token, but only for the browser that holds that link. */
async function owned(token: string) {
  const found = await guestForToken(token);
  if (!found) return null;
  const key = await deviceKey();
  if (!key || !found.guest.device_hash || hash(key) !== found.guest.device_hash) return null;
  return found;
}

/** The first browser to open a link keeps it. */
export async function claimLink(token: string): Promise<Result> {
  const found = await guestForToken(token);
  if (!found) return { ok: false, reason: "gone" };
  const jar = await cookies();
  let key = jar.get(DEVICE_COOKIE)?.value;
  if (!key || key.length > 64) {
    key = randomBytes(24).toString("base64url");
    jar.set(DEVICE_COOKIE, key, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  const sql = database();
  const [row] = await sql`
    UPDATE guests SET device_hash = ${hash(key)}, first_opened_at = coalesce(first_opened_at, now()), last_seen_at = now()
    WHERE id = ${found.guest.id} AND (device_hash IS NULL OR device_hash = ${hash(key)})
    RETURNING id
  `;
  if (!row) return { ok: false, reason: "elsewhere" };
  if (!found.guest.device_hash) await logEvent(found.guest.id, "opened");
  return { ok: true };
}

export async function saveIntroduction(token: string, input: { introduction: string; shared: boolean; beenBefore: boolean }): Promise<Result> {
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  const introduction = String(input.introduction ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
  if (!introduction) return { ok: false, reason: "invalid" };
  const { guest } = found;
  await database()`
    UPDATE guests SET introduction = ${introduction}, shared = ${Boolean(input.shared)}, been_before = ${Boolean(input.beenBefore)},
      introduction_confirmed_at = coalesce(introduction_confirmed_at, now()), last_seen_at = now()
    WHERE id = ${guest.id}
  `;
  await logEvent(guest.id, !guest.introduction_confirmed_at ? "introduction_confirmed" : "introduction_changed");
  if (guest.shared !== Boolean(input.shared)) await logEvent(guest.id, input.shared ? "sharing" : "quiet_guest");
  return { ok: true };
}

export async function setCancelled(token: string, cancelled: boolean): Promise<Result> {
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  await database()`UPDATE guests SET cancelled_at = ${cancelled ? new Date().toISOString() : null} WHERE id = ${found.guest.id}`;
  await logEvent(found.guest.id, cancelled ? "cancelled" : "uncancelled");
  return { ok: true };
}

export async function requestIntroduction(token: string, toGuest: string, note: string): Promise<Result> {
  const found = await owned(token);
  if (!found || new Date(found.circle.reveal_at) > new Date()) return { ok: false, reason: "elsewhere" };
  const sql = database();
  const [target] = await sql`SELECT id FROM guests WHERE id = ${toGuest}::uuid AND circle_id = ${found.circle.id} AND id <> ${found.guest.id}`;
  if (!target) return { ok: false, reason: "invalid" };
  await sql`
    INSERT INTO intro_requests (circle_id, from_guest, to_guest, note)
    VALUES (${found.circle.id}, ${found.guest.id}, ${toGuest}::uuid, ${String(note ?? "").trim().slice(0, 600)})
  `;
  await logEvent(found.guest.id, "intro_requested");
  return { ok: true };
}

/** On the night: who has the page open, so their seats light up. */
export async function whoIsHere(token: string): Promise<string[]> {
  const found = await owned(token);
  if (!found) return [];
  await touch(found.guest.id);
  const others = await othersInCircle(found.circle.id, found.guest.id);
  return others.filter(person => person.here).map(person => person.id);
}

/**
 * A new device asks for a fresh link. It is sent only if the email matches, and the
 * reply never says whether it did, so this page cannot be used to learn who is invited.
 */
export async function requestFreshLink(token: string, email: string): Promise<{ ok: true }> {
  const found = await guestForToken(token);
  const typed = String(email ?? "").trim().toLowerCase();
  if (!found || !typed || typed.length > 200) return { ok: true };
  if (!await withinLimit(`fresh:${found.guest.id}`, 3, 60 * 60)) return { ok: true };
  if (typed !== found.guest.email.trim().toLowerCase()) return { ok: true };
  const token2 = newToken(found.guest.first_name);
  await database()`UPDATE guests SET token = ${token2}, device_hash = NULL WHERE id = ${found.guest.id}`;
  await logEvent(found.guest.id, "link_resent");
  await sendFreshLink({ to: found.guest.email, firstName: found.guest.first_name, circleTitle: found.circle.title, token: token2 });
  return { ok: true };
}
