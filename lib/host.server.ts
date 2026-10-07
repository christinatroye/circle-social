import "server-only";
import { database } from "./db.server";

export type HostGuest = {
  id: string; name: string; email: string; role: "guest" | "speaker"; introduction: string; token: string;
  status: "Not opened" | "Opened" | "Introduction confirmed" | "Quiet guest" | "Can't come";
  beenBefore: boolean; lastSeen: string | null;
  /** The guest confirmed an introduction that differs from Christina's draft. */
  edited: boolean;
};

export type HostCircle = {
  id: string; title: string; speaker: string; startsAt: string; revealAt: string;
  guests: HostGuest[];
  requests: { id: string; from: string; to: string; note: string; status: string; at: string }[];
  recommendations: { from: string; recommended: string; at: string }[];
  wantsNext: string[];
  feedback: { from: string; line: string; at: string }[];
  activity: { name: string; kind: string; at: string }[];
};

function statusOf(row: Record<string, unknown>): HostGuest["status"] {
  if (row.cancelled_at) return "Can't come";
  if (row.introduction_confirmed_at) return row.shared ? "Introduction confirmed" : "Quiet guest";
  return row.first_opened_at ? "Opened" : "Not opened";
}

/** Every Circle, newest first, with its guests, introduction requests and recent activity. */
export async function hostCircles(): Promise<HostCircle[]> {
  const sql = database();
  const circles = await sql`SELECT id, title, speaker, starts_at, reveal_at FROM circles ORDER BY starts_at DESC`;
  return Promise.all(circles.map(async circle => {
    const [guests, requests, recommendations, wantsNext, feedback, activity] = await Promise.all([
      sql`SELECT * FROM guests WHERE circle_id = ${circle.id} ORDER BY role DESC, name`,
      sql`
        SELECT r.id, f.name AS from_name, t.name AS to_name, r.note, r.status, r.created_at
        FROM intro_requests r JOIN guests f ON f.id = r.from_guest JOIN guests t ON t.id = r.to_guest
        WHERE r.circle_id = ${circle.id} ORDER BY r.created_at DESC
      `,
      sql`
        SELECT g.name AS from_name, r.recommended, r.created_at
        FROM recommendations r JOIN guests g ON g.id = r.from_guest
        WHERE r.circle_id = ${circle.id} ORDER BY r.created_at DESC
      `,
      sql`
        SELECT DISTINCT g.name FROM guest_events e JOIN guests g ON g.id = e.guest_id
        WHERE g.circle_id = ${circle.id} AND e.kind = 'wants_next' ORDER BY g.name
      `,
      // Kept apart so the host page still opens before the feedback table exists.
      sql`
        SELECT g.name AS from_name, f.line, f.created_at
        FROM feedback f JOIN guests g ON g.id = f.guest_id
        WHERE f.circle_id = ${circle.id} ORDER BY f.created_at DESC
      `.catch(() => []),
      sql`
        SELECT g.name, e.kind, e.at FROM guest_events e JOIN guests g ON g.id = e.guest_id
        WHERE g.circle_id = ${circle.id} ORDER BY e.at DESC LIMIT 40
      `,
    ]);
    return {
      id: String(circle.id), title: String(circle.title), speaker: String(circle.speaker),
      startsAt: new Date(circle.starts_at).toISOString(), revealAt: new Date(circle.reveal_at).toISOString(),
      guests: guests.map(row => ({
        id: String(row.id), name: String(row.name), email: String(row.email), role: row.role, introduction: String(row.introduction),
        token: String(row.token), status: statusOf(row), beenBefore: Boolean(row.been_before),
        lastSeen: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
        edited: Boolean(row.introduction_confirmed_at && row.introduction_draft != null && row.introduction !== row.introduction_draft),
      })),
      requests: requests.map(row => ({
        id: String(row.id), from: String(row.from_name), to: String(row.to_name), note: String(row.note),
        status: String(row.status), at: new Date(row.created_at).toISOString(),
      })),
      recommendations: recommendations.map(row => ({
        from: String(row.from_name), recommended: String(row.recommended), at: new Date(row.created_at).toISOString(),
      })),
      wantsNext: wantsNext.map(row => String(row.name)),
      feedback: feedback.map(row => ({ from: String(row.from_name), line: String(row.line), at: new Date(row.created_at).toISOString() })),
      activity: activity.map(row => ({ name: String(row.name), kind: String(row.kind), at: new Date(row.at).toISOString() })),
    };
  }));
}
