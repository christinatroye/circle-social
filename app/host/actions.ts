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
