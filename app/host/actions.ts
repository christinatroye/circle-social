"use server";

import { revalidatePath } from "next/cache";
import { database } from "@/lib/db.server";
import { logEvent, newToken } from "@/lib/guests.server";
import { requireHost } from "@/lib/host-auth.server";

/** A new link for a guest: the old one stops working and the next device to open it keeps it. */
export async function giveNewLink(guestId: string) {
  await requireHost();
  const sql = database();
  const [guest] = await sql`SELECT first_name FROM guests WHERE id = ${guestId}::uuid`;
  if (!guest) return;
  await sql`UPDATE guests SET token = ${newToken(String(guest.first_name))}, device_hash = NULL WHERE id = ${guestId}::uuid`;
  await logEvent(guestId, "new_link");
  revalidatePath("/host");
}

export async function setRequestStatus(requestId: string, status: string) {
  await requireHost();
  if (!["new", "introduced", "not now"].includes(status)) return;
  await database()`UPDATE intro_requests SET status = ${status} WHERE id = ${requestId}::uuid`;
  revalidatePath("/host");
}
