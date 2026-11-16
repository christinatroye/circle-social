import "server-only";
import { timingSafeEqual } from "node:crypto";
import { database } from "./db.server";
import { guestForToken } from "./guests.server";

/** The Enter Circle link carries the guest's own link, so the room knows who walked in from their page. */
export function roomUrlFor(roomUrl: string | null, token: string) {
  if (!roomUrl) return null;
  try {
    const url = new URL(roomUrl);
    url.searchParams.set("guest", token);
    return url.toString();
  } catch {
    return roomUrl;
  }
}

/** The room asks with a shared secret. Without one set on both sides, nobody gets an answer. */
export function roomMayAsk(header: string | null) {
  const secret = process.env.ROOM_GUESTS_SECRET ?? "";
  const given = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (secret.length < 24 || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

const plain = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pathOf(link: string) {
  try {
    return new URL(link, "https://room.entercircle.co").pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

type Answer = { name: string; introduction: string } | null;

/**
 * Who walked into the room that `links` open: the guest whose own link they came from, otherwise the one guest of that Circle
 * whose first name matches the name they typed. Two guests with the same first name, or no match, is no answer.
 * Only what the ring already shows: guests still coming, and an introduction only if they share it.
 */
export async function guestInRoom(links: string[], guestToken: string, typedName: string): Promise<Answer> {
  const paths = new Set(links.map(pathOf).filter(path => /^\/c\/g[A-Za-z0-9_-]{16}$/.test(path)));
  if (!paths.size) return null;
  const sql = database();
  const circles = await sql`
    SELECT id, room_url FROM circles
    WHERE room_url IS NOT NULL AND now() BETWEEN starts_at - interval '1 day' AND starts_at + interval '1 day'
  `;
  const circle = circles.find(row => paths.has(pathOf(String(row.room_url))));
  if (!circle) return null;

  const answer = (row: { name: unknown; introduction: unknown; shared: unknown }): Answer =>
    row.shared && String(row.introduction).trim() ? { name: String(row.name), introduction: String(row.introduction) } : null;

  if (guestToken) {
    const found = await guestForToken(guestToken);
    if (found && found.circle.id === circle.id && !found.guest.cancelled_at && !found.guest.waitlisted_at) return answer(found.guest);
  }

  const first = plain(typedName).split(" ")[0];
  if (!first) return null;
  const guests = await sql`
    SELECT name, first_name, introduction, shared FROM guests
    WHERE circle_id = ${circle.id} AND cancelled_at IS NULL AND (to_jsonb(guests) ->> 'waitlisted_at') IS NULL
  `;
  const matches = guests.filter(row => plain(String(row.first_name)) === first);
  return matches.length === 1 ? answer(matches[0] as { name: unknown; introduction: unknown; shared: unknown }) : null;
}
