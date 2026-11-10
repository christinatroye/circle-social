import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { database } from "./db.server";

export const DEVICE_COOKIE = "circle_device";
const TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z2-9]{8}$/;
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** Links stop working two days after the Circle starts. */
const LINK_LIFETIME = "2 days";

export type Circle = {
  id: string; slug: string; title: string; speaker: string; speaker_line: string; question: string;
  starts_at: string; reveal_at: string; room_url: string | null;
};

export type Guest = {
  id: string; circle_id: string; role: "guest" | "speaker"; name: string; first_name: string; email: string;
  introduction: string; introduction_confirmed_at: string | null; shared: boolean; been_before: boolean;
  token: string; device_hash: string | null; other_devices: string[]; first_opened_at: string | null; last_seen_at: string | null;
  cancelled_at: string | null;
  /** Set when Christina moves a guest to the waitlist. Missing until db/003-waitlist.sql has run. */
  waitlisted_at?: string | null;
};

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** A readable, unguessable link token: the first name, then eight random characters. */
export function newToken(firstName: string) {
  const slug = firstName.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
  const bytes = randomBytes(8);
  const code = Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${slug.slice(0, 30)}-${code}`;
}

export async function guestForToken(token: string) {
  if (!TOKEN_PATTERN.test(token) || token.length > 60) return null;
  const sql = database();
  const [row] = await sql`
    SELECT g.*, row_to_json(c) AS circle FROM guests g JOIN circles c ON c.id = g.circle_id
    WHERE g.token = ${token} AND now() < c.starts_at + ${LINK_LIFETIME}::interval
  `;
  if (!row) return null;
  const { circle, ...guest } = row;
  return { guest: guest as Guest, circle: circle as Circle };
}

export async function deviceKey() {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}

/** Whether this browser may use the link: the first device to open it, or one the guest added with their email. */
export function holdsLink(guest: Guest, key: string | null) {
  if (!key) return false;
  const mine = hash(key);
  return mine === guest.device_hash || (guest.other_devices ?? []).includes(mine);
}

/** "mine" when this browser holds the link, "open" when nobody has claimed it yet, "elsewhere" otherwise. */
export function deviceState(guest: Guest, key: string | null) {
  if (!guest.device_hash) return "open" as const;
  return holdsLink(guest, key) ? "mine" as const : "elsewhere" as const;
}

export async function logEvent(guestId: string, kind: string) {
  await database()`INSERT INTO guest_events (guest_id, kind) VALUES (${guestId}, ${kind})`;
}

export async function touch(guestId: string) {
  await database()`
    UPDATE guests SET last_seen_at = now()
    WHERE id = ${guestId} AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 minute')
  `;
}

/** Everyone else still coming, for the ring. Only called once the reveal has passed. */
export async function othersInCircle(circleId: string, guestId: string) {
  const sql = database();
  const rows = await sql`
    SELECT id, role, name, first_name, been_before, shared,
      CASE WHEN shared THEN introduction ELSE '' END AS introduction,
      (last_seen_at > now() - interval '15 minutes') AS here
    FROM guests
    WHERE circle_id = ${circleId} AND id <> ${guestId} AND cancelled_at IS NULL AND (to_jsonb(guests) ->> 'waitlisted_at') IS NULL
    ORDER BY role DESC, created_at, name
  `;
  return rows.map(row => ({
    id: String(row.id), name: String(row.name), first: String(row.first_name), speaker: row.role === "speaker",
    beenBefore: Boolean(row.been_before), shared: Boolean(row.shared), introduction: String(row.introduction), here: Boolean(row.here),
  }));
}

export async function seatCount(circleId: string) {
  const [row] = await database()`SELECT count(*)::int AS n FROM guests WHERE circle_id = ${circleId} AND cancelled_at IS NULL AND (to_jsonb(guests) ->> 'waitlisted_at') IS NULL`;
  return Number(row.n);
}

/** Places in a Circle's room, counting the host and the speaker. */
export const CIRCLE_CAPACITY = 25;

/** A guest on the waitlist takes a free place, first come first served. False when the Circle is already full. */
export async function takeWaitlistSeat(guestId: string, circleId: string) {
  const [row] = await database()`
    UPDATE guests SET waitlisted_at = NULL
    WHERE id = ${guestId} AND waitlisted_at IS NOT NULL
      AND (SELECT count(*) FROM guests WHERE circle_id = ${circleId} AND cancelled_at IS NULL AND waitlisted_at IS NULL) < ${CIRCLE_CAPACITY}
    RETURNING id
  `;
  if (row) await logEvent(guestId, "waitlist_seat");
  return Boolean(row);
}

/** The wall's comments, newest first, from everyone still coming, with their hearts. Empty if the wall table isn't there yet; no hearts if that table isn't there yet. */
export async function wallFor(circleId: string, guestId: string) {
  const post = (row: Record<string, unknown>) => ({ id: String(row.id), guestId: String(row.guest_id), name: String(row.name), text: String(row.body), mine: String(row.guest_id) === guestId, at: new Date(String(row.created_at)).toISOString(), hearts: Number(row.hearts ?? 0), hearted: Boolean(row.hearted) });
  try {
    const rows = await database()`
      SELECT w.id, w.guest_id, g.name, w.body, w.created_at,
        (SELECT count(*) FROM wall_hearts h JOIN guests hg ON hg.id = h.guest_id WHERE h.post_id = w.id AND hg.cancelled_at IS NULL) AS hearts,
        EXISTS (SELECT 1 FROM wall_hearts h WHERE h.post_id = w.id AND h.guest_id = ${guestId}) AS hearted
      FROM wall_posts w JOIN guests g ON g.id = w.guest_id
      WHERE w.circle_id = ${circleId} AND g.cancelled_at IS NULL
      ORDER BY w.created_at DESC
      LIMIT 300
    `;
    return rows.map(post);
  } catch {
    try {
      const rows = await database()`
        SELECT w.id, w.guest_id, g.name, w.body, w.created_at FROM wall_posts w JOIN guests g ON g.id = w.guest_id
        WHERE w.circle_id = ${circleId} AND g.cancelled_at IS NULL
        ORDER BY w.created_at DESC
        LIMIT 300
      `;
      return rows.map(post);
    } catch {
      return [];
    }
  }
}
