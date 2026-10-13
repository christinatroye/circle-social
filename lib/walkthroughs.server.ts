import "server-only";
import { database } from "@/lib/db.server";
import { SITE_URL } from "@/lib/email.server";
import { walkthroughCalendar } from "@/lib/walkthrough-calendar";
import type { Walkthrough } from "@/lib/walkthroughs";

export type WalkthroughRow = { code: string; kind: "booked" | "teammate" | "suggested"; name: string; email: string; startsAt: string | null; at: string };

/** The time this link last booked, or null. Choosing again adds a newer row, so the newest one counts. */
export async function bookedTime(code: string): Promise<string | null> {
  try {
    const [row] = await database()`
      SELECT starts_at FROM walkthrough_bookings WHERE code = ${code} AND kind = 'booked' ORDER BY created_at DESC LIMIT 1
    `;
    return row ? new Date(row.starts_at).toISOString() : null;
  } catch {
    // No table yet (or no database here): the page simply offers the times.
    return null;
  }
}

export async function saveWalkthrough(code: string, kind: WalkthroughRow["kind"], { name = "", email = "", startsAt = null }: { name?: string; email?: string; startsAt?: string | null }) {
  await database()`
    INSERT INTO walkthrough_bookings (code, kind, name, email, starts_at) VALUES (${code}, ${kind}, ${name}, ${email}, ${startsAt})
  `;
}

/** Everything the booking pages saved, newest first, for /host. Empty until the walkthrough_bookings table exists. */
export async function walkthroughRows(): Promise<WalkthroughRow[]> {
  const rows = await database()`
    SELECT code, kind, name, email, starts_at, created_at FROM walkthrough_bookings ORDER BY created_at DESC
  `.catch(() => []);
  return rows.map(row => ({
    code: String(row.code), kind: row.kind as WalkthroughRow["kind"], name: String(row.name), email: String(row.email),
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null, at: new Date(row.created_at).toISOString(),
  }));
}

const ukTime = (iso: string) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true,
}).format(new Date(iso)).replace(/\s?([ap]m)$/, "$1");

/**
 * Tells Christina (ADMIN_EMAIL) what happened on a booking page. A booking comes with a calendar invite, so it lands in her calendar.
 * Only Christina is emailed, never the guest. A failed email never undoes what was saved.
 */
export async function notifyHost(walkthrough: Walkthrough, kind: WalkthroughRow["kind"], { name = "", email = "", startsAt = "" }: { name?: string; email?: string; startsAt?: string }) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM, to = process.env.ADMIN_EMAIL?.trim();
  if (!key || !from || !to) return;
  const link = `${SITE_URL}/speedrun/${walkthrough.code}`;
  const message = {
    booked: { subject: `${walkthrough.guest} booked: ${ukTime(startsAt)} UK time`, text: `${walkthrough.guest} booked ${walkthrough.title}.\n\n${ukTime(startsAt)} UK time, 10 minutes.\n\nThe calendar invite is attached. The join link is ${link}` },
    teammate: { subject: `${walkthrough.guest} would like to bring ${name}`, text: `${walkthrough.guest} would like to bring ${name} (${email}) to ${walkthrough.title}.\n\nThey haven't been sent anything. Send their invitation yourself.` },
    suggested: { subject: `${walkthrough.guest} suggested another time`, text: `${walkthrough.guest} suggested ${ukTime(startsAt)} UK time for ${walkthrough.title}.\n\nNothing is booked yet. Reply to ${walkthrough.first} to confirm.` },
  }[kind];
  const organizer = from.match(/<([^>]+)>/)?.[1] ?? from;
  const attachments = kind === "booked"
    ? [{ filename: "invite.ics", content: Buffer.from(walkthroughCalendar(walkthrough, startsAt, link, { organizer, attendee: to })).toString("base64"), content_type: "text/calendar; method=REQUEST" }]
    : undefined;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: message.subject, text: `${message.text}\n\nCircle`, attachments }),
    });
    if (!response.ok) console.error(`Resend refused the walk-through email (${response.status})`);
  } catch (error) {
    console.error("Could not send the walk-through email", error);
  }
}
