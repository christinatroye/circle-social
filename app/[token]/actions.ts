"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { database, withinLimit } from "@/lib/db.server";
import { DEVICE_COOKIE, deviceKey, guestForToken, hash, holdsLink, logEvent, othersInCircle, touch } from "@/lib/guests.server";
import { AFTER_STEPS } from "@/lib/arrival";

type Result = { ok: true } | { ok: false; reason: "gone" | "elsewhere" | "invalid" };

/** The guest behind a token, but only for the browser that holds that link. */
async function owned(token: string) {
  const found = await guestForToken(token);
  if (!found) return null;
  if (!found.guest.device_hash || !holdsLink(found.guest, await deviceKey())) return null;
  return found;
}

/** This browser's device key, set now if it has none yet. */
async function deviceCookie() {
  const jar = await cookies();
  let key = jar.get(DEVICE_COOKIE)?.value;
  if (!key || key.length > 64) {
    key = randomBytes(24).toString("base64url");
    jar.set(DEVICE_COOKIE, key, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  return key;
}

/** The first browser to open a link keeps it. */
export async function claimLink(token: string): Promise<Result> {
  const found = await guestForToken(token);
  if (!found) return { ok: false, reason: "gone" };
  const mine = hash(await deviceCookie());
  const sql = database();
  const [row] = await sql`
    UPDATE guests SET device_hash = coalesce(device_hash, ${mine}), first_opened_at = coalesce(first_opened_at, now()), last_seen_at = now()
    WHERE id = ${found.guest.id} AND (device_hash IS NULL OR device_hash = ${mine} OR ${mine} = ANY(other_devices))
    RETURNING id
  `;
  if (!row) return { ok: false, reason: "elsewhere" };
  if (!found.guest.device_hash) await logEvent(found.guest.id, "opened");
  return { ok: true };
}

/** The first time a guest reaches their introduction, so the host can see where someone stopped. */
export async function sawIntroduction(token: string) {
  const found = await owned(token);
  if (!found || found.guest.introduction_confirmed_at) return;
  const [seen] = await database()`SELECT 1 FROM guest_events WHERE guest_id = ${found.guest.id} AND kind = 'saw_introduction' LIMIT 1`;
  if (!seen) await logEvent(found.guest.id, "saw_introduction");
  await touch(found.guest.id);
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

/** After the evening: the guest would love to be considered for the next Circle, Beauty. Asking twice counts once. */
export async function wantNextCircle(token: string): Promise<Result> {
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  const [asked] = await database()`SELECT 1 FROM guest_events WHERE guest_id = ${found.guest.id} AND kind = 'wants_next' LIMIT 1`;
  if (!asked) await logEvent(found.guest.id, "wants_next");
  return { ok: true };
}

/** After the evening: the guest tapped Request early access (to host their own gatherings). Tapping twice counts once. */
export async function wantEarlyAccess(token: string): Promise<Result> {
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  const [asked] = await database()`SELECT 1 FROM guest_events WHERE guest_id = ${found.guest.id} AND kind = 'early_access' LIMIT 1`;
  if (!asked) await logEvent(found.guest.id, "early_access");
  return { ok: true };
}

/** After the evening: a step the guest reached on the after page. Each step counts once. */
export async function logAfterStep(token: string, step: string): Promise<Result> {
  if (!(AFTER_STEPS as readonly string[]).includes(step)) return { ok: false, reason: "invalid" };
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  const [seen] = await database()`SELECT 1 FROM guest_events WHERE guest_id = ${found.guest.id} AND kind = ${step} LIMIT 1`;
  if (!seen) await logEvent(found.guest.id, step);
  return { ok: true };
}

/** After the evening: a friend the guest recommends for a future Circle, as a name, email or LinkedIn. */
export async function recommendFriend(token: string, text: string): Promise<Result> {
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  const recommended = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!recommended) return { ok: false, reason: "invalid" };
  if (!await withinLimit(`recommend:${found.guest.id}`, 20, 60 * 60)) return { ok: false, reason: "invalid" };
  await database()`
    INSERT INTO recommendations (circle_id, from_guest, recommended) VALUES (${found.circle.id}, ${found.guest.id}, ${recommended})
  `;
  await logEvent(found.guest.id, "recommended");
  return { ok: true };
}

/** After the evening: one line about what stayed with the guest. */
export async function sendFeedback(token: string, text: string): Promise<Result> {
  const found = await owned(token);
  if (!found) return { ok: false, reason: "elsewhere" };
  const line = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!line) return { ok: false, reason: "invalid" };
  if (!await withinLimit(`feedback:${found.guest.id}`, 10, 60 * 60)) return { ok: false, reason: "invalid" };
  await database()`
    INSERT INTO feedback (circle_id, guest_id, line) VALUES (${found.circle.id}, ${found.guest.id}, ${line})
  `;
  await logEvent(found.guest.id, "feedback");
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
 * A second device opens the link when the guest types the email their invitation went to.
 * Nothing is emailed and the first device keeps working, so a forwarded link alone isn't enough.
 */
export async function addThisDevice(token: string, email: string): Promise<Result> {
  const found = await guestForToken(token);
  if (!found) return { ok: false, reason: "gone" };
  const typed = String(email ?? "").trim().toLowerCase();
  if (!typed || typed.length > 200) return { ok: false, reason: "invalid" };
  if (!await withinLimit(`device:${found.guest.id}`, 5, 60 * 60)) return { ok: false, reason: "invalid" };
  if (typed !== found.guest.email.trim().toLowerCase()) return { ok: false, reason: "invalid" };
  const mine = hash(await deviceCookie());
  await database()`
    UPDATE guests SET other_devices = array_append(other_devices, ${mine}), last_seen_at = now()
    WHERE id = ${found.guest.id} AND NOT (${mine} = ANY(other_devices))
  `;
  await logEvent(found.guest.id, "added_device");
  return { ok: true };
}
