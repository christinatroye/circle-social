"use server";

import { revalidatePath } from "next/cache";
import { database } from "@/lib/db.server";
import { logEvent, newToken } from "@/lib/guests.server";
import { requireHost } from "@/lib/host-auth.server";

/** A new link for a guest: the old one stops working, on every device, and the next device to open it keeps it. */
export async function giveNewLink(guestId: string) {
  await requireHost();
  const sql = database();
  const [guest] = await sql`SELECT first_name FROM guests WHERE id = ${guestId}::uuid`;
  if (!guest) return;
  await sql`UPDATE guests SET token = ${newToken(String(guest.first_name))}, device_hash = NULL, other_devices = '{}' WHERE id = ${guestId}::uuid`;
  await logEvent(guestId, "new_link");
  revalidatePath("/host");
}

export async function setRequestStatus(requestId: string, status: string) {
  await requireHost();
  if (!["new", "introduced", "not now"].includes(status)) return;
  await database()`UPDATE intro_requests SET status = ${status} WHERE id = ${requestId}::uuid`;
  revalidatePath("/host");
}

/** Christina's own edit becomes the guest's draft, so it doesn't count as the guest having edited it. */
export async function updateIntroduction(guestId: string, text: string) {
  await requireHost();
  const introduction = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
  await database()`UPDATE guests SET introduction = ${introduction}, introduction_draft = ${introduction} WHERE id = ${guestId}::uuid`;
  revalidatePath("/host");
}

/** Christina adds a guest by hand. Returns a short reason when it can't. */
export async function addGuest(circleId: string, input: { name: string; email: string; introduction: string; beenBefore: boolean }): Promise<{ error?: string }> {
  await requireHost();
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 200);
  const introduction = String(input.introduction ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
  if (!name) return { error: "Add a name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Add a valid email." };
  const first = name.split(" ").find(word => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(word)) ?? name;
  const sql = database();
  const [row] = await sql`
    INSERT INTO guests (circle_id, role, name, first_name, email, introduction, introduction_draft, been_before, token)
    VALUES (${circleId}::uuid, 'guest', ${name}, ${first}, ${email}, ${introduction}, ${introduction}, ${Boolean(input.beenBefore)}, ${newToken(first)})
    ON CONFLICT (circle_id, email) DO NOTHING
    RETURNING id
  `;
  if (!row) return { error: "That email is already on this Circle." };
  revalidatePath("/host");
  return {};
}

/** Removes a guest, their activity and any introduction requests to or from them. Their link stops working. */
export async function removeGuest(guestId: string) {
  await requireHost();
  await database()`DELETE FROM guests WHERE id = ${guestId}::uuid`;
  revalidatePath("/host");
}
